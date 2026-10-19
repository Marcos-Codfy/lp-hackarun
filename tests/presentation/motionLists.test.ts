// os loops infinitos do CSS: as duas listas de pausa (WCAG e fora da tela) andam juntas, e nenhum loop anima
// propriedade que force repintura (box-shadow, width...): só o que o compositor faz sozinho
// @vitest-environment node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('../../src/', import.meta.url));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const files = walk(SRC).filter((f) => /\.(astro|css)$/.test(f));
const text = files.map((f) => readFileSync(f, 'utf8')).join('\n');

// seletores de uma regra de pausa, sem a classe que ativa
function pauseSelectors(file: string, activator: string): string[] {
  const css = readFileSync(join(SRC, 'presentation/styles', file), 'utf8');
  const items = [...css.matchAll(/(?<![\w.])\.[a-z][\w-]*(?: i)?(?:::(?:before|after))?/g)].map((m) => m[0]);
  return [...new Set(items.filter((s) => s !== activator))].sort();
}

describe('listas de pausa dos loops de CSS', () => {
  it('a de fora da tela cobre os mesmos loops da de "Pausar animações" (menos a aurora)', () => {
    const wcag = pauseSelectors('motion-pause.css', '.is-motion-paused');
    const offscreen = pauseSelectors('offscreen-motion.css', '.is-offscreen');
    // a aurora é do fundo da página e está sempre na tela: só ela fica fora da lista de seções
    expect(offscreen).toEqual(wcag.filter((selector) => selector !== '.aurora__blob'));
    expect(wcag).toContain('.sponsor__sweep');
    expect(wcag).toContain('.countdown__pulse::after');
  });
});

describe('loops infinitos', () => {
  // transform e opacity (e o que deriva deles) rodam no compositor; o resto repinta a página a cada quadro
  const COMPOSITOR = new Set(['transform', 'opacity', 'translate', 'scale', 'rotate', 'filter']);
  const names = [...text.matchAll(/animation:\s*([\w-]+)[^;{}]*\binfinite\b/g)].map((m) => m[1] as string);

  function keyframeProperties(name: string): string[] {
    const start = text.search(new RegExp(String.raw`@keyframes\s+${name}\s*\{`));
    if (start < 0) return [];
    let depth = 0;
    let i = text.indexOf('{', start);
    const from = i;
    for (; i < text.length; i++) {
      if (text[i] === '{') depth++;
      if (text[i] === '}' && --depth === 0) break;
    }
    const body = text.slice(from + 1, i);
    return [...new Set([...body.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1] as string))];
  }

  it('o teste enxerga os loops conhecidos (não passa por não achar nada)', () => {
    expect(names).toEqual(expect.arrayContaining(['cd-pulse', 'cd-pulse-ring', 'tape-run', 'sponsor-sweep']));
  });

  it.each([...new Set(names)])('%s só anima propriedades do compositor', (name) => {
    const props = keyframeProperties(name);
    expect(props.length).toBeGreaterThan(0);
    expect(props.filter((p) => !COMPOSITOR.has(p))).toEqual([]);
  });
});
