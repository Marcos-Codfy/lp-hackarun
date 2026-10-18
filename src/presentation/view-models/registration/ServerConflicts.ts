import type { RegistrationErrors } from '@domain/index';
import { comparableValue, type RegistrationFields } from './RegistrationFields';

interface Conflict {
  path: string;
  value: string;
  message: string;
}

// "já tem inscrição" vem do servidor: o erro fica no campo enquanto o valor for o recusado
// (corrigiu, some; voltou pro mesmo valor, aparece de novo)
export class ServerConflicts {
  private conflicts: Conflict[] = [];

  // soma aos conflitos anteriores: o servidor responde um campo por vez (e-mail, depois WhatsApp...)
  record(errors: RegistrationErrors, fields: RegistrationFields): void {
    const fresh = Object.entries(errors).flatMap(([path, message]): Conflict[] => {
      const value = comparableValue(fields, path);
      return value === null ? [] : [{ path, value, message }];
    });
    this.conflicts = [...this.conflicts.filter((old) => !fresh.some((c) => c.path === old.path)), ...fresh];
  }

  active(fields: RegistrationFields): RegistrationErrors {
    const errors: RegistrationErrors = {};
    for (const { path, value, message } of this.conflicts) {
      if (comparableValue(fields, path) === value) errors[path] = message;
    }
    return errors;
  }
}
