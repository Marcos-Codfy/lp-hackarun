export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export class AppsScriptHttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Apps Script respondeu HTTP ${status}`);
    this.name = 'AppsScriptHttpError';
    this.status = status;
  }
}

// cliente do Web App do Apps Script (inscrição e lista de equipes usam o mesmo endpoint)
export class AppsScriptClient {
  private readonly endpoint: string;
  private readonly fetchFn: FetchLike;

  constructor(endpoint: string, fetchFn: FetchLike = (input, init) => fetch(input, init)) {
    this.endpoint = endpoint;
    this.fetchFn = fetchFn;
  }

  get(params: Record<string, string>, timeoutMs: number): Promise<unknown> {
    const url = new URL(this.endpoint);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    return this.request(url.toString(), { method: 'GET' }, timeoutMs);
  }

  // text/plain = "simple request": sem preflight CORS, que o Apps Script não sabe responder
  post(body: unknown, timeoutMs: number): Promise<unknown> {
    return this.request(
      this.endpoint,
      {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body),
      },
      timeoutMs,
    );
  }

  private async request(url: string, init: RequestInit, timeoutMs: number): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      // o Web App responde com 302 pro googleusercontent: precisa seguir o redirect
      const res = await this.fetchFn(url, {
        ...init,
        redirect: 'follow',
        credentials: 'omit',
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!res.ok) throw new AppsScriptHttpError(res.status);
      return (await res.json()) as unknown;
    } finally {
      clearTimeout(timer);
    }
  }
}
