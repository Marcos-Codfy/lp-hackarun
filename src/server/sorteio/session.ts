// sessão da organização no sorteio: um cookie assinado (HMAC-SHA256) com a validade dentro. A chave sai da chave do
// Apps Script + login + senha: trocar a senha derruba todas as sessões abertas
import type { SorteioConfig } from './config';

export const SESSION_COOKIE = '__Host-hr_sorteio';
export const SESSION_HOURS = 12;

const encoder = new TextEncoder();

function hex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hmacKey(config: SorteioConfig): Promise<CryptoKey> {
  const material = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(`sorteio-sessao|${config.token}|${config.user}|${config.password}`),
  );
  return crypto.subtle.importKey('raw', material, { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

async function sign(config: SorteioConfig, payload: string): Promise<string> {
  return hex(await crypto.subtle.sign('HMAC', await hmacKey(config), encoder.encode(payload)));
}

// compara dois textos sem sair no primeiro caractere diferente (o tempo não entrega quanto bateu)
export async function sameText(a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(a)),
    crypto.subtle.digest('SHA-256', encoder.encode(b)),
  ]);
  const left = new Uint8Array(x);
  const right = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= (left[i] as number) ^ (right[i] as number);
  return diff === 0;
}

export async function checkLogin(config: SorteioConfig, user: string, password: string): Promise<boolean> {
  // as duas comparações sempre rodam (login errado e senha errada levam o mesmo tempo)
  const [userOk, passwordOk] = await Promise.all([
    sameText(user.trim().toLowerCase(), config.user.toLowerCase()),
    sameText(password, config.password),
  ]);
  return userOk && passwordOk;
}

export async function createSession(config: SorteioConfig, now: number): Promise<string> {
  const expires = Math.floor(now / 1000) + SESSION_HOURS * 3600;
  const payload = `v1.${expires}`;
  return `${payload}.${await sign(config, payload)}`;
}

export async function validSession(
  config: SorteioConfig,
  value: string | null,
  now: number,
): Promise<boolean> {
  const match = /^v1\.(\d{1,12})\.([0-9a-f]{64})$/.exec(value ?? '');
  if (!match) return false;
  const expires = Number(match[1]);
  if (expires * 1000 <= now) return false;
  return sameText(match[2] as string, await sign(config, `v1.${expires}`));
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('Cookie') ?? '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return null;
}

export function sessionCookie(value: string): string {
  return `${SESSION_COOKIE}=${value}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}`;
}

export function clearedCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0`;
}
