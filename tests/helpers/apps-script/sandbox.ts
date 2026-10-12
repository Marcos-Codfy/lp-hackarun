import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { FakeCache, FakeLock, signedSha256 } from './fakes';
import { FakeBook, FakeSheet, recorder, type Cell } from './sheetFakes';
import { FakeDrive, signedBytes, type FakeBlob } from './driveFakes';
import { fakeImageBase64 } from '../images';

const SCRIPT_DIR = new URL('../../../apps-script/', import.meta.url);
// cada arquivo roda como script separado no mesmo contexto, igual ao editor do Apps Script
export const SCRIPT_FILES = [
  'Code.gs',
  'Validation.gs',
  'Limits.gs',
  'Images.gs',
  'Sheets.gs',
  'Registry.gs',
  'Setup.gs',
  'Summary.gs',
] as const;

export interface ScriptResponse {
  ok: boolean;
  error?: string;
  protocol?: string;
  open?: boolean;
  members?: number[];
  teams?: Record<string, unknown>[];
}

interface TextOutput {
  getContent(): string;
}

type Handler = (event: unknown) => TextOutput;
type Row = Record<string, Cell>;

// roda os .gs de verdade dentro de um vm do Node, com relógio e serviços do Google falsos
export class AppsScriptSandbox {
  readonly cache = new FakeCache();
  readonly lock = new FakeLock();
  readonly drive = new FakeDrive();
  readonly book = new FakeBook();
  readonly properties: Record<string, string> = {};
  readonly errors: unknown[][] = [];
  readonly logs: unknown[][] = [];
  now = Date.parse('2026-10-20T12:00:00-03:00');
  private readonly context: vm.Context;

  constructor() {
    this.context = vm.createContext(this.globals());
    for (const file of SCRIPT_FILES) {
      vm.runInContext(readFileSync(new URL(file, SCRIPT_DIR), 'utf8'), this.context, { filename: file });
    }
  }

  post(body: unknown): ScriptResponse {
    return this.postRaw(JSON.stringify(body));
  }

  postRaw(contents: string): ScriptResponse {
    return this.call('doPost', { postData: { contents } });
  }

  get(action: string): ScriptResponse {
    return this.call('doGet', { parameter: { action } });
  }

  // const do topo do script não vira propriedade do global: só dá pra ler avaliando
  evaluate<T>(expression: string): T {
    return vm.runInContext(expression, this.context) as T;
  }

  tab(name: string): FakeSheet {
    const sheet = this.book.getSheetByName(name);
    if (!sheet) throw new Error(`A aba ${name} ainda não foi criada`);
    return sheet;
  }

  get teams(): FakeSheet {
    return this.tab('Equipes');
  }

  get members(): FakeSheet {
    return this.tab('Integrantes');
  }

  // linha de dados (base 0) lida pelo título da coluna
  row(sheet: FakeSheet, index: number): Row {
    const headers = (sheet.rows[0] ?? []).map(String);
    const values = sheet.data[index] ?? [];
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  }

  // planilha já configurada com equipes e integrantes montados pelo nome da coluna
  seed(teams: Row[], members: Row[] = []): { teams: FakeSheet; members: FakeSheet } {
    const fill = (name: string, headersExpr: string, rows: Row[]) => {
      const headers = this.evaluate<string[]>(headersExpr);
      const sheet = this.book.add(new FakeSheet(name));
      sheet.appendRow([...headers]);
      rows.forEach((row) => sheet.appendRow(headers.map((h) => row[h] ?? '')));
      return sheet;
    };
    this.properties['PLANILHA_VERSAO'] = this.evaluate<string>('SETUP_VERSION');
    return {
      teams: fill('Equipes', 'TEAM_HEADERS', teams),
      members: fill('Integrantes', 'MEMBER_HEADERS', members),
    };
  }

  private call(name: 'doPost' | 'doGet', event: unknown): ScriptResponse {
    const handler = this.context[name] as Handler;
    return JSON.parse(handler(event).getContent()) as ScriptResponse;
  }

  private globals(): Record<string, unknown> {
    const readClock = () => this.now;
    class ScriptDate extends Date {
      constructor(value?: string | number | Date) {
        super(value ?? readClock());
      }

      static override now(): number {
        return readClock();
      }
    }
    const textOutput = (text: string) => {
      const output = { getContent: () => text, setMimeType: () => output };
      return output;
    };
    // regra montada: o que foi pedido + getRanges, que o Setup.gs usa pra achar as regras dele
    const rule = (spec: Record<string, unknown[]>) => ({
      spec,
      getRanges: () => spec['setRanges']?.[0] ?? [],
    });
    return {
      Date: ScriptDate,
      console: {
        error: (...args: unknown[]) => this.errors.push(args),
        warn: () => {},
        log: (...args: unknown[]) => this.logs.push(args),
      },
      ContentService: { MimeType: { JSON: 'application/json' }, createTextOutput: textOutput },
      CacheService: { getScriptCache: () => this.cache },
      LockService: { getScriptLock: () => this.lock },
      PropertiesService: {
        getScriptProperties: () => ({
          getProperty: (key: string) => this.properties[key] ?? null,
          getProperties: () => ({ ...this.properties }),
          setProperty: (key: string, value: string) => {
            this.properties[key] = value;
          },
        }),
      },
      DriveApp: this.drive.api(),
      SpreadsheetApp: {
        BandingTheme: { BLUE: 'BLUE' },
        ProtectionType: { RANGE: 'RANGE', SHEET: 'SHEET' },
        newDataValidation: () => recorder(),
        newConditionalFormatRule: () => recorder(rule),
        getActiveSpreadsheet: () => this.book,
      },
      Utilities: {
        DigestAlgorithm: { SHA_256: 'SHA_256' },
        Charset: { UTF_8: 'UTF_8' },
        computeDigest: (_algorithm: string, text: string) => signedSha256(text),
        getUuid: () => randomUUID(),
        base64Decode: (text: string) => signedBytes(text),
        newBlob: (bytes: number[], contentType: string, name: string): FakeBlob => ({
          bytes,
          contentType,
          name,
        }),
      },
    };
  }
}

export const MEMBER_A = { name: 'Ana Souza', studentId: '2024100123', email: 'ana@exemplo.com' };
export const MEMBER_B = { name: 'Bruno Lima', studentId: '2024100456', email: 'bruno@exemplo.com' };

// corpo que o site manda (AppsScriptRegistrationGateway), já passando em todas as regras
export function registrationBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    action: 'register',
    teamName: 'Bug Busters',
    members: [MEMBER_A, MEMBER_B],
    teamImage: { mimeType: 'image/png', base64: fakeImageBase64('image/png') },
    submittedAt: '2026-10-20T15:00:00.000Z',
    source: 'landing-page',
    consentVersion: '2026-10-v3',
    consentAt: '2026-10-20T15:00:00.000Z',
    honeypot: '',
    elapsedMs: 8000,
    ...overrides,
  };
}

// outra equipe inteira, com nome, e-mails e matrículas que não batem com a do registrationBody
export function otherTeam(i: number, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const member = (n: number) => ({
    name: n === 1 ? 'Alice Moreira' : 'Bento Carvalho',
    studentId: `RA${String(i).padStart(4, '0')}-${n}`,
    email: `p${n}.equipe${i}@exemplo.com`,
  });
  return registrationBody({ teamName: `Equipe ${i}`, members: [member(1), member(2)], ...overrides });
}
