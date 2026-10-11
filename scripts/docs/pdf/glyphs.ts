// troca caracteres sem glifo nas fontes do PDF por equivalentes legíveis (senão viram caixinha ou lixo)

// nenhuma das fontes tem estes: nem Montserrat/JetBrains Mono (subset latin) nem Helvetica (WinAnsi)
const COMMON: Readonly<Record<string, string>> = {
  '→': '->',
  '←': '<-',
  '↔': '<->',
  '⇒': '=>',
  '≥': '>=',
  '≤': '<=',
  '≠': '!=',
  '≈': '~',
  '−': '-',
  '✓': 'ok',
  '✗': 'x',
  '☐': '[ ]',
  '☑': '[x]',
  '├': '+',
  '└': '+',
  '┌': '+',
  '│': '|',
  '─': '-',
};

// a Orbitron (títulos) também não tem estes
const DISPLAY: Readonly<Record<string, string>> = {
  '·': '•',
  '±': '+/-',
  º: 'o',
  ª: 'a',
  '′': "'",
  '↑': '^',
  '↓': 'v',
};

// a Helvetica padrão só cobre WinAnsi: setas que a Montserrat tem aqui não existem
const WINANSI: Readonly<Record<string, string>> = { '↑': '^', '↓': 'v', '′': "'" };

// emoji e pictogramas: nenhuma fonte do PDF desenha
const PICTOGRAPHS = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]|\u{FE0F}/gu;

export type FontRole = 'display' | 'text';

export class GlyphFallback {
  private readonly table: Readonly<Record<string, string>>;
  private readonly pattern: RegExp;

  constructor(role: FontRole, brand: boolean) {
    this.table = { ...COMMON, ...(brand ? {} : WINANSI), ...(role === 'display' ? DISPLAY : {}) };
    const chars = Object.keys(this.table).map((c) => c.replace(/[\\^\]-]/g, '\\$&'));
    this.pattern = new RegExp(`[${chars.join('')}]`, 'gu');
  }

  apply(text: string): string {
    return text.replace(this.pattern, (c) => this.table[c] ?? c).replace(PICTOGRAPHS, '');
  }
}
