// confere o MentorForm.astro de verdade com o que a View e o VM esperam: cada campo do formulário tem o seu
// data-field, o erro dele e os ganchos do envio, do sucesso e do aviso de encerrado
// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FIELD_ORDER, TEXT_PATHS } from '@presentation/view-models/mentor/MentorFields';
import { MENTOR_ORIGINS } from '@presentation/view-models/mentor/mentorOrigin';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const read = (path: string) => readFileSync(`${ROOT}${path}`, 'utf8');
// o formulário e as etapas dele (cada uma num componente)
const form = ['MentorForm', 'MentorContactStep', 'MentorProfileStep', 'MentorParticipationStep']
  .map((name) => read(`src/presentation/components/mentor/${name}.astro`))
  .join('\n');
const success = read('src/presentation/components/registration/RegistrationSuccess.astro');

describe('MentorForm.astro · contrato com a View', () => {
  it('todo campo da ordem visual existe no formulário, com o caminho certo', () => {
    for (const path of FIELD_ORDER.filter((p) => p !== 'acceptedTerms')) {
      expect(form, path).toMatch(new RegExp(`field="${path}"`));
    }
    expect(form).toContain('field="mayPublish"');
    expect(form).toContain('field="acceptedTerms"');
    expect(form).toContain('data-field="honeypot"');
  });

  it('não sobra campo no formulário que o VM não conheça', () => {
    const known = new Set<string>([...TEXT_PATHS, 'days', 'mayPublish', 'acceptedTerms']);
    const used = [...form.matchAll(/\bfield="(\w+)"/g)].map((m) => m[1] as string);
    expect(used.filter((path) => !known.has(path))).toEqual([]);
  });

  it('só os campos que a View esconde (curso e ano) têm [data-show-field]', () => {
    const shown = [...form.matchAll(/data-show-field="(\w+)"/g)].map((m) => m[1]);
    expect(shown).toEqual(['course', 'graduationYear']);
  });

  it('tem os ganchos de envio, falha, resumo de erros, protocolo e aviso de encerrado', () => {
    for (const hook of [
      'data-mentor-form',
      'data-reg-form',
      'data-reg-submit',
      'data-reg-failure',
      'data-reg-failure-text',
      'data-reg-retry',
      'data-error-summary',
      'data-error-summary-title',
      'data-error-summary-list',
      'data-reg-live',
      'data-reg-panel',
      'data-reg-closed',
      'data-consent-label',
    ]) {
      expect(form, hook).toContain(hook);
    }
    // a tela de sucesso (a mesma da inscrição, na variante mentor) tem onde pôr protocolo e e-mail
    for (const hook of [
      'data-reg-success',
      'data-reg-success-title',
      'data-reg-protocol',
      'data-reg-protocol-typed',
      'data-reg-contact-email',
    ]) {
      expect(success, hook).toContain(hook);
    }
    expect(form).toContain('variant="mentor"');
  });

  it('o formulário envia por POST na própria página (sem JS, nada pessoal vai na URL)', () => {
    expect(form).toMatch(/method="post"/);
    expect(form).toMatch(/action="\/seja-mentor"/);
    expect(form).toContain('novalidate');
  });

  it('a página ainda aceita todas as origens de CTA que o site usa', () => {
    expect(MENTOR_ORIGINS).toEqual(['crew', 'faq', 'footer', 'subnav', '404', 'privacidade']);
  });
});
