import { createHash, randomUUID } from 'node:crypto';
import { access, mkdir, rename, rm } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { ApiClient, ExportDouError } from '../api.js';
import { progress, terminalStatus, writeJson, writeLine } from '../output.js';
import type {
  CreateExportResponse,
  Credits,
  ExportDetail,
  ResumeExportResponse,
  ResultPreview,
  VideoPreview,
} from '../types.js';

const MAX_RESULT_LIMIT = 200_000;

type CreateOptions = {
  all: boolean;
  format: 'csv' | 'xlsx';
  includeReplies: boolean;
  json: boolean;
  limit: number | null;
  output: string | null;
  pollIntervalSeconds: number;
  timeoutSeconds: number;
  wait: boolean;
};

function idempotencyKey(): string {
  return randomUUID();
}

function statusReceipt(detail: ExportDetail): Record<string, unknown> {
  return {
    ...detail,
    resume: detail.status === 'partial'
      ? `exportdou resume ${detail.id} --json`
      : null,
    next: terminalStatus(detail.status)
      ? detail.result
        ? `exportdou download ${detail.id}`
        : null
      : `exportdou status ${detail.id} --json`,
  };
}

function printStatus(detail: ExportDetail, json: boolean): void {
  if (json) {
    writeJson(statusReceipt(detail));
    return;
  }
  writeLine(`任务：${detail.id}`);
  writeLine(`状态：${detail.status}`);
  writeLine(
    `进度：${detail.progress.deliveredRows.toLocaleString('zh-CN')}`
      + ` / ${detail.progress.targetRows.toLocaleString('zh-CN')} 条`
      + `（${detail.progress.percentage}%）`,
  );
  writeLine(
    `一级评论 ${detail.progress.rootRows.toLocaleString('zh-CN')}，`
      + `回复 ${detail.progress.replyRows.toLocaleString('zh-CN')}`,
  );
  if (detail.error) writeLine(`失败：${detail.error.message}`);
  if (detail.result) {
    writeLine(`结果：${detail.result.rowCount.toLocaleString('zh-CN')} 条 ${detail.result.format.toUpperCase()}`);
    writeLine(`下一步：exportdou download ${detail.id}`);
    if (detail.status === 'partial') {
      writeLine(`从断点继续：exportdou resume ${detail.id}`);
    }
  } else if (!terminalStatus(detail.status)) {
    writeLine(`下一步：exportdou status ${detail.id}`);
  }
}

async function resolveLimit(
  client: ApiClient,
  input: string,
  options: CreateOptions,
): Promise<number> {
  if (!options.all) {
    const limit = options.limit ?? 100;
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_RESULT_LIMIT) {
      throw new ExportDouError(
        `导出数量必须是 1 到 ${MAX_RESULT_LIMIT.toLocaleString('zh-CN')} 的整数`,
        'invalid_result_limit',
      );
    }
    return limit;
  }
  if (options.includeReplies) {
    throw new ExportDouError(
      '--all 只能表示全部一级评论，不能与 --replies 同时使用。需要回复时请用 --limit 明确总行数。',
      'conflicting_options',
    );
  }
  if (options.limit != null) {
    throw new ExportDouError('不能同时使用 --all 和 --limit', 'conflicting_options');
  }
  progress('正在读取视频公开评论数量…');
  const [video, wallet] = await Promise.all([
    client.request<VideoPreview>('/videos/preview', {
      body: { input },
      method: 'POST',
    }),
    client.request<Credits>('/credits'),
  ]);
  const count = video.reportedCommentCount;
  if (!count || count < 1) {
    throw new ExportDouError(
      '这个视频没有可用的公开评论数量，请改用 --limit 指定数量',
      'comment_count_unavailable',
    );
  }
  if (count > MAX_RESULT_LIMIT) {
    throw new ExportDouError(
      `视频公开评论数约为 ${count.toLocaleString('zh-CN')}，超过单任务 ${MAX_RESULT_LIMIT.toLocaleString('zh-CN')} 条上限。请使用 --limit 明确选择数量。`,
      'result_limit_exceeded',
    );
  }
  if (wallet.availableBalance < count) {
    throw new ExportDouError(
      `导出全部约需 ${count.toLocaleString('zh-CN')} 积分，当前可用 ${wallet.availableBalance.toLocaleString('zh-CN')} 积分`,
      'insufficient_credits',
      402,
    );
  }
  return count;
}

