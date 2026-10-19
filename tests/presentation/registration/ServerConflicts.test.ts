import { describe, expect, it } from 'vitest';
import {
  emptyFields,
  withValue,
  type FieldPath,
} from '@presentation/view-models/registration/RegistrationFields';
import { ServerConflicts } from '@presentation/view-models/registration/ServerConflicts';

const fields = (patch: Partial<Record<FieldPath, string>>) =>
  Object.entries(patch).reduce((f, [path, value]) => withValue(f, path as FieldPath, value), emptyFields());

describe('ServerConflicts', () => {
  it('o erro vale enquanto o valor for o recusado (sem caixa nem espaço sobrando)', () => {
    const conflicts = new ServerConflicts();
    conflicts.record({ email: 'Esse e-mail já tem uma inscrição.' }, fields({ email: 'ana@exemplo.com' }));
    expect(conflicts.active(fields({ email: ' ANA@exemplo.com ' }))).toEqual({
      email: 'Esse e-mail já tem uma inscrição.',
    });
    expect(conflicts.active(fields({ email: 'outra@exemplo.com' }))).toEqual({});
  });

  it('WhatsApp compara só os dígitos (com ou sem o 55)', () => {
    const conflicts = new ServerConflicts();
    conflicts.record({ whatsapp: 'repetido' }, fields({ whatsapp: '(63) 99999-1234' }));
    expect(conflicts.active(fields({ whatsapp: '+55 63 999991234' }))).toEqual({ whatsapp: 'repetido' });
    expect(conflicts.active(fields({ whatsapp: '(63) 99999-0000' }))).toEqual({});
  });

  it('soma os conflitos de respostas diferentes e o mais novo do mesmo campo ganha', () => {
    const conflicts = new ServerConflicts();
    const current = fields({ email: 'ana@exemplo.com', studentId: '2024100123' });
    conflicts.record({ email: 'antigo' }, current);
    conflicts.record({ studentId: 'matrícula' }, current);
    conflicts.record({ email: 'novo' }, current);
    expect(conflicts.active(current)).toEqual({ email: 'novo', studentId: 'matrícula' });
  });

  it('caminho que não é campo do formulário é ignorado', () => {
    const conflicts = new ServerConflicts();
    conflicts.record({ 'members.0.email': 'x' }, emptyFields());
    expect(conflicts.active(emptyFields())).toEqual({});
  });
});
