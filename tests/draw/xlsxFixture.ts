import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ExcelJS from 'exceljs';

// uma planilha pequena com as abas e colunas que o sorteio usa (a "cópia local" dos testes)
export interface FixturePerson {
  protocol: string;
  name: string;
  profile: string;
  institution?: string | undefined;
  period?: string | undefined;
  status?: string | undefined;
  team?: string | undefined;
}

export const UNICATOLICA = 'Estuda na UniCatólica';
export const OTHER = 'Estuda em outra instituição';

export async function makeWorkbook(people: readonly FixturePerson[]): Promise<string> {
  const file = join(await mkdtemp(join(tmpdir(), 'sorteio-')), 'planilha.xlsx');
  const book = new ExcelJS.Workbook();
  const inscritos = book.addWorksheet('Inscritos');
  inscritos.addRow(['Protocolo', 'Nome completo', 'Perfil', 'Instituição', 'Período', 'Status', 'Equipe']);
  for (const p of people) {
    inscritos.addRow([
      p.protocol,
      p.name,
      p.profile,
      p.institution ?? '',
      p.period ?? '',
      p.status ?? 'credenciado',
      p.team ?? '',
    ]);
  }
  const equipes = book.addWorksheet('Equipes');
  equipes.addRow(['Equipe', 'Integrantes (qtd)', 'Status']);
  // como na planilha de verdade: as linhas já existem (com fórmulas nas outras colunas) e a coluna A está vazia
  for (let i = 0; i < 60; i++) equipes.addRow([null, `=IF($A${i + 2}="","",1)`, null]);
  await book.xlsx.writeFile(file);
  return file;
}

// n pessoas credenciadas com períodos variados e algumas de outras instituições
export function crowd(count: number): FixturePerson[] {
  return Array.from({ length: count }, (_, i) => {
    const outside = i % 4 === 3;
    return {
      protocol: `HR26-${String(i).padStart(6, '0')}`,
      name: `Pessoa ${String(i).padStart(3, '0')}`,
      profile: outside ? OTHER : UNICATOLICA,
      institution: outside ? ['FASEC', 'ULBRA', 'UFT'][i % 3] : 'UniCatólica',
      period: `${(i % 8) + 1}º`,
    };
  });
}

export async function readSheet(file: string, name: string): Promise<(string | number | null)[][]> {
  const book = new ExcelJS.Workbook();
  await book.xlsx.readFile(file);
  const sheet = book.getWorksheet(name);
  if (!sheet) return [];
  const rows: (string | number | null)[][] = [];
  sheet.eachRow((row) => {
    rows.push(
      Array.from({ length: row.cellCount }, (_, i) => {
        const v = row.getCell(i + 1).value;
        if (v === null || v === undefined) return null;
        if (typeof v === 'object')
          return 'result' in v ? String((v as { result: unknown }).result ?? '') : null;
        return v as string | number;
      }),
    );
  });
  return rows;
}
