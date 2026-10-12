import type { RegistrationErrors } from '@domain/index';
import { normalizeSearch } from '@shared/utils/text';
import { textAt, type MemberKey, type RegistrationFields } from './RegistrationFields';

interface Conflict {
  // chave estável da linha (remover um integrante muda o índice, não a chave); null = nome da equipe
  memberKey: number | null;
  field: MemberKey | 'teamName';
  value: string;
  message: string;
}

// mesma comparação do servidor: sem acento, sem caixa e sem espaço sobrando
const comparable = (value: string) => normalizeSearch(value).replace(/\s+/g, ' ');

const MEMBER_PATH = /^members\.(\d+)\.(name|studentId|email)$/;

// "já inscrito em outra equipe" vem do servidor: o erro fica no campo enquanto o valor for o recusado
// (corrigiu, some; voltou pro mesmo valor, aparece de novo)
export class ServerConflicts {
  private conflicts: Conflict[] = [];

  // soma aos conflitos anteriores: o servidor responde um tipo por vez (nome, depois e-mail...)
  record(errors: RegistrationErrors, fields: RegistrationFields): void {
    const fresh = Object.entries(errors).flatMap(([path, message]): Conflict[] => {
      const value = textAt(fields, path);
      if (value === null) return [];
      if (path === 'teamName')
        return [{ memberKey: null, field: 'teamName', value: comparable(value), message }];
      const match = MEMBER_PATH.exec(path);
      const member = match ? fields.members[Number(match[1])] : undefined;
      if (!match || !member) return [];
      return [{ memberKey: member.key, field: match[2] as MemberKey, value: comparable(value), message }];
    });
    const same = (a: Conflict, b: Conflict) => a.memberKey === b.memberKey && a.field === b.field;
    this.conflicts = [...this.conflicts.filter((old) => !fresh.some((c) => same(c, old))), ...fresh];
  }

  active(fields: RegistrationFields): RegistrationErrors {
    const errors: RegistrationErrors = {};
    for (const conflict of this.conflicts) {
      const path = this.pathOf(conflict, fields);
      const current = path ? textAt(fields, path) : null;
      if (path && current !== null && comparable(current) === conflict.value) errors[path] = conflict.message;
    }
    return errors;
  }

  private pathOf(conflict: Conflict, fields: RegistrationFields): string | null {
    if (conflict.memberKey === null) return 'teamName';
    const index = fields.members.findIndex((m) => m.key === conflict.memberKey);
    return index < 0 ? null : `members.${index}.${conflict.field}`;
  }
}
