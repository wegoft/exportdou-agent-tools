import { apiBaseUrl, readApiKey } from './config.js';
import { packageVersion } from './version.js';

export class ExportDouError extends Error {
  constructor(
    message: string,
    readonly code = 'exportdou_error',
    readonly status: number | null = null,
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = 'ExportDouError';
  }
}

type RequestOptions = {
  apiKey?: string | null;
  auth?: boolean;
  body?: unknown;
  headers?: Record<string, string>;
  idempotencyKey?: string;
  method?: 'DELETE' | 'GET' | 'POST';
  retries?: number;
  timeoutMs?: number;
};

function endpoint(path: string): string {
  const base = apiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function responseError(response: Response): Promise<ExportDouError> {
  const body = await response.json().catch(() => ({})) as {
    error?: string;
    message?: string;
    retryAfterSeconds?: number;
  };
  return new ExportDouError(
    body.message ?? `ExportDou API returned HTTP ${response.status}`,
    body.error ?? `http_${response.status}`,
    response.status,
    typeof body.retryAfterSeconds === 'number' ? body.retryAfterSeconds : null,
  );
}

export class ApiClient {
  constructor(private readonly suppliedApiKey?: string | null) {}

  private async fetchResponse(
    path: string,
    options: RequestOptions,
  ): Promise<Response> {
    const method = options.method ?? 'GET';
    const auth = options.auth ?? true;
    const apiKey = options.apiKey ?? this.suppliedApiKey ?? await readApiKey();
    if (auth && !apiKey) {
      throw new ExportDouError(
        '尚未登录。请先运行 `exportdou login`。',
        'authentication_required',
        401,
      );
    }
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-ExportDou-Client-Name': process.env.EXPORTDOU_CLIENT_NAME ?? 'exportdou-cli',
      'X-ExportDou-Client-Version': packageVersion(),
      ...options.headers,
    };
    if (auth && apiKey) headers.Authorization = `Bearer ${apiKey}`;
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;

    const canRetry = method === 'GET' || Boolean(options.idempotencyKey);
    const retries = canRetry ? options.retries ?? 2 : 0;
    for (let attempt = 0; ; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        options.timeoutMs ?? 30_000,
      );
      try {
        const response = await fetch(endpoint(path), {
          method,
          headers,
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
          redirect: 'follow',
          signal: controller.signal,
        });
        if (
          attempt < retries
          && [502, 503, 504].includes(response.status)
        ) {
          await response.body?.cancel();
          await sleep(400 * (2 ** attempt));
          continue;
        }
        return response;
      } catch (error) {
        if (attempt >= retries) {
          const timedOut = error instanceof Error && error.name === 'AbortError';
          throw new ExportDouError(
            timedOut
              ? '请求 ExportDou 超时，请稍后重试'
              : '无法连接 ExportDou，请检查网络后重试',
            timedOut ? 'request_timeout' : 'network_error',
          );
        }
        await sleep(400 * (2 ** attempt));
      } finally {
        clearTimeout(timeout);
      }
    }
  }

  async request<T>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const response = await this.fetchResponse(path, options);
    if (!response.ok) throw await responseError(response);
    if (response.status === 204) return undefined as T;
    return await response.json() as T;
  }

  async download(path: string): Promise<Response> {
    const response = await this.fetchResponse(path, {
      method: 'GET',
      retries: 2,
      timeoutMs: 60_000,
    });
    if (!response.ok) throw await responseError(response);
    return response;
  }
}
