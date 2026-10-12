// textos dos cards de equipe: o HTML do build (Astro) e a lista ao vivo (TeamsView) usam os mesmos

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const memberCountLabel = (count: number): string =>
  `${count} ${plural(count, 'integrante', 'integrantes')}`;

export const confirmedLabel = (count: number): string =>
  plural(count, 'equipe confirmada', 'equipes confirmadas');

export const foundLabel = (count: number): string =>
  `${count} ${plural(count, 'equipe encontrada', 'equipes encontradas')}`;

export const teamImageAlt = (name: string): string => `Foto ou logo da equipe ${name}`;

// placeholder sem foto: iniciais das duas primeiras palavras ("Bug Busters" -> "BB", "404" -> "40")
export function teamInitials(name: string): string {
  const words = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  const first = words[0] ?? '';
  const second = words[1];
  const initials = second ? `${first.charAt(0)}${second.charAt(0)}` : first.slice(0, 2);
  return initials.toUpperCase() || '?';
}
