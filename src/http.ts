export const PAGE_SIZE = 500;
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MAX_RETRIES = 4;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(res: Response, fallbackMs: number): number {
  const raw = Number(res.headers.get("Retry-After"));
  if (Number.isFinite(raw) && raw > 0) {
    return raw * 1000;
  }
  return fallbackMs;
}

export async function fetchJson<T>(
  label: string,
  url: string,
  init: RequestInit = {},
  opts: { timeoutMs?: number; maxRetries?: number } = {},
): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let retries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
  let delayMs = 1000;
  const method = (init.method ?? "GET").toUpperCase();

  for (;;) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(url, { ...init, signal: ctrl.signal });
    } catch (err) {
      clearTimeout(timer);
      if (method === "GET" && retries > 0 && err instanceof Error && err.name !== "AbortError") {
        await sleep(delayMs);
        retries -= 1;
        delayMs *= 2;
        continue;
      }
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`${label} timeout after ${timeoutMs}ms: ${url}`);
      }
      throw err;
    }
    clearTimeout(timer);

    if (res.status === 429 && retries > 0) {
      await res.arrayBuffer().catch(() => undefined);
      await sleep(retryDelayMs(res, delayMs));
      retries -= 1;
      delayMs *= 2;
      continue;
    }
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`${label} ${res.status}: ${body.slice(0, 300)}`);
    }
    return (await res.json()) as T;
  }
}

export async function fetchAllPages<T>(
  label: string,
  buildUrl: (page: number) => string,
  headers: HeadersInit,
): Promise<T[]> {
  const out: T[] = [];
  let page = 1;
  for (;;) {
    const data = await fetchJson<T[]>(label, buildUrl(page), { headers });
    out.push(...data);
    if (data.length < PAGE_SIZE) {
      break;
    }
    page += 1;
  }
  return out;
}