export async function inspect(input: string, json: boolean): Promise<void> {
  if (!input.trim()) {
    throw new ExportDouError('请提供抖音链接或分享文案', 'input_required');
  }
  const result = await new ApiClient().request<VideoPreview>('/videos/preview', {
    body: { input },
    method: 'POST',
  });
  if (json) {
    writeJson(result);
    return;
  }
  writeLine(result.title ?? '未命名抖音视频');
  writeLine(`作者：${result.authorName ?? '未知'}`);
  writeLine(`公开评论：${result.reportedCommentCount?.toLocaleString('zh-CN') ?? '未知'}`);
  writeLine(`地址：${result.canonicalUrl}`);
  if (result.comments.length > 0) {
    writeLine('');
    writeLine('评论样本：');
    for (const comment of result.comments.slice(0, 5)) {
      writeLine(`- ${comment.authorName ?? '匿名用户'}：${comment.text.replace(/\s+/gu, ' ').slice(0, 100)}`);
    }
  }
}

async function waitForExport(
  client: ApiClient,
  taskId: string,
  options: CreateOptions,
): Promise<ExportDetail> {
  const startedAt = Date.now();
  let delay = Math.max(2, options.pollIntervalSeconds);
  while (Date.now() - startedAt < options.timeoutSeconds * 1000) {
    await new Promise((resolve) => setTimeout(resolve, delay * 1000));
    const detail = await client.request<ExportDetail>(`/exports/${taskId}`);
    if (terminalStatus(detail.status)) return detail;
    progress(
      `等待中：${detail.progress.deliveredRows.toLocaleString('zh-CN')}`
        + ` / ${detail.progress.targetRows.toLocaleString('zh-CN')} 条`,
    );
    delay = Math.max(
      options.pollIntervalSeconds,
      Math.min(15, detail.retryAfterSeconds ?? Math.ceil(delay * 1.3)),
    );
  }
  return await client.request<ExportDetail>(`/exports/${taskId}`);
}

export async function createExport(
  input: string,
  options: CreateOptions,
): Promise<void> {
  if (!input.trim()) {
    throw new ExportDouError('请提供抖音链接或分享文案', 'input_required');
  }
  const client = new ApiClient();
  const resultLimit = await resolveLimit(client, input, options);
  const requestKey = idempotencyKey();
  progress(`正在提交 ${resultLimit.toLocaleString('zh-CN')} 条评论导出…`);

  let created: CreateExportResponse | ExportDetail;
  try {
    created = await client.request<CreateExportResponse>('/exports', {
      body: {
        format: options.format,
        includeReplies: options.includeReplies,
        input,
        resultLimit,
      },
      idempotencyKey: requestKey,
      method: 'POST',
    });
  } catch (error) {
    if (
      error instanceof ExportDouError
      && ['network_error', 'request_timeout'].includes(error.code)
    ) {
      try {
        created = await client.request<ExportDetail>(
          `/export-requests/${encodeURIComponent(requestKey)}`,
        );
      } catch {
        throw error;
      }
    } else {
      throw error;
    }
  }

  const taskId = created.id;
  if (!options.wait) {
    const receipt = {
      dispatchDelayed: 'dispatchDelayed' in created
        ? created.dispatchDelayed
        : created.status === 'queued',
      next: `exportdou status ${taskId} --json`,
      reservedCredits: created.reservedCredits,
      status: created.status,
      taskId,
    };
    if (options.json) writeJson(receipt);
    else {
      writeLine(`任务已创建：${taskId}`);
      writeLine(`状态：${created.status}`);
      writeLine(`已冻结：${receipt.reservedCredits.toLocaleString('zh-CN')} 积分`);
      writeLine(`下一步：exportdou status ${taskId}`);
    }
    return;
  }

  const detail = await waitForExport(client, taskId, options);
  if (options.output && detail.result) {
    await downloadExport(taskId, options.output, false, options.json);
    return;
  }
  printStatus(detail, options.json);
}

export async function getStatus(taskId: string, json: boolean): Promise<void> {
  if (!taskId) throw new ExportDouError('请提供任务 ID', 'task_id_required');
  const detail = await new ApiClient().request<ExportDetail>(`/exports/${taskId}`);
  printStatus(detail, json);
}

