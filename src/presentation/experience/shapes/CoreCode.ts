// código guardado no raio do globo: o CoreShape escreve e o core.glsl decodifica (o material lê daqui
// pra não puxar a estratégia inteira pro chunk principal; ela roda no worker)

// faixa do raio que guarda o código da fita (core.glsl decodifica e recalcula a casca)
export const CORE_CODE_SPAN = 0.25;
// código = fita * 16 + linha na largura (0..15) + posição ao longo do arco (fração)
export const CORE_CODE_LEVELS = 1024;
export const CORE_VEIL_RIBBON = 63;
