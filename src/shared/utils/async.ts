export type Sleep = (ms: number) => Promise<void>;

// espera de verdade (setTimeout); os testes injetam um Sleep que resolve na hora
export const wait: Sleep = (ms) => new Promise<void>((resolve) => setTimeout(resolve, ms));
