// mini currículo: quebra o parágrafo em texto e links no formato [texto](https://...).
// Só aceita http(s), então nada de javascript: ou link relativo escapando do conteúdo
export type BioPart = { text: string; href?: undefined } | { text: string; href: string };

const LINK = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

export function bioParts(paragraph: string): BioPart[] {
  const parts: BioPart[] = [];
  let last = 0;
  for (const match of paragraph.matchAll(LINK)) {
    const [whole, text = '', href = ''] = match;
    const start = match.index ?? 0;
    if (start > last) parts.push({ text: paragraph.slice(last, start) });
    parts.push({ text: text.trim(), href });
    last = start + whole.length;
  }
  if (last < paragraph.length) parts.push({ text: paragraph.slice(last) });
  return parts;
}
