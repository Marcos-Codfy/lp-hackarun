// rascunho da inscrição na aba (sessionStorage): salva os campos, nunca o aceite nem o honeypot; armazenamento
// cheio ou bloqueado não quebra nada
import { describe, expect, it } from 'vitest';
import {
  DRAFT_KEY,
  RegistrationDraft,
  type DraftStorage,
} from '@presentation/view-models/registration/RegistrationDraft';
import { emptyFields } from '@presentation/view-models/registration/RegistrationFields';
import { filled, MemoryStorage } from './draftStorage';

const KEY = '3f0c9a52-6d1e-4b7a-9c3e-2a5b8d7e1f40';

describe('RegistrationDraft · salvar e voltar', () => {
  it('volta os campos preenchidos, a origem e a chave do envio; nunca o aceite nem o honeypot', () => {
    const storage = new MemoryStorage();
    const draft = new RegistrationDraft(storage);
    expect(draft.save(filled(), 'hero', KEY)).toBe('saved');
    const raw = storage.getItem(DRAFT_KEY) ?? '';
    expect(raw).not.toContain('acceptedTerms');
    expect(raw).not.toContain('robô');
    expect(draft.load()).toEqual({
      fields: {
        name: 'Ana Souza',
        email: 'ana@exemplo.com',
        whatsapp: '(63) 9999',
        adult: 'no',
        profile: 'other-institution',
        institution: 'Faculdade Exemplo',
        course: 'Direito',
      },
      source: 'hero',
      sessionKey: KEY,
    });
  });

  it('formulário vazio apaga o rascunho em vez de salvar um vazio', () => {
    const storage = new MemoryStorage();
    const draft = new RegistrationDraft(storage);
    draft.save(filled(), null);
    expect(draft.save(emptyFields(), null)).toBe('empty');
    expect(storage.getItem(DRAFT_KEY)).toBeNull();
    expect(draft.load()).toBeNull();
  });

  it('clear apaga o salvo', () => {
    const draft = new RegistrationDraft(new MemoryStorage());
    draft.save(filled(), null);
    draft.clear();
    expect(draft.load()).toBeNull();
  });
});

describe('RegistrationDraft · armazenamento com problema', () => {
  it('armazenamento recusando tudo: "failed", sem exceção', () => {
    const draft = new RegistrationDraft(new MemoryStorage(10));
    expect(draft.save(filled(), null)).toBe('failed');
    expect(draft.load()).toBeNull();
  });

  it('sessionStorage bloqueado (getItem e removeItem lançam) ou ausente', () => {
    const blocked: DraftStorage = {
      getItem: () => {
        throw new DOMException('negado', 'SecurityError');
      },
      setItem: () => {
        throw new DOMException('negado', 'SecurityError');
      },
      removeItem: () => {
        throw new DOMException('negado', 'SecurityError');
      },
    };
    const draft = new RegistrationDraft(blocked);
    expect(draft.load()).toBeNull();
    expect(draft.save(filled(), null)).toBe('failed');
    expect(() => draft.clear()).not.toThrow();
    expect(new RegistrationDraft(null).save(filled(), null)).toBe('failed');
  });
});

describe('RegistrationDraft · rascunho estranho no armazenamento', () => {
  const loadRaw = (raw: string) => {
    const storage = new MemoryStorage();
    storage.setItem(DRAFT_KEY, raw);
    return new RegistrationDraft(storage).load();
  };

  it('JSON quebrado, outra versão (o da equipe era v2) ou sem conteúdo: ignora', () => {
    expect(loadRaw('{nao é json')).toBeNull();
    expect(loadRaw(JSON.stringify({ v: 2, teamName: 'X', members: [] }))).toBeNull();
    expect(loadRaw(JSON.stringify({ v: 3, fields: 'x' }))).toBeNull();
    expect(loadRaw(JSON.stringify({ v: 3, fields: { name: '   ' } }))).toBeNull();
  });

  it('corta textos longos, ignora tipos errados, campos desconhecidos e o honeypot', () => {
    const back = loadRaw(
      JSON.stringify({
        v: 3,
        fields: { name: 'A'.repeat(500), email: 7, honeypot: 'robô', teamName: 'Bug Busters' },
      }),
    );
    expect(back?.fields).toEqual({ name: 'A'.repeat(120) });
  });

  it('origem fora da lista (rascunho mexido na aba) não chega na coluna Origem; chave inválida também não', () => {
    const back = loadRaw(
      JSON.stringify({
        v: 3,
        fields: { name: 'Ana Souza' },
        source: '=HYPERLINK("x")',
        sessionKey: 'chave com espaço',
      }),
    );
    expect(back).toMatchObject({ source: null, sessionKey: null });
  });
});
