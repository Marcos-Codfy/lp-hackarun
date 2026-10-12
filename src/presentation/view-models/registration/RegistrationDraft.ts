import { Email, FullName, isTeamImageType, StudentId, TEAM_IMAGE_RULES, TeamName } from '@domain/index';
import type { PreparedTeamImageDTO } from '@application/index';
import { isIdempotencyKey } from './idempotencyKey';
import type { RegistrationFields, RestoredFields } from './RegistrationFields';
import { isRegistrationOrigin } from './registrationOrigin';

// rascunho da inscrição na aba (sessionStorage): quem sai pra LP e volta encontra o que digitou. Some ao
// fechar a aba, ao enviar ou no "Limpar rascunho". O aceite nunca vai pro rascunho. Mudou o formato? Suba a
// versão da chave: rascunho velho é ignorado em vez de quebrar a página.
// Os textos e a foto ficam em chaves separadas: a foto (até ~546 mil caracteres) só é gravada quando muda,
// e cada pausa na digitação regrava só os textos
export const DRAFT_KEY = 'hackarun:registration-draft:v2';
const VERSION = 2;

// teto da foto no rascunho: o mesmo do envio, em caracteres de base64 (~546 mil)
export const MAX_DRAFT_IMAGE_CHARS = Math.ceil(TEAM_IMAGE_RULES.maxBytes / 3) * 4;

// só o pedaço do Web Storage que o rascunho usa (os testes passam um falso)
export interface DraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface RegistrationDraftData extends RestoredFields {
  // origem do CTA que trouxe a pessoa (coluna "Origem"); só valores da lista
  source: string | null;
  // chave de idempotência do envio: a resposta perdida + recarregar não vira "nome já inscrito"
  sessionKey: string | null;
  // a foto não coube no armazenamento da aba: a pessoa escolhe de novo
  imageDropped: boolean;
}

// saved-without-image: textos salvos, foto grande demais pra aba; failed: armazenamento indisponível
export type DraftSaveResult = 'saved' | 'saved-without-image' | 'empty' | 'failed';

const MAX_MEMBERS = 10;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

const text = (value: unknown, max: number): string => (typeof value === 'string' ? value.slice(0, max) : '');

function readImage(raw: unknown): PreparedTeamImageDTO | null {
  if (!raw || typeof raw !== 'object') return null;
  const { mimeType, base64, width, height, bytes } = raw as Record<string, unknown>;
  if (typeof mimeType !== 'string' || !isTeamImageType(mimeType)) return null;
  if (typeof base64 !== 'string' || base64.length > MAX_DRAFT_IMAGE_CHARS || !BASE64.test(base64))
    return null;
  const sizes = [width, height, bytes];
  if (!sizes.every((n) => typeof n === 'number' && Number.isFinite(n) && n > 0)) return null;
  return { mimeType, base64, width: width as number, height: height as number, bytes: bytes as number };
}

function readMembers(raw: unknown): RestoredFields['members'] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_MEMBERS).map((m: unknown) => {
    const member = (m && typeof m === 'object' ? m : {}) as Record<string, unknown>;
    return {
      name: text(member['name'], FullName.MAX),
      studentId: text(member['studentId'], StudentId.MAX),
      email: text(member['email'], Email.MAX),
    };
  });
}

export function hasDraftContent(fields: RestoredFields): boolean {
  if (fields.teamName.trim() || fields.teamImage) return true;
  return fields.members.some((m) => `${m.name}${m.studentId}${m.email}`.trim() !== '');
}

export class RegistrationDraft {
  private readonly storage: DraftStorage | null;
  private readonly key: string;
  private readonly imageKey: string;
  // a foto que já está gravada (undefined = ainda não sabe: a próxima gravação confere)
  private storedImage: PreparedTeamImageDTO | null | undefined = undefined;
  private imageStored = false;

  constructor(storage: DraftStorage | null, key = DRAFT_KEY) {
    this.storage = storage;
    this.key = key;
    this.imageKey = `${key}:image`;
  }

  // rascunho inválido, de outra versão ou ilegível (storage bloqueado) volta null
  load(): RegistrationDraftData | null {
    const data = this.readJson(this.key);
    if (!data || data['v'] !== VERSION) return null;
    const hadImage = data['image'] === true;
    const teamImage = hadImage ? readImage(this.readJson(this.imageKey)) : null;
    const source = data['source'];
    const sessionKey = data['sessionKey'];
    const draft: RegistrationDraftData = {
      teamName: text(data['teamName'], TeamName.MAX),
      members: readMembers(data['members']),
      teamImage,
      source: typeof source === 'string' && isRegistrationOrigin(source) ? source : null,
      sessionKey: isIdempotencyKey(sessionKey) ? sessionKey : null,
      imageDropped: data['imageDropped'] === true || (hadImage && !teamImage),
    };
    if (!hasDraftContent(draft) && !draft.imageDropped) return null;
    this.storedImage = teamImage;
    this.imageStored = teamImage !== null;
    return draft;
  }

  // textos sempre; a foto só quando mudou. Se a aba recusar (cota), solta a foto e tenta só os textos
  save(fields: RegistrationFields, source: string | null, sessionKey: string | null = null): DraftSaveResult {
    if (!hasDraftContent(fields)) {
      this.clear();
      return 'empty';
    }
    const image = fields.teamImage;
    if (image !== this.storedImage) {
      this.storedImage = image;
      this.imageStored = this.writeImage(image);
    }
    const members = fields.members.map(({ name, studentId, email }) => ({ name, studentId, email }));
    const base = { v: VERSION, teamName: fields.teamName, members, source, sessionKey };
    const record = () => ({
      ...base,
      image: this.imageStored,
      imageDropped: image !== null && !this.imageStored,
    });
    if (this.write(this.key, record())) return image && !this.imageStored ? 'saved-without-image' : 'saved';
    if (!this.imageStored) return 'failed';
    this.remove(this.imageKey);
    this.imageStored = false;
    return this.write(this.key, record()) ? 'saved-without-image' : 'failed';
  }

  clear(): void {
    this.remove(this.key);
    this.remove(this.imageKey);
    this.storedImage = undefined;
    this.imageStored = false;
  }

  private writeImage(image: PreparedTeamImageDTO | null): boolean {
    if (image && image.base64.length <= MAX_DRAFT_IMAGE_CHARS && this.write(this.imageKey, image))
      return true;
    this.remove(this.imageKey);
    return false;
  }

  private readJson(key: string): Record<string, unknown> | null {
    try {
      const raw = this.storage?.getItem(key) ?? null;
      const data: unknown = raw ? JSON.parse(raw) : null;
      return data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }

  private write(key: string, data: object): boolean {
    if (!this.storage) return false;
    try {
      this.storage.setItem(key, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  private remove(key: string): void {
    try {
      this.storage?.removeItem(key);
    } catch {
      // storage bloqueado: não tinha nada salvo mesmo
    }
  }
}
