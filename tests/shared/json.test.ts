import { describe, expect, it } from 'vitest';
import { safeJsonForScript } from '@shared/utils/json';

describe('safeJsonForScript', () => {
  it('nenhum "<" cru sai no JSON: texto do conteúdo não fecha o <script>', () => {
    const text = safeJsonForScript({ label: 'Equipe </script><script>alert(1)</script>', note: '<!-- x' });
    expect(text).not.toContain('<');
    expect(text).toContain('\\u003c/script>');
  });

  it('o JSON.parse devolve exatamente o valor original', () => {
    const value = { label: 'a < b </script>', list: [1, '<2>'], nested: { ok: true } };
    expect(JSON.parse(safeJsonForScript(value))).toEqual(value);
  });
});
