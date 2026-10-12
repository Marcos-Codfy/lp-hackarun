// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SCRIPT_FILES } from '../../helpers/apps-script/sandbox';

const DIR = new URL('../../../apps-script/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('appsscript.json', DIR), 'utf8')) as {
  timeZone: string;
  runtimeVersion: string;
  exceptionLogging: string;
  oauthScopes: string[];
  webapp: { executeAs: string; access: string };
};
const code = SCRIPT_FILES.map((file) => readFileSync(new URL(file, DIR), 'utf8')).join('\n');

// serviço do Google -> escopo que ele exige (só os que o projeto pode vir a usar)
const SCOPES: [RegExp, string][] = [
  [/SpreadsheetApp\./, 'https://www.googleapis.com/auth/spreadsheets.currentonly'],
  [/DriveApp\./, 'https://www.googleapis.com/auth/drive'],
  [/UrlFetchApp\./, 'https://www.googleapis.com/auth/script.external_request'],
  [/(MailApp|GmailApp)\./, 'https://www.googleapis.com/auth/script.send_mail'],
  [/\.getUi\(/, 'https://www.googleapis.com/auth/script.container.ui'],
];

describe('Apps Script · manifesto (appsscript.json)', () => {
  it('fuso de Palmas, V8, log no Cloud e Web App público rodando como quem publica', () => {
    expect(manifest).toMatchObject({
      timeZone: 'America/Araguaina',
      runtimeVersion: 'V8',
      exceptionLogging: 'STACKDRIVER',
      webapp: { executeAs: 'USER_DEPLOYING', access: 'ANYONE_ANONYMOUS' },
    });
  });

  it('pede exatamente os escopos dos serviços que o código usa (nem um a mais)', () => {
    const needed = SCOPES.filter(([usage]) => usage.test(code)).map(([, scope]) => scope);
    expect([...manifest.oauthScopes].sort()).toEqual(needed.sort());
    // a planilha é só a do próprio script, nunca todas as do Drive
    expect(manifest.oauthScopes).not.toContain('https://www.googleapis.com/auth/spreadsheets');
  });

  it('o sandbox dos testes roda todos os .gs da pasta (nenhum arquivo esquecido)', () => {
    const files = readdirSync(DIR).filter((f) => f.endsWith('.gs'));
    expect([...SCRIPT_FILES].sort()).toEqual(files.sort());
  });
});
