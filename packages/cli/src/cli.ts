#!/usr/bin/env node

import { readFileSync } from 'node:fs';

import { hasFlag, numberOption, option, parseArgs } from './args.js';
import { login, logout } from './auth.js';
import { credits, history, whoami } from './commands/account.js';
import {
  cancelExport,
  createExport,
  downloadExport,
  getStatus,
  inspect,
  previewResult,
} from './commands/exports.js';
import { ExportDouError } from './api.js';
import { writeError, writeLine } from './output.js';

function version(): string {
  try {
    const packageJson = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
    ) as { version?: string };
    return packageJson.version ?? '1.0.0';
  } catch {
    return '1.0.0';
  }
}

function help(): void {
  writeLine(`ExportDou CLI v${version()}

用法：
  exportdou login [--api-key <key>] [--no-open] [--json]
  exportdou logout [--json]
  exportdou whoami [--json]
  exportdou inspect <抖音链接或分享文案> [--json]
  exportdou export <抖音链接或分享文案> [--limit 1000 | --all]
                   [--replies] [--format csv|xlsx] [--json]
                   [--wait] [--timeout 600] [--output comments.csv]
  exportdou status <task-id> [--json]
  exportdou preview <task-id> [--limit 20] [--json]
  exportdou download <task-id> [--output comments.csv] [--force] [--json]
  exportdou cancel <task-id> [--json]
  exportdou history [--limit 20] [--json]
  exportdou credits [--json]

默认行为：
  export 命令提交后立即返回任务 ID。请保存 ID，后续使用 status 查询；
  不要重复提交原链接来检查进度。仅在人类明确需要终端持续等待时使用 --wait。

环境变量：
  EXPORTDOU_API_KEY      API Key（优先于本机配置）
  EXPORTDOU_API_URL      API 地址（默认 https://exportdou.cn）
  EXPORTDOU_CONFIG_PATH  自定义本机配置路径

网站：https://exportdou.cn/developers#agent
API： https://exportdou.cn/developers`);
}

function inputFrom(command: string | null, positionals: string[]): string {
  return [command, ...positionals].filter(Boolean).join(' ');
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes('--version') || argv.includes('-v')) {
    writeLine(version());
    return;
  }
  if (argv.includes('--help') || argv.includes('-h')) {
    help();
    return;
  }
  const args = parseArgs(argv);
  const json = hasFlag(args, '--json');

  switch (args.command) {
    case null:
    case 'help':
      help();
      return;
    case 'login':
      await login({
        apiKey: option(args, '--api-key'),
        json,
        open: !hasFlag(args, '--no-open'),
      });
      return;
    case 'logout':
      await logout(json);
      return;
    case 'whoami':
      await whoami(json);
      return;
    case 'credits':
    case 'balance':
      await credits(json);
      return;
    case 'history':
      await history(numberOption(args, '--limit', 20), json);
      return;
    case 'inspect':
      await inspect(args.positionals.join(' '), json);
      return;
    case 'export': {
      const format = option(args, '--format') ?? 'csv';
      if (format !== 'csv' && format !== 'xlsx') {
        throw new ExportDouError('--format 只支持 csv 或 xlsx', 'invalid_format');
      }
      const rawLimit = option(args, '--limit');
      await createExport(args.positionals.join(' '), {
        all: hasFlag(args, '--all'),
        format,
        includeReplies: hasFlag(args, '--replies'),
        json,
        limit: rawLimit == null ? null : Number(rawLimit),
        output: option(args, '--output'),
        pollIntervalSeconds: numberOption(args, '--poll-interval', 3),
        timeoutSeconds: numberOption(args, '--timeout', 600),
        wait: hasFlag(args, '--wait'),
      });
      return;
    }
    case 'status':
      await getStatus(args.positionals[0] ?? '', json);
      return;
    case 'preview':
      await previewResult(
        args.positionals[0] ?? '',
        numberOption(args, '--limit', 20),
        json,
      );
      return;
    case 'download':
      await downloadExport(
        args.positionals[0] ?? '',
        option(args, '--output'),
        hasFlag(args, '--force'),
        json,
      );
      return;
    case 'cancel':
      await cancelExport(args.positionals[0] ?? '', json);
      return;
    default: {
      const shortcut = inputFrom(args.command, args.positionals);
      if (/douyin\.com|v\.douyin\.com|抖音/iu.test(shortcut)) {
        await createExport(shortcut, {
          all: hasFlag(args, '--all'),
          format: 'csv',
          includeReplies: hasFlag(args, '--replies'),
          json,
          limit: option(args, '--limit') == null
            ? null
            : Number(option(args, '--limit')),
          output: option(args, '--output'),
          pollIntervalSeconds: numberOption(args, '--poll-interval', 3),
          timeoutSeconds: numberOption(args, '--timeout', 600),
          wait: hasFlag(args, '--wait'),
        });
        return;
      }
      throw new ExportDouError(
        `未知命令：${args.command}。运行 exportdou help 查看用法。`,
        'unknown_command',
      );
    }
  }
}

const wantsJson = process.argv.includes('--json');
main().catch((error) => {
  writeError(error, wantsJson);
  process.exitCode = 1;
});
