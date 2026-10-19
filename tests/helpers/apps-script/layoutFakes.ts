// dublês do que fica em cima da tabela: filtro e faixas alternadas
import type { FakeRange, FakeSheet } from './sheetFakes';

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
