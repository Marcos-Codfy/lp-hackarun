import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PdfWriter } from './pdf/PdfWriter.ts';
import { MarkdownRenderer } from './pdf/MarkdownRenderer.ts';

interface Manifest {
  title: string;
  subtitle: string;
  repository: string;
  sections: { title: string; items: string[] }[];
}

interface PackageJson {
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;

const formatDate = (date: Date) =>
  date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Araguaina',
  });

const libs = (deps: Record<string, string> = {}) =>
  Object.entries(deps)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, version]) => `${name} ${version.replace(/^[\^~]/, '')}`);

// PDF 1: só nomes (stack, libs, recursos, padrões, conceitos)
export async function buildStackPdf(root: string, outFile: string, date: Date): Promise<void> {
  const manifest = readJson<Manifest>(resolve(root, 'docs/stack-manifest.json'));
  const pkg = readJson<PackageJson>(resolve(root, 'package.json'));
  const pdf = new PdfWriter(outFile, { title: `${manifest.title} · Stack e padrões`, root, date });

  pdf.cover({
    kicker: '// documentação técnica',
    title: 'Stack e padrões',
    subtitle: manifest.subtitle,
    meta: [`Versão ${pkg.version} · atualizado em ${formatDate(date)}`, manifest.repository],
  });

  const [first, ...rest] = manifest.sections;
  if (first) {
    pdf.heading(first.title, 2);
    pdf.chips(first.items);
  }
  pdf.heading('Bibliotecas (produção)', 2);
  pdf.chips(libs(pkg.dependencies));
  pdf.heading('Bibliotecas (desenvolvimento)', 2);
  pdf.chips(libs(pkg.devDependencies));
  for (const section of rest) {
    pdf.heading(section.title, 2);
    pdf.chips(section.items);
  }
  await pdf.finish();
}

// PDF 2: guia do projeto pra quem for assumir (vem do markdown)
export async function buildGuidePdf(root: string, outFile: string, date: Date): Promise<void> {
  const markdown = readFileSync(resolve(root, 'docs/GUIA_DO_PROJETO.md'), 'utf8');
  const pkg = readJson<PackageJson>(resolve(root, 'package.json'));
  const manifest = readJson<Manifest>(resolve(root, 'docs/stack-manifest.json'));
  const pdf = new PdfWriter(outFile, { title: `${manifest.title} · Guia do projeto`, root, date });

  pdf.cover({
    kicker: '// handoff para a equipe',
    title: 'Guia do projeto',
    subtitle: 'Arquitetura, convenções, infraestrutura, inscrições e como contribuir.',
    meta: [`Versão ${pkg.version} · atualizado em ${formatDate(date)}`, manifest.repository],
  });
  // o título "# ..." do markdown já está na capa
  new MarkdownRenderer(pdf).render(markdown.replace(/^# .*\n/, ''));
  await pdf.finish();
}
