// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { MentorRegistration, ProfileLink, cleanDays, type MentorInput } from '@domain/index';
import { mentorInput } from '../helpers/mentorFixtures';

const errorsOf = (input: MentorInput) => {
  const result = MentorRegistration.create(input);
  return result.ok ? {} : result.error;
};

describe('MentorRegistration', () => {
  it('aceita o cadastro completo de egresso e normaliza os campos', () => {
    const result = MentorRegistration.create(
      mentorInput({
        name: '  Ana   Souza ',
        email: ' Ana.Mentora@Exemplo.COM ',
        whatsapp: '+55 63 99999-0101',
        specialties: '  Pentest,   AWS ',
        days: ['14', '13', '13'],
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.data).toEqual({
      name: 'Ana Souza',
      email: 'ana.mentora@exemplo.com',
      whatsapp: '(63) 99999-0101',
      area: 'security',
      areaOther: '',
      specialties: 'Pentest, AWS',
      linkedin: 'https://www.linkedin.com/in/ana-souza',
      graduate: true,
      course: 'Engenharia de Software',
      graduationYear: 2019,
      days: ['13', '14'],
      mayPublish: true,
    });
    expect(result.value.email).toBe('ana.mentora@exemplo.com');
  });

  it('o resultado é imutável', () => {
    const result = MentorRegistration.create(mentorInput());
    expect(result.ok && Object.isFrozen(result.value.data)).toBe(true);
  });

  it('quem não é egresso não precisa de curso nem de ano, e o que veio nesses campos sai vazio', () => {
    const result = MentorRegistration.create(
      mentorInput({ graduate: 'no', course: '<b>', graduationYear: 'abc' }),
    );
    expect(result.ok && result.value.data).toMatchObject({ graduate: false, course: '', graduationYear: 0 });
  });

  it('campos opcionais vazios saem vazios', () => {
    const result = MentorRegistration.create(
      mentorInput({ specialties: ' ', linkedin: '', mayPublish: false }),
    );
    expect(result.ok && result.value.data).toMatchObject({
      specialties: '',
      linkedin: '',
      mayPublish: false,
    });
  });

  it('área "outra" exige que a pessoa escreva qual é; o texto sai limpo', () => {
    const ok = MentorRegistration.create(
      mentorInput({ area: 'other', areaOther: '  Computação   quântica ' }),
    );
    expect(ok.ok && ok.value.data).toMatchObject({ area: 'other', areaOther: 'Computação quântica' });
    expect(errorsOf(mentorInput({ area: 'other', areaOther: '  ' }))['areaOther']).toBe(
      'Escreva qual é a sua área de atuação.',
    );
    expect(Object.keys(errorsOf(mentorInput({ area: 'other', areaOther: 'X' })))).toEqual(['areaOther']);
    expect(Object.keys(errorsOf(mentorInput({ area: 'other', areaOther: 'x'.repeat(61) })))).toEqual([
      'areaOther',
    ]);
    expect(Object.keys(errorsOf(mentorInput({ area: 'other', areaOther: 'dev <script>' })))).toEqual([
      'areaOther',
    ]);
  });

  it('nas outras áreas o "qual área" não conta: o que sobrou no campo escondido sai vazio', () => {
    const result = MentorRegistration.create(mentorInput({ area: 'design', areaOther: '<b>' }));
    expect(result.ok && result.value.data).toMatchObject({ area: 'design', areaOther: '' });
  });

  it.each([
    ['nome sem sobrenome', { name: 'Ana' }, 'name'],
    ['e-mail torto', { email: 'ana@exemplo' }, 'email'],
    ['WhatsApp torto', { whatsapp: '1234' }, 'whatsapp'],
    ['sem área', { area: '' as const }, 'area'],
    ['especialidades longas demais', { specialties: 'x'.repeat(121) }, 'specialties'],
    ['LinkedIn que não é endereço', { linkedin: 'meu perfil' }, 'linkedin'],
    ['sem resposta de egresso', { graduate: '' as const }, 'graduate'],
    ['egresso sem curso', { course: '' }, 'course'],
    ['egresso com curso curto', { course: 'TI' }, 'course'],
    ['egresso sem ano', { graduationYear: '' }, 'graduationYear'],
    ['ano antes do intervalo', { graduationYear: '1990' }, 'graduationYear'],
    ['ano depois do intervalo', { graduationYear: '2031' }, 'graduationYear'],
    ['ano quebrado', { graduationYear: '2019.5' }, 'graduationYear'],
    ['nenhum dia', { days: [] }, 'days'],
    ['só dia que não existe', { days: ['10', 'sexta'] }, 'days'],
    ['só "a combinar" (não existe mais)', { days: ['tbd'] }, 'days'],
    ['sem aceite', { acceptedTerms: false }, 'acceptedTerms'],
  ])('recusa: %s', (_case, overrides, field) => {
    const errors = errorsOf(mentorInput(overrides));
    expect(Object.keys(errors)).toContain(field);
  });

  it('junta todos os erros de uma vez, na chave de cada campo', () => {
    const errors = errorsOf(mentorInput({ name: '', email: '', area: '', days: [], acceptedTerms: false }));
    expect(Object.keys(errors).sort()).toEqual(['acceptedTerms', 'area', 'days', 'email', 'name']);
  });

  it('aceita endereço sem https e com http (vira https)', () => {
    const bare = MentorRegistration.create(mentorInput({ linkedin: 'linkedin.com/in/ana' }));
    const plain = MentorRegistration.create(mentorInput({ linkedin: 'http://github.com/ana' }));
    expect(bare.ok && bare.value.data.linkedin).toBe('https://linkedin.com/in/ana');
    expect(plain.ok && plain.value.data.linkedin).toBe('https://github.com/ana');
  });
});

describe('cleanDays', () => {
  it('ordem do evento, sem repetir e sem opção inexistente', () => {
    expect(cleanDays(['14', '12', '14', '11', 'tbd', 'x', '13'])).toEqual(['12', '13', '14']);
    expect(cleanDays([])).toEqual([]);
  });
});

describe('ProfileLink', () => {
  it.each([
    ['https://www.linkedin.com/in/ana-souza', 'https://www.linkedin.com/in/ana-souza'],
    ['linkedin.com/in/ana', 'https://linkedin.com/in/ana'],
    ['  http://exemplo.com.br/perfil?x=1#topo ', 'https://exemplo.com.br/perfil?x=1#topo'],
    ['https://ana.dev', 'https://ana.dev'],
  ])('aceita %s', (raw, expected) => {
    const result = ProfileLink.create(raw);
    expect(result.ok && result.value.value).toBe(expected);
  });

  it.each([
    'meu perfil',
    'https://localhost',
    'https://exemplo',
    'javascript:alert(1)',
    'https://exemplo.com/a b',
    'https://exemplo.com/<script>',
    `https://exemplo.com/${'a'.repeat(200)}`,
    '',
  ])('recusa "%s"', (raw) => {
    expect(ProfileLink.create(raw).ok).toBe(false);
  });

  it('normalize deixa o vazio vazio (campo opcional)', () => {
    expect(ProfileLink.normalize('   ')).toBe('');
  });
});
