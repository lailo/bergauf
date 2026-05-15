// Shared fetch helper with timeout, JSON parsing, and friendly errors.

// Minimal subset of `fetch` we actually call. Avoids friction with Bun's
// expanded global `fetch` type which has extra methods like `preconnect`.
export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export interface FetchJsonOptions {
  timeoutMs?: number;
  headers?: Record<string, string>;
  fetchImpl?: FetchLike;
}

export async function fetchJson<T = unknown>(
  url: string,
  { timeoutMs = 15_000, headers, fetchImpl }: FetchJsonOptions = {},
): Promise<T> {
  const f: FetchLike = fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await f(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json', ...headers },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new HttpError(`HTTP ${res.status} for ${url}`, res.status, body.slice(0, 500));
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}
