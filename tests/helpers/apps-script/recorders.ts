// construtores falsos do SpreadsheetApp (validação, formatação condicional, faixas) e proteções

export interface FakeProtection {
  type: 'RANGE' | 'SHEET';
  a1: string;
  description: string;
  warningOnly: boolean;
  getDescription(): string;
  setDescription(text: string): FakeProtection;
  setWarningOnly(value: boolean): FakeProtection;
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

export function protection(type: FakeProtection['type'], a1: string): FakeProtection {
  const p: FakeProtection = {
    type,
    a1,
    description: '',
    warningOnly: false,
    getDescription: () => p.description,
    setDescription: (text) => ((p.description = text), p),
    setWarningOnly: (value) => ((p.warningOnly = value), p),
  };
  return p;
}
