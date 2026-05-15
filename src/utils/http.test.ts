import { describe, expect, test } from 'bun:test';
import { buildQuery, type FetchLike, fetchJson, HttpError } from '@/utils/http.ts';

describe('buildQuery', () => {
  test('returns empty string for no params', () => {
    expect(buildQuery({})).toBe('');
  });

  test('skips undefined values', () => {
    expect(buildQuery({ a: 1, b: undefined, c: 'x' })).toBe('?a=1&c=x');
  });

  test('serializes booleans and numbers as strings', () => {
    expect(buildQuery({ flag: true, n: 42 })).toBe('?flag=true&n=42');
  });

  test('URL-encodes keys and values, including special characters', () => {
    expect(buildQuery({ q: 'Zürich HB', 'wei&rd': 'a=b' })).toBe(
      '?q=Z%C3%BCrich%20HB&wei%26rd=a%3Db',
    );
  });
});

describe('fetchJson', () => {
  test('returns parsed JSON on 2xx', async () => {
    const stub: FetchLike = async () =>
      new Response(JSON.stringify({ hello: 'world' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    const data = await fetchJson<{ hello: string }>('https://example.test/x', {
      fetchImpl: stub,
    });
    expect(data.hello).toBe('world');
  });

  test('forwards Accept header and merges custom headers', async () => {
    let receivedHeaders: Headers | undefined;
    const stub: FetchLike = async (_url, init) => {
      receivedHeaders = new Headers(init?.headers);
      return new Response('{}', { status: 200 });
    };
    await fetchJson('https://example.test/x', {
      headers: { 'User-Agent': 'bergauf-test/1.0' },
      fetchImpl: stub,
    });
    expect(receivedHeaders?.get('accept')).toBe('application/json');
    expect(receivedHeaders?.get('user-agent')).toBe('bergauf-test/1.0');
  });

  test('throws HttpError on non-2xx with status, message, and truncated body', async () => {
    const stub: FetchLike = async () =>
      new Response('something broke'.repeat(200), { status: 503 });
    let caught: unknown;
    try {
      await fetchJson('https://example.test/oops', { fetchImpl: stub });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(HttpError);
    const e = caught as HttpError;
    expect(e.status).toBe(503);
    expect(e.message).toContain('HTTP 503');
    expect(e.message).toContain('https://example.test/oops');
    expect(e.body).toBeDefined();
    expect((e.body ?? '').length).toBeLessThanOrEqual(500);
  });

  test('aborts the request when the timeout fires', async () => {
    const stub: FetchLike = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'));
        });
        // Never resolve on its own — only the abort path completes this promise.
      });
    let caught: unknown;
    try {
      await fetchJson('https://example.test/slow', {
        timeoutMs: 20,
        fetchImpl: stub,
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeDefined();
    expect((caught as Error).name).toBe('AbortError');
  });
});
