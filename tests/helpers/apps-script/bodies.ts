// corpos de POST que o site manda pro Web App, prontos pra mexer campo a campo

// o participant que o site manda (ParticipantData): aluna da UniCatólica, já passando em todas as regras
export const ANA = {
  name: 'Ana Souza',
  email: 'ana@exemplo.com',
  whatsapp: '(63) 99999-0001',
  profile: 'unicatolica',
  institution: 'UniCatólica',
  course: 'Engenharia de Software',
  period: 3,
  studentId: '2024100123',
  area: '',
  adult: true,
};

export const KEY = '3f0c9a52-6d1e-4b7a-9c3e-2a5b8d7e1f40';
export const OTHER_KEY = '9b1d2c3e-0000-4a4a-8b8b-123456789abc';

// corpo que o site manda (AppsScriptRegistrationGateway); `participant` é mesclado no da Ana
export function registrationBody(
  participant: Record<string, unknown> = {},
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    action: 'register',
    participant: { ...ANA, ...participant },
    submittedAt: '2026-10-20T15:00:00.000Z',
    source: 'landing-page',
    consentVersion: '2026-10-v4',
    consentAt: '2026-10-20T15:00:00.000Z',
    honeypot: '',
    elapsedMs: 8000,
    ...overrides,
  };
}

// outra pessoa inteira: e-mail, WhatsApp e matrícula que não batem com os da Ana nem com os de outro `i`
export function person(i: number, participant: Record<string, unknown> = {}): Record<string, unknown> {
  const n = String(i).padStart(4, '0');
  return registrationBody(
    {
      name: 'Bruno Lima',
      email: `pessoa${i}@exemplo.com`,
      whatsapp: `(63) 9${n}-${n}`,
      studentId: `RA-${n}`,
      ...participant,
    },
    // cada formulário tem a própria chave (o site sempre manda uma)
    { idempotencyKey: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}` },
  );
}
