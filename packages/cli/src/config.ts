import { chmod, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

type StoredConfig = {
  apiKey: string;
};

const DEFAULT_API_URL = 'https://api.exportdou.cn/v1';

export function configPath(): string {
  return process.env.EXPORTDOU_CONFIG_PATH
    ?? join(homedir(), '.exportdou', 'config.json');
}

export function apiBaseUrl(): string {
  const configured = (process.env.EXPORTDOU_API_URL ?? DEFAULT_API_URL)
    .replace(/\/+$/u, '');
  return /\/(?:api\/)?v1$/u.test(configured)
    ? configured
    : `${configured}/v1`;
}

export async function readApiKey(): Promise<string | null> {
  const environmentKey = process.env.EXPORTDOU_API_KEY?.trim();
  if (environmentKey) return environmentKey;
  try {
    const parsed = JSON.parse(await readFile(configPath(), 'utf8')) as StoredConfig;
    return typeof parsed.apiKey === 'string' && parsed.apiKey.trim()
      ? parsed.apiKey.trim()
      : null;
  } catch {
    return null;
  }
}

export async function writeApiKey(apiKey: string): Promise<void> {
  const target = configPath();
  const directory = dirname(target);
  const temporary = `${target}.${process.pid}.tmp`;
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);
  await writeFile(
    temporary,
    `${JSON.stringify({ apiKey }, null, 2)}\n`,
    { encoding: 'utf8', mode: 0o600 },
  );
  await rename(temporary, target);
  await chmod(target, 0o600);
}

export async function clearApiKey(): Promise<boolean> {
  try {
    await rm(configPath());
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}
