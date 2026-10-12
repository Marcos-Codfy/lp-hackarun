import type { FieldError } from '@presentation/view-models/registration/RegistrationFormViewModel';

// resumo de erros por bloco (a equipe, cada integrante): o envio vazio vira 4 linhas curtas em vez de 9
// frases repetidas. O texto exato de cada campo continua embaixo dele
export interface ErrorGroup {
  // nome do bloco ("Equipe", "Integrante 2"); null = erro que não se agrupa (aceite, grupo de integrantes)
  title: string | null;
  // na ordem do formulário: o primeiro é o destino do link
  errors: FieldError[];
  // nome curto de cada campo do bloco ("nome", "matrícula", "e-mail")
  parts: string[];
}

const PART: Record<string, string> = {
  teamName: 'nome',
  teamImage: 'foto ou logo',
  name: 'nome',
  studentId: 'matrícula',
  email: 'e-mail',
};

const MEMBER = /^members\.(\d+)\.(\w+)$/;

function blockOf(path: string): { key: string; title: string | null; part: string } {
  const member = MEMBER.exec(path);
  if (member) {
    const [, index = '0', field = ''] = member;
    return { key: `member-${index}`, title: `Integrante ${Number(index) + 1}`, part: PART[field] ?? field };
  }
  if (path === 'teamName' || path === 'teamImage')
    return { key: 'team', title: 'Equipe', part: PART[path] ?? path };
  return { key: path, title: null, part: path };
}

export function groupErrors(errors: readonly FieldError[]): ErrorGroup[] {
  const groups = new Map<string, ErrorGroup>();
  for (const error of errors) {
    const block = blockOf(error.path);
    const group = groups.get(block.key) ?? { title: block.title, errors: [], parts: [] };
    group.errors.push(error);
    group.parts.push(block.part);
    groups.set(block.key, group);
  }
  return [...groups.values()];
}

// "nome, matrícula e e-mail"
export function joinParts(parts: readonly string[]): string {
  if (parts.length < 2) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1] ?? ''}`;
}
