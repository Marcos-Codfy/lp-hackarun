import type { ParticipantProfile } from '../value-objects/ParticipantProfile';

// de onde a pessoa vem, para espalhar quem é de fora da UniCatólica pelas equipes. O texto da planilha é livre
// ("FASEC", "Fasec", "CEULP ULBRA"): aqui ele vira uma chave estável para comparar
export interface InstitutionGroup {
  key: string;
  label: string;
  // fora da UniCatólica (a regra do sorteio espalha esses entre as equipes)
  external: boolean;
}

export const UNICATOLICA: InstitutionGroup = { key: 'unicatolica', label: 'UniCatólica', external: false };
// formado ou autodidata sem instituição informada: não vem "de outra instituição", então não entra na regra de espalhar
const NO_INSTITUTION: InstitutionGroup = {
  key: 'sem-instituicao',
  label: 'Sem instituição',
  external: false,
};

// nomes que significam a mesma instituição (comparados sem acento, em minúsculas, como pedaço do texto)
const ALIASES: readonly { key: string; label: string; match: readonly string[] }[] = [
  { key: 'fasec', label: 'FASEC', match: ['fasec'] },
  { key: 'ulbra', label: 'ULBRA', match: ['ulbra', 'ceulp'] },
  { key: 'unitins', label: 'UNITINS', match: ['unitins', 'estadual do tocantins'] },
  { key: 'ifto', label: 'IFTO', match: ['ifto', 'instituto federal'] },
  { key: 'uft', label: 'UFT', match: ['uft', 'universidade federal do tocantins'] },
  { key: 'serra-do-carmo', label: 'Serra do Carmo', match: ['serra do carmo'] },
];

export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function institutionOf(profile: ParticipantProfile | null, rawName: string): InstitutionGroup {
  if (profile === 'unicatolica') return UNICATOLICA;
  const name = normalizeText(rawName);
  if (!name && profile !== 'other-institution') return NO_INSTITUTION;
  if (name.includes('unicatolica') || name.includes('catolica do tocantins')) return UNICATOLICA;
  const known = ALIASES.find((alias) => alias.match.some((piece) => name.includes(piece)));
  if (known) return { key: known.key, label: known.label, external: true };
  // instituição que não está na lista (ou sem nome): de fora, cada texto diferente é uma instituição
  return {
    key: name ? `outra:${name}` : 'outra',
    label: rawName.trim() || 'Outra instituição',
    external: true,
  };
}
