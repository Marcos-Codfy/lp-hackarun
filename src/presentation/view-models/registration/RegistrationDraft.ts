import { isIdempotencyKey } from './idempotencyKey';
import { FIELD_PATHS, type FieldPath, type RegistrationFields } from './RegistrationFields';
import type { RestoredDraft } from './RegistrationFormViewModel';
import { isRegistrationOrigin } from './registrationOrigin';

// rascunho da inscrição na aba (sessionStorage): quem sai pra LP e volta encontra o que digitou. Some ao
// fechar a aba, ao enviar ou no "Limpar rascunho". O aceite nunca vai pro rascunho. Mudou o formato? Suba a
// versão da chave: rascunho velho (o da inscrição de equipe era v2) é ignorado em vez de quebrar a página
export const DRAFT_KEY = 'hackarun:registration-draft:v3';
const VERSION = 3;

// teto por campo: o maior campo do formulário (instituição) tem 100 caracteres
const MAX_CHARS = 120;

// só o pedaço do Web Storage que o rascunho usa (os testes passam um falso)
export interface DraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface RegistrationDraftData extends RestoredDraft {
  // origem do CTA que trouxe a pessoa (coluna "Origem"); só valores da lista
  source: string | null;
  sessionKey: string | null;
}

// failed: armazenamento indisponível
export type DraftSaveResult = 'saved' | 'empty' | 'failed';

// o honeypot nunca vai pro rascunho
const DRAFT_PATHS = FIELD_PATHS.filter((p) => p !== 'honeypot');

type DraftFields = Partial<Record<FieldPath, string>>;

function readFields(raw: unknown): DraftFields {
  if (!raw || typeof raw !== 'object') return {};
  const record = raw as Record<string, unknown>;
  const fields: DraftFields = {};
  for (const path of DRAFT_PATHS) {
    const value = record[path];
    if (typeof value === 'string' && value) fields[path] = value.slice(0, MAX_CHARS);
  }
  return fields;
}

export function hasDraftContent(fields: DraftFields | RegistrationFields): boolean {
  return DRAFT_PATHS.some((path) => (fields[path] ?? '').trim() !== '');
}

export class RegistrationDraft {
  private readonly storage: DraftStorage | null;
  private readonly key: string;

  constructor(storage: DraftStorage | null, key = DRAFT_KEY) {
    this.storage = storage;
    this.key = key;
  }

  // rascunho inválido, de outra versão ou ilegível (storage bloqueado) volta null
  load(): RegistrationDraftData | null {
    const data = this.readJson();
    if (!data || data['v'] !== VERSION) return null;
    const fields = readFields(data['fields']);
    if (!hasDraftContent(fields)) return null;
    const source = data['source'];
    const sessionKey = data['sessionKey'];
    return {
      fields,
      source: typeof source === 'string' && isRegistrationOrigin(source) ? source : null,
      sessionKey: isIdempotencyKey(sessionKey) ? sessionKey : null,
    };
  }

  save(fields: RegistrationFields, source: string | null, sessionKey: string | null = null): DraftSaveResult {
    if (!hasDraftContent(fields)) {
      this.clear();
      return 'empty';
    }
    const saved = Object.fromEntries(DRAFT_PATHS.map((path) => [path, fields[path]]));
    return this.write({ v: VERSION, fields: saved, source, sessionKey }) ? 'saved' : 'failed';
  }

  clear(): void {
    try {
      this.storage?.removeItem(this.key);
    } catch {
      // storage bloqueado: não tinha nada salvo mesmo
    }
  }

  private readJson(): Record<string, unknown> | null {
    try {
      const raw = this.storage?.getItem(this.key) ?? null;
      const data: unknown = raw ? JSON.parse(raw) : null;
      return data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }

  private write(data: object): boolean {
    if (!this.storage) return false;
    try {
      this.storage.setItem(this.key, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }
}
