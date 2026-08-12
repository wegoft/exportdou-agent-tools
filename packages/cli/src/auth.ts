import { spawn } from 'node:child_process';

import { ApiClient, ExportDouError } from './api.js';
import { clearApiKey, writeApiKey } from './config.js';
import { progress, writeJson, writeLine } from './output.js';
import type { Account, DeviceAuthorization, DeviceToken } from './types.js';
import { packageVersion } from './version.js';

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function openBrowser(url: string): boolean {
  try {
    const command = process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
        ? 'cmd'
        : 'xdg-open';
    const args = process.platform === 'win32'
      ? ['/c', 'start', '', url]
      : [url];
    const child = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();
    return true;
  } catch {
    return false;
  }
}

export async function login(options: {
  apiKey: string | null;
  json: boolean;
  open: boolean;
}): Promise<void> {
  if (options.apiKey) {
    const account = await new ApiClient(options.apiKey).request<Account>('/account');
    await writeApiKey(options.apiKey);
    if (options.json) {
      writeJson({ authenticated: true, account, method: 'api_key' });
    } else {
      writeLine(`已登录：${account.email ?? account.displayName ?? account.id}`);
    }
    return;
  }

  const client = new ApiClient(null);
  const authorization = await client.request<DeviceAuthorization>(
    '/cli/authorizations',
    {
      auth: false,
      body: {
        clientName: process.env.EXPORTDOU_CLIENT_NAME ?? 'ExportDou CLI',
        clientVersion: packageVersion(),
      },
      method: 'POST',
    },
  );
  const opened = options.open && openBrowser(authorization.verificationUriComplete);
  progress('请在浏览器确认 ExportDou 设备授权：');
  progress(`  ${authorization.verificationUriComplete}`);
  progress(`设备码：${authorization.userCode}`);
  if (options.open && !opened) progress('未能自动打开浏览器，请手动复制上面的地址。');

  const startedAt = Date.now();
  let interval = Math.max(2, authorization.interval);
  while (Date.now() - startedAt < authorization.expiresIn * 1000) {
    await sleep(interval * 1000);
    try {
      const token = await client.request<DeviceToken>(
        '/cli/authorizations/token',
        {
          auth: false,
          body: { deviceCode: authorization.deviceCode },
          method: 'POST',
          retries: 0,
        },
      );
      if (token.status === 'pending') {
        interval = Math.max(interval, token.interval);
        continue;
      }
      const account = await new ApiClient(token.apiKey).request<Account>('/account');
      await writeApiKey(token.apiKey);
      if (options.json) {
        writeJson({
          apiKeyId: token.apiKeyId,
          authenticated: true,
          account,
          method: 'device_authorization',
        });
      } else {
        writeLine(`授权成功：${account.email ?? account.displayName ?? account.id}`);
      }
      return;
    } catch (error) {
      if (error instanceof ExportDouError && error.code === 'authorization_pending') {
        continue;
      }
      if (error instanceof ExportDouError && error.code === 'rate_limited') {
        interval = Math.max(interval + 2, error.retryAfterSeconds ?? 5);
        continue;
      }
      throw error;
    }
  }
  throw new ExportDouError(
    '设备授权已经过期，请重新运行 `exportdou login`',
    'expired_token',
  );
}

export async function logout(json: boolean): Promise<void> {
  const removed = await clearApiKey();
  const environmentKeyActive = Boolean(process.env.EXPORTDOU_API_KEY);
  if (json) {
    writeJson({
      environmentKeyActive,
      loggedOut: removed && !environmentKeyActive,
      removedStoredCredential: removed,
    });
    return;
  }
  writeLine(removed ? '已删除本机保存的 ExportDou 凭证。' : '本机没有已保存的 ExportDou 凭证。');
  if (environmentKeyActive) {
    progress('EXPORTDOU_API_KEY 环境变量仍然有效，请从当前 shell 或密钥管理器中移除。');
  }
}
