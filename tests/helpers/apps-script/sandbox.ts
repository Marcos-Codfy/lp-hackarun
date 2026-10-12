import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { FakeCache, FakeLock, FakeSheet, signedSha256, type Cell } from './fakes';
import { FakeDrive, signedBytes, type FakeBlob } from './driveFakes';
import { fakeImageBase64 } from '../images';

const SCRIPT_DIR = new URL('../../../apps-script/', import.meta.url);
// cada arquivo roda como script separado no mesmo contexto, igual ao editor do Apps Script
export const SCRIPT_FILES = ['Code.gs', 'Validation.gs', 'Limits.gs', 'Images.gs'] as const;

export interface ScriptResponse {
  ok: boolean;
  error?: string;
  protocol?: string;
  open?: boolean;
  teams?: Record<string, unknown>[];
}

interface TextOutput {
  getContent(): string;
}

type Handler = (event: unknown) => TextOutput;

// roda os .gs de verdade dentro de um vm do Node, com relógio e serviços do Google falsos
export class AppsScriptSandbox {
  readonly cache = new FakeCache();
  readonly lock = new FakeLock();
  readonly drive = new FakeDrive();
  readonly properties: Record<string, string> = {};
  readonly sheets = new Map<string, FakeSheet>();
  readonly errors: unknown[][] = [];
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

  get sheet(): FakeSheet {
    const sheet = this.sheets.get('Inscricoes');
    if (!sheet) throw new Error('A aba Inscricoes ainda não foi criada');
    return sheet;
  }

  // cria a aba com cabeçalho e linhas montadas pelo nome da coluna
  seed(rows: Record<string, Cell>[]): FakeSheet {
    const headers = this.evaluate<string[]>('HEADERS');
    const sheet = new FakeSheet('Inscricoes');
    sheet.appendRow([...headers]);
    rows.forEach((row) => sheet.appendRow(headers.map((h) => row[h] ?? '')));
    this.sheets.set(sheet.name, sheet);
    return sheet;
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
    const validation = { requireValueInList: () => validation, build: () => ({}) };
    return {
      Date: ScriptDate,
      console: { error: (...args: unknown[]) => this.errors.push(args), warn: () => {}, log: () => {} },
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
        newDataValidation: () => validation,
        getActiveSpreadsheet: () => ({
          getSheetByName: (name: string) => this.sheets.get(name) ?? null,
          insertSheet: (name: string) => {
            const sheet = new FakeSheet(name);
            this.sheets.set(name, sheet);
            return sheet;
          },
        }),
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

// corpo que o site manda (AppsScriptRegistrationGateway), já passando em todas as regras
export function registrationBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    action: 'register',
    mode: 'team',
    teamName: 'Bug Busters',
    leader: {
      name: 'Ana Souza',
      email: 'ana@exemplo.com',
      phone: '(63) 99999-1234',
      course: 'Engenharia de Software',
      semester: '5º período',
    },
    members: [{ name: 'Bruno Lima', email: 'bruno@exemplo.com', course: 'Ciência da Computação' }],
    teamImage: { mimeType: 'image/png', base64: fakeImageBase64('image/png') },
    accessibilityNeeds: '',
    submittedAt: '2026-10-20T15:00:00.000Z',
    source: 'landing-page',
    consentVersion: '2026-10-v2',
    consentAt: '2026-10-20T15:00:00.000Z',
    honeypot: '',
    elapsedMs: 8000,
    ...overrides,
  };
}
