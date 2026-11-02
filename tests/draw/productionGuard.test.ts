// @vitest-environment node
// o sorteio das equipes é ferramenta da organização: nada dele pode ir parar no site público
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

describe('o sorteio fica fora do site público', () => {
  it('as rotas só entram por uma integração que o astro.config.mjs liga com SORTEIO=1', () => {
    const config = read('astro.config.mjs');
    expect(config).toMatch(/process\.env\.SORTEIO === '1'/);
    // a integração entra no array só dentro desse teste; sem a variável a lista é vazia
    expect(config).toMatch(/\.\.\.draw/);
    expect(config).not.toMatch(/integrations:\s*\[[^\]]*sorteio\(/);
  });

  it('nenhuma página de src/pages (as do build de produção) importa o código do sorteio', () => {
    for (const file of walk(join(ROOT, 'src/pages'))) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(
        /presentation\/draw|composition\/draw|views\/draw|__sorteio|tools\/sorteio/,
      );
    }
  });

  it('o site público não importa o código do sorteio (nem o composition dele)', () => {
    const forbidden =
      /composition\/draw|views\/draw\/|view-models\/draw\/|infrastructure\/draw\/|application\/draw\//;
    const publicFiles = walk(join(ROOT, 'src')).filter(
      (f) =>
        /\.(ts|astro)$/.test(f) &&
        !/[\\/](draw)[\\/]/.test(f) &&
        !/composition[\\/]draw\.ts$/.test(f) &&
        !/(views|view-models)[\\/]draw[\\/]/.test(f) &&
        !/(application|infrastructure)[\\/]draw[\\/]/.test(f),
    );
    for (const file of publicFiles) expect(readFileSync(file, 'utf8'), file).not.toMatch(forbidden);
  });

  it('a API local só responde em modo de desenvolvimento (apply: serve) e só a cópia local grava', () => {
    const integration = read('tools/sorteio/integration.mjs');
    expect(integration).toMatch(/apply: 'serve'/);
    expect(integration).toMatch(/config\.mode !== 'local'/);
  });

  it('o servidor do sorteio só escuta o próprio computador', () => {
    expect(read('tools/sorteio/run.mjs')).toMatch(/'--host', '127\.0\.0\.1'/);
  });

  it('o build de produção que já existe em dist/ (se houver) não tem as telas do sorteio', () => {
    const dist = join(ROOT, 'dist');
    if (!existsSync(dist)) return;
    const files = walk(dist);
    expect(files.filter((f) => /sorteio/i.test(f))).toEqual([]);
    for (const file of files.filter((f) => /\.(html|js|css)$/.test(f))) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/__sorteio|Sorteio das equipes|draw-names/);
    }
  });

  it('a cópia de teste da planilha (dados pessoais) está no .gitignore', () => {
    expect(read('.gitignore')).toMatch(/^\.local\/$/m);
  });
});

describe('"Recomeçar teste" não existe com a planilha real', () => {
  it('o serviço só oferece o reset com a cópia local', async () => {
    const { createDrawServices } = await import('@composition/draw');
    expect(createDrawServices({ mode: 'local', label: 'x' }).resetTest).toBeTypeOf('function');
    expect(
      createDrawServices({ mode: 'sheet', endpoint: 'https://example.com', token: 't', label: 'x' })
        .resetTest,
    ).toBeNull();
  });
});

describe('planilha real: grava sozinho e sem botões de teste', () => {
  it('na planilha real o sorteio salva automático; no teste o botão "Salvar" continua', async () => {
    const { createDrawServices } = await import('@composition/draw');
    const real = createDrawServices({
      mode: 'sheet',
      endpoint: 'https://example.com',
      token: 't',
      label: 'x',
    });
    const test = createDrawServices({ mode: 'local', label: 'x' });
    expect(real.autoSave).toBe(true);
    expect(real.resetTestNames).toBeNull();
    expect(test.autoSave).toBe(false);
    expect(test.resetTestNames).toBeTypeOf('function');
  });
});
