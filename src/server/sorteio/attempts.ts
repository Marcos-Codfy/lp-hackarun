// limite de tentativas de login: 5 erros seguidos do mesmo IP travam o login por 15 minutos. Na Cloudflare o contador
// fica no cache do data center (Cache API): é um freio, não um cofre; a senha e o liga/desliga continuam valendo

export const MAX_FAILURES = 5;
export const LOCK_SECONDS = 15 * 60;

export interface AttemptStore {
  failures(ip: string): Promise<number>;
  fail(ip: string): Promise<void>;
  clear(ip: string): Promise<void>;
}

// nos testes (e se a Cache API faltar): memória do próprio processo
export class MemoryAttemptStore implements AttemptStore {
  private readonly counts = new Map<string, { n: number; until: number }>();

  constructor(private readonly now: () => number = Date.now) {}

  failures(ip: string): Promise<number> {
    const entry = this.counts.get(ip);
    return Promise.resolve(entry && entry.until > this.now() ? entry.n : 0);
  }

  async fail(ip: string): Promise<void> {
    this.counts.set(ip, { n: (await this.failures(ip)) + 1, until: this.now() + LOCK_SECONDS * 1000 });
  }

  clear(ip: string): Promise<void> {
    this.counts.delete(ip);
    return Promise.resolve();
  }
}

interface EdgeCache {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
  delete(request: Request): Promise<boolean>;
}

// Cache API da Cloudflare (caches.default). O IP entra só como hash na chave
export class CacheAttemptStore implements AttemptStore {
  constructor(private readonly cache: EdgeCache) {}

  private async key(ip: string): Promise<Request> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`sorteio-login|${ip}`));
    const id = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
    return new Request(`https://sorteio-tentativas.invalid/${id}`);
  }

  async failures(ip: string): Promise<number> {
    const hit = await this.cache.match(await this.key(ip));
    return hit ? Number(await hit.text()) || 0 : 0;
  }

  async fail(ip: string): Promise<void> {
    const n = (await this.failures(ip)) + 1;
    const response = new Response(String(n), {
      headers: { 'Cache-Control': `max-age=${LOCK_SECONDS}` },
    });
    await this.cache.put(await this.key(ip), response);
  }

  async clear(ip: string): Promise<void> {
    await this.cache.delete(await this.key(ip));
  }
}
