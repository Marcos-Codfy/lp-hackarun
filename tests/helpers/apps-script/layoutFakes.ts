// dublês do que fica em cima da tabela (filtro e faixas) e da inserção de coluna da aba
import type { Cell, FakeRange, FakeSheet } from './sheetFakes';

export class FakeFilter {
  constructor(
    readonly sheet: FakeSheet,
    readonly range: FakeRange,
  ) {}

  get a1(): string {
    return this.range.getA1Notation();
  }

  getRange = () => this.range;

  // tirar o filtro não apaga dado (só os critérios aplicados)
  remove(): void {
    if (this.sheet.filter === this) this.sheet.filter = null;
  }
}

export class FakeBanding {
  readonly colors: Record<string, string> = {};

  constructor(
    public range: FakeRange,
    readonly args: unknown[],
  ) {}

  get a1(): string {
    return this.range.getA1Notation();
  }

  getRange = () => this.range;
  setRange = (range: FakeRange) => ((this.range = range), this);
  setHeaderRowColor = (color: string) => ((this.colors['header'] = color), this);
  setFirstRowColor = (color: string) => ((this.colors['first'] = color), this);
  setSecondRowColor = (color: string) => ((this.colors['second'] = color), this);
}

// insertColumnAfter: valores e fórmulas à direita de `after` andam uma coluna. Pior caso de propósito: filtro,
// faixas, proteções, menus e regras de cor ficam onde estavam e o texto das fórmulas não muda. Quem conserta
// tudo isso é o configurarPlanilha
export function insertColumn(sheet: FakeSheet, after: number): void {
  sheet.insertedAfter.push(after);
  sheet.rows.forEach((line: Cell[]) => {
    if (line.length > after) line.splice(after, 0, '');
  });
  const moved = [...sheet.formulas].map(([key, formula]) => {
    const [row, col] = key.split(',').map(Number) as [number, number];
    return [col > after ? `${row},${col + 1}` : key, formula] as const;
  });
  sheet.formulas.clear();
  moved.forEach(([key, formula]) => sheet.formulas.set(key, formula));
}
