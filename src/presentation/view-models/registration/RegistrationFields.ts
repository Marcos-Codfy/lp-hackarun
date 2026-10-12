import type { MemberField, RegistrationInput } from '@domain/index';
import type { PreparedTeamImageDTO } from '@application/index';

export type MemberKey = MemberField;

export interface MemberFields {
  // chave estável da linha no DOM (o índice muda quando alguém remove)
  key: number;
  name: string;
  studentId: string;
  email: string;
}

export interface RegistrationFields {
  teamName: string;
  // foto/logo já preparada no aparelho (null até a pessoa escolher uma que passe)
  teamImage: PreparedTeamImageDTO | null;
  // o integrante 1 é o contato da equipe
  members: MemberFields[];
  acceptedTerms: boolean;
  honeypot: string;
}

export type TextPath = 'teamName' | `members.${number}.${MemberKey}` | 'honeypot';

export const MEMBER_KEYS: readonly MemberKey[] = ['name', 'studentId', 'email'];

export const emptyMember = (key: number): MemberFields => ({ key, name: '', studentId: '', email: '' });

export function emptyFields(memberRows: number): RegistrationFields {
  return {
    teamName: '',
    teamImage: null,
    members: Array.from({ length: memberRows }, (_, i) => emptyMember(i)),
    acceptedTerms: false,
    honeypot: '',
  };
}

const MEMBER_PATH = /^members\.(\d+)\.(name|studentId|email)$/;

// atualização imutável por caminho ("teamName", "members.1.email")
export function withText(fields: RegistrationFields, path: TextPath, value: string): RegistrationFields {
  const member = MEMBER_PATH.exec(path);
  if (member) {
    const index = Number(member[1]);
    const key = member[2] as MemberKey;
    return { ...fields, members: fields.members.map((m, i) => (i === index ? { ...m, [key]: value } : m)) };
  }
  if (path === 'teamName' || path === 'honeypot') return { ...fields, [path]: value };
  return fields;
}

// valor atual de um campo de texto (as conferências do servidor comparam com ele)
export function textAt(fields: RegistrationFields, path: string): string | null {
  const member = MEMBER_PATH.exec(path);
  if (member) return fields.members[Number(member[1])]?.[member[2] as MemberKey] ?? null;
  return path === 'teamName' ? fields.teamName : null;
}

export function toInput(fields: RegistrationFields): RegistrationInput {
  return {
    teamName: fields.teamName,
    teamImage: fields.teamImage && { mimeType: fields.teamImage.mimeType, base64: fields.teamImage.base64 },
    members: fields.members.map(({ name, studentId, email }) => ({ name, studentId, email })),
    acceptedTerms: fields.acceptedTerms,
  };
}

// ordem visual dos campos: define o primeiro inválido e a ordem do resumo de erros
export function fieldOrder(fields: RegistrationFields): string[] {
  return [
    'teamName',
    'teamImage',
    ...fields.members.flatMap((_, i) => MEMBER_KEYS.map((k) => `members.${i}.${k}`)),
    'members',
    'acceptedTerms',
  ];
}

// remover a linha i desloca os caminhos das linhas de baixo
export function shiftMemberPath(path: string, removed: number): string | null {
  const match = /^members\.(\d+)\.(.+)$/.exec(path);
  if (!match) return path;
  const index = Number(match[1]);
  if (index === removed) return null;
  return index > removed ? `members.${index - 1}.${match[2]}` : path;
}
