import type { RegistrationErrors, RegistrationInput, RegistrationMode } from '@domain/index';
import type { PreparedTeamImageDTO } from '@application/index';

export interface LeaderFields {
  name: string;
  email: string;
  phone: string;
  course: string;
  semester: string;
}

export interface MemberFields {
  // chave estável da linha no DOM (o índice muda quando alguém remove)
  key: number;
  name: string;
  email: string;
  course: string;
}

export interface RegistrationFields {
  mode: RegistrationMode;
  teamName: string;
  // foto/logo já preparada no aparelho (null até a pessoa escolher uma que passe)
  teamImage: PreparedTeamImageDTO | null;
  leader: LeaderFields;
  members: MemberFields[];
  accessibilityNeeds: string;
  acceptedTerms: boolean;
  honeypot: string;
}

export type LeaderKey = keyof LeaderFields;
export type MemberKey = 'name' | 'email' | 'course';
export type TextPath =
  'teamName' | `leader.${LeaderKey}` | `members.${number}.${MemberKey}` | 'accessibilityNeeds' | 'honeypot';

const LEADER_KEYS: readonly LeaderKey[] = ['name', 'email', 'phone', 'course', 'semester'];
const MEMBER_KEYS: readonly MemberKey[] = ['name', 'email', 'course'];

export const emptyMember = (key: number): MemberFields => ({ key, name: '', email: '', course: '' });

export function emptyFields(memberRows: number): RegistrationFields {
  return {
    mode: 'team',
    teamName: '',
    teamImage: null,
    leader: { name: '', email: '', phone: '', course: '', semester: '' },
    members: Array.from({ length: memberRows }, (_, i) => emptyMember(i)),
    accessibilityNeeds: '',
    acceptedTerms: false,
    honeypot: '',
  };
}

// atualização imutável por caminho ("leader.email", "members.1.name")
export function withText(fields: RegistrationFields, path: TextPath, value: string): RegistrationFields {
  const [head, second, third] = path.split('.');
  if (head === 'leader' && LEADER_KEYS.includes(second as LeaderKey)) {
    return { ...fields, leader: { ...fields.leader, [second as LeaderKey]: value } };
  }
  if (head === 'members' && MEMBER_KEYS.includes(third as MemberKey)) {
    const index = Number(second);
    const members = fields.members.map((m, i) => (i === index ? { ...m, [third as MemberKey]: value } : m));
    return { ...fields, members };
  }
  if (head === 'teamName' || head === 'accessibilityNeeds' || head === 'honeypot') {
    return { ...fields, [head]: value };
  }
  return fields;
}

// linhas vazias somem (igual o domínio faz); indexMap[i] = índice da linha original
export function toInput(fields: RegistrationFields): { input: RegistrationInput; indexMap: number[] } {
  const indexMap: number[] = [];
  const members = fields.members.filter((m, i) => {
    const filled = Boolean(m.name.trim() || m.email.trim());
    if (filled) indexMap.push(i);
    return filled;
  });
  return {
    input: {
      mode: fields.mode,
      teamName: fields.teamName,
      teamImage: fields.teamImage && { mimeType: fields.teamImage.mimeType, base64: fields.teamImage.base64 },
      leader: { ...fields.leader },
      members: members.map(({ name, email, course }) => ({ name, email, course })),
      accessibilityNeeds: fields.accessibilityNeeds,
      acceptedTerms: fields.acceptedTerms,
    },
    indexMap,
  };
}

// erro "members.0.email" do domínio aponta pra linha filtrada: volta pro índice real
export function remapErrors(errors: RegistrationErrors, indexMap: number[]): RegistrationErrors {
  const out: RegistrationErrors = {};
  for (const [path, message] of Object.entries(errors)) {
    const match = /^members\.(\d+)\.(.+)$/.exec(path);
    const original = match ? indexMap[Number(match[1])] : undefined;
    out[match && original !== undefined ? `members.${original}.${match[2]}` : path] = message;
  }
  return out;
}

// ordem visual dos campos: define o primeiro inválido e a ordem do resumo de erros
export function fieldOrder(fields: RegistrationFields): string[] {
  const rows =
    fields.mode === 'team'
      ? fields.members.flatMap((_, i) => MEMBER_KEYS.map((k) => `members.${i}.${k}`))
      : [];
  return [
    ...(fields.mode === 'team' ? ['teamName', 'teamImage'] : []),
    ...LEADER_KEYS.map((k) => `leader.${k}`),
    ...rows,
    ...(fields.mode === 'team' ? ['members'] : []),
    'accessibilityNeeds',
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
