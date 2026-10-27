// corpos de POST do cadastro de mentor, prontos pra mexer campo a campo (o site manda { action: 'register-mentor', ... })

// o mentor que o site manda (MentorData): egresso de Engenharia de Software, passando em todas as regras
export const MENTOR_ANA = {
  name: 'Ana Souza',
  email: 'ana.mentora@exemplo.com',
  whatsapp: '(63) 99999-0101',
  area: 'security',
  specialties: 'Pentest, AWS',
  role: 'Analista de segurança',
  company: 'Empresa Exemplo',
  experience: '5-to-10',
  linkedin: 'https://www.linkedin.com/in/ana-souza',
  graduate: true,
  course: 'Engenharia de Software',
  graduationYear: 2019,
  days: ['13', '14'],
  format: 'in-person',
  mode: 'either',
  notes: 'Prefiro atender à noite.',
  mayPublish: true,
};

export function mentorBody(
  mentor: Record<string, unknown> = {},
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    action: 'register-mentor',
    mentor: { ...MENTOR_ANA, ...mentor },
    submittedAt: '2026-10-27T15:00:00.000Z',
    source: 'mentor-page',
    consentVersion: '2026-10-m1',
    consentAt: '2026-10-27T15:00:00.000Z',
    honeypot: '',
    elapsedMs: 8000,
    ...overrides,
  };
}

// outra pessoa inteira: e-mail e WhatsApp que não batem com os da Ana nem com os de outro `i`
export function otherMentor(i: number, mentor: Record<string, unknown> = {}): Record<string, unknown> {
  const n = String(i).padStart(4, '0');
  return mentorBody(
    {
      name: 'Bruno Lima',
      email: `mentor${i}@exemplo.com`,
      whatsapp: `(63) 9${n}-${n}`,
      ...mentor,
    },
    // cada formulário tem a própria chave (o site sempre manda uma)
    { idempotencyKey: `00000000-0000-4000-9000-${String(i).padStart(12, '0')}` },
  );
}