export async function previewResult(
  taskId: string,
  limit: number,
  json: boolean,
): Promise<void> {
  if (!taskId) throw new ExportDouError('请提供任务 ID', 'task_id_required');
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new ExportDouError('预览数量必须是 1 到 50 的整数', 'invalid_preview_limit');
  }
  const result = await new ApiClient().request<ResultPreview>(
    `/exports/${taskId}/preview`,
  );
  const comments = result.comments.slice(0, limit);
  if (json) {
    writeJson({ ...result, comments, displayedCount: comments.length });
    return;
  }
  writeLine(`结果预览：展示 ${comments.length} / 实际导出 ${result.totalRows} 条`);
  writeLine('');
  for (const comment of comments) {
    const level = comment.level === 2 ? '回复' : '评论';
    writeLine(`[${level}] ${comment.authorName ?? '匿名用户'} · 赞 ${comment.likeCount}`);
    writeLine(`  ${comment.text.replace(/\s+/gu, ' ')}`);
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function downloadExport(
  taskId: string,
  output: string | null,
  force: boolean,
  json: boolean,
): Promise<void> {
  if (!taskId) throw new ExportDouError('请提供任务 ID', 'task_id_required');
  const client = new ApiClient();
  const detail = await client.request<ExportDetail>(`/exports/${taskId}`);
  if (!detail.result) {
    throw new ExportDouError(
      terminalStatus(detail.status)
        ? detail.error?.message ?? `任务状态为 ${detail.status}，没有可下载结果`
        : `任务仍在 ${detail.status}，请稍后运行 exportdou status ${taskId}`,
      detail.error?.code ?? 'export_not_ready',
    );
  }
  const target = resolve(output ?? `exportdou-${taskId}.${detail.result.format}`);
  if (!force && await fileExists(target)) {
    throw new ExportDouError(
      `文件已存在：${target}。如需覆盖请添加 --force。`,
      'output_exists',
    );
  }
  await mkdir(dirname(target), { recursive: true });
  const partial = `${target}.part`;
  await rm(partial, { force: true });
  const response = await client.download(`/exports/${taskId}/download`);
  if (!response.body) {
    throw new ExportDouError('下载响应没有文件内容', 'empty_download');
  }
  const hash = createHash('sha256');
  let sizeBytes = 0;
  const checksum = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      hash.update(chunk);
      sizeBytes += chunk.byteLength;
      callback(null, chunk);
    },
  });
  try {
    await pipeline(
      Readable.fromWeb(response.body as never),
      checksum,
      createWriteStream(partial, { flags: 'wx', mode: 0o600 }),
    );
    const sha256 = hash.digest('hex');
    if (sha256 !== detail.result.sha256) {
      throw new ExportDouError('下载文件校验失败，请重新下载', 'checksum_mismatch');
    }
    if (sizeBytes !== detail.result.sizeBytes) {
      throw new ExportDouError('下载文件大小不完整，请重新下载', 'size_mismatch');
    }
    if (force) await rm(target, { force: true });
    await rename(partial, target);
    const receipt = {
      format: detail.result.format,
      path: target,
      rowCount: detail.result.rowCount,
      sha256,
      sizeBytes,
      taskId,
    };
    if (json) writeJson(receipt);
    else {
      writeLine(`下载完成：${target}`);
      writeLine(`${detail.result.rowCount.toLocaleString('zh-CN')} 条，${sizeBytes.toLocaleString('zh-CN')} 字节`);
    }
  } catch (error) {
    await rm(partial, { force: true });
    throw error;
  }
}

export async function cancelExport(taskId: string, json: boolean): Promise<void> {
  if (!taskId) throw new ExportDouError('请提供任务 ID', 'task_id_required');
  const result = await new ApiClient().request<{
    cancelRequested: boolean;
    id: string;
    status: string;
  }>(`/exports/${taskId}/cancel`, { method: 'POST' });
  if (json) writeJson(result);
  else writeLine(result.cancelRequested ? `已请求取消：${taskId}` : `任务已经是 ${result.status}`);
}

export async function resumeExport(taskId: string, json: boolean): Promise<void> {
  if (!taskId) throw new ExportDouError('请提供任务 ID', 'task_id_required');
  const result = await new ApiClient().request<ResumeExportResponse>(
    `/exports/${taskId}/resume`,
    { method: 'POST' },
  );
  const receipt = {
    ...result,
    next: `exportdou status ${taskId} --json`,
    taskId,
  };
  if (json) {
    writeJson(receipt);
    return;
  }
  writeLine(`任务已从断点重新排队：${taskId}`);
  writeLine(`剩余预留：${result.remainingCredits.toLocaleString('zh-CN')} 积分`);
  writeLine(`下一步：exportdou status ${taskId}`);
}
