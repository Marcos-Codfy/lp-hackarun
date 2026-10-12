// hífen opcional (U+00AD) nas palavras longas, nas divisões silábicas do português: o navegador só quebra ali e
// mostra o "-". O hyphens: auto não serve: Chrome e Brave no Windows não têm dicionário pt-BR e partiam
// "DESENVOLVED / ORES" sem hífen. Regras simplificadas (vogais juntas não se separam, por segurança)
const SOFT_HYPHEN = String.fromCharCode(0xad);
const VOWELS = 'aeiouyáàâãéêíóôõúü';
// pares que não se separam e abrem a sílaba seguinte: pr, bl, tr..., os dígrafos ch, lh, nh e o ph/th dos nomes
// em inglês (hacka-thon)
const ONSET = /^(?:[bcdfgkptv][lr]|[clnpt]h)$/;
// palavra curta quebra inteira na linha de baixo; e nada de sobrar 1 ou 2 letras de um lado ("DE-", "-SE")
const MIN_WORD = 10;
const MIN_SIDE = 3;

function isVowel(word: string, i: number): boolean {
  const ch = word.charAt(i);
  if (!VOWELS.includes(ch)) return false;
  // "qu"/"gu" antes de vogal: o u faz parte da consoante (quei-jo, guer-rei-ro)
  return !(ch === 'u' && 'qg'.includes(word.charAt(i - 1)) && VOWELS.includes(word.charAt(i + 1)));
}

// posições (índices) onde uma sílaba começa, sem contar a primeira
export function syllableBreaks(word: string): number[] {
  // minúscula letra a letra: o índice continua batendo com a palavra original (toLowerCase de "İ" vira 2)
  const w = word
    .split('')
    .map((ch) => ch.toLowerCase().charAt(0))
    .join('');
  const breaks: number[] = [];
  let i = 0;
  while (i < w.length && !isVowel(w, i)) i++;
  while (i < w.length) {
    while (i < w.length && isVowel(w, i)) i++;
    const start = i;
    while (i < w.length && !isVowel(w, i)) i++;
    // consoantes do fim ficam com a última sílaba
    if (i >= w.length) break;
    const run = w.slice(start, i);
    // 1 consoante vai pra sílaba seguinte (ca-sa); 2 ou mais: a última (ou o par inseparável) abre a próxima
    if (run.length === 1) breaks.push(start);
    else breaks.push(ONSET.test(run.slice(-2)) ? i - 2 : i - 1);
  }
  return breaks;
}

function hyphenateWord(word: string): string {
  if (word.length < MIN_WORD) return word;
  const cuts = syllableBreaks(word).filter((at) => at >= MIN_SIDE && word.length - at >= MIN_SIDE);
  let out = '';
  let from = 0;
  for (const at of cuts) {
    out += word.slice(from, at) + SOFT_HYPHEN;
    from = at;
  }
  return out + word.slice(from);
}

// só as sequências de letras ganham hífen; espaço, número e pontuação ficam como estão
export function softHyphenate(text: string): string {
  return text.replace(/\p{L}+/gu, hyphenateWord);
}
