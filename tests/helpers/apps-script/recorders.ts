// construtores falsos do SpreadsheetApp (validação, formatação condicional, faixas) e proteções

// o pedaço do intervalo que a proteção guarda (o FakeRange da aba)
export interface ProtectedRange {
  getA1Notation(): string;
  getLastColumn(): number;
}

export interface FakeProtection {
  type: 'RANGE' | 'SHEET';
  a1: string;
  description: string;
  warningOnly: boolean;
  range: ProtectedRange | null;
  getDescription(): string;
  setDescription(text: string): FakeProtection;
  setWarningOnly(value: boolean): FakeProtection;
  getRange(): ProtectedRange | null;
  setRange(range: ProtectedRange): FakeProtection;
}

// objeto de construtor (validação, formatação condicional, faixas): guarda cada chamada e devolve ele mesmo
export function recorder(onBuild?: (spec: Record<string, unknown[]>) => unknown): Record<string, unknown> {
  const spec: Record<string, unknown[]> = {};
  const api: Record<string, unknown> = new Proxy(
    {},
    {
      get: (_target, prop: string) =>
        prop === 'build'
          ? () => onBuild?.(spec) ?? spec
          : (...args: unknown[]) => {
              spec[prop] = args;
              return api;
            },
    },
  );
  return api;
}

export function protection(
  type: FakeProtection['type'],
  a1: string,
  range: ProtectedRange | null = null,
): FakeProtection {
  const p: FakeProtection = {
    type,
    a1,
    description: '',
    warningOnly: false,
    range,
    getDescription: () => p.description,
    setDescription: (text) => ((p.description = text), p),
    setWarningOnly: (value) => ((p.warningOnly = value), p),
    getRange: () => p.range,
    setRange: (next) => ((p.range = next), (p.a1 = next.getA1Notation()), p),
  };
  return p;
}
