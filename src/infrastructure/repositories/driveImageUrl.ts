// id de arquivo do Drive: só letras, números, _ e - (nada que mude o caminho da URL)
const DRIVE_FILE_ID = /^[A-Za-z0-9_-]{20,}$/;

// a foto pública sai pelo CDN de imagens do Google em 600 px; id torto ou vazio = sem foto (o site mostra as iniciais)
// logo da equipe que ganhou nome no sorteio: a arte do Pokémon que o site já tem (public/pokemon)
export function pokemonImageUrl(id: unknown): string | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 && n < 10000 ? `/pokemon/${n}.webp` : null;
}

export function driveImageUrl(id: unknown): string | null {
  if (typeof id !== 'string' || !DRIVE_FILE_ID.test(id)) return null;
  return `https://lh3.googleusercontent.com/d/${id}=w600`;
}
