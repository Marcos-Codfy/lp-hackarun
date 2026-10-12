// rascunho da inscrição na aba (sessionStorage): salva textos e a foto preparada, nunca o aceite; foto grande
// demais ou armazenamento cheio/bloqueado não quebram nada (a gravação leve e a chave: RegistrationDraftWrites)
import { describe, expect, it } from 'vitest';
import {
  DRAFT_KEY,
  MAX_DRAFT_IMAGE_CHARS,
  RegistrationDraft,
  type DraftStorage,
} from '@presentation/view-models/registration/RegistrationDraft';
import { emptyFields } from '@presentation/view-models/registration/RegistrationFields';
import { preparedImage } from '../../helpers/images';
import { filled, IMAGE_KEY, MemoryStorage } from './draftStorage';

describe('RegistrationDraft · salvar e voltar', () => {
  it('volta nome, integrantes (sem a chave da linha) e a foto preparada; nunca o aceite nem o honeypot', () => {
    const storage = new MemoryStorage();
    const draft = new RegistrationDraft(storage);
    expect(draft.save(filled(), 'hero')).toBe('saved');
    const raw = storage.getItem(DRAFT_KEY) ?? '';
    expect(raw).not.toContain('acceptedTerms');
    expect(raw).not.toContain('robô');
    const back = draft.load();
    expect(back).toMatchObject({ teamName: 'Bug Busters', source: 'hero', imageDropped: false });
    expect(back?.members).toEqual([
      { name: 'Ana Souza', studentId: '2024100123', email: 'ana@exemplo.com' },
      { name: 'Bruno', studentId: '', email: '' },
      { name: 'Carla Dias', studentId: '', email: '' },
    ]);
    expect(back?.teamImage).toEqual(preparedImage());
  });

  it('formulário vazio apaga o rascunho em vez de salvar um vazio', () => {
    const storage = new MemoryStorage();
    const draft = new RegistrationDraft(storage);
    draft.save(filled(), null);
    expect(draft.save(emptyFields(2), null)).toBe('empty');
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

describe('RegistrationDraft · foto que não cabe e armazenamento com problema', () => {
  it('foto acima do teto do rascunho: salva os textos e avisa pra escolher de novo', () => {
    const storage = new MemoryStorage();
    const draft = new RegistrationDraft(storage);
    const big = preparedImage({ base64: 'A'.repeat(MAX_DRAFT_IMAGE_CHARS + 4) });
    expect(draft.save(filled({ teamImage: big }), null)).toBe('saved-without-image');
    expect(draft.load()).toMatchObject({ teamName: 'Bug Busters', teamImage: null, imageDropped: true });
  });

  it('aba sem espaço pra foto (cota): tenta só os textos', () => {
    const image = preparedImage({ base64: 'A'.repeat(4000) });
    const draft = new RegistrationDraft(new MemoryStorage(2000));
    expect(draft.save(filled({ teamImage: image }), null)).toBe('saved-without-image');
    expect(draft.load()).toMatchObject({ teamImage: null, imageDropped: true });
  });

  it('a foto coube mas os textos não (cota total): solta a foto e grava os textos', () => {
    const image = preparedImage({ base64: 'A'.repeat(4000) });
    const storage = new MemoryStorage(null, 4300);
    const draft = new RegistrationDraft(storage);
    expect(draft.save(filled({ teamImage: image }), null)).toBe('saved-without-image');
    expect(storage.getItem(IMAGE_KEY)).toBeNull();
    expect(draft.load()).toMatchObject({ teamName: 'Bug Busters', teamImage: null, imageDropped: true });
  });

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

  it('JSON quebrado, outra versão ou tipos errados: ignora', () => {
    expect(loadRaw('{nao é json')).toBeNull();
    expect(loadRaw(JSON.stringify({ v: 1, teamName: 'X', members: [] }))).toBeNull();
    expect(loadRaw(JSON.stringify({ v: 2, teamName: 42, members: 'x' }))).toBeNull();
  });

  it('corta textos no tamanho dos campos e descarta foto adulterada', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        v: 2,
        teamName: 'N'.repeat(300),
        members: [{ name: 'A'.repeat(200), studentId: 7, email: 'a@b.co' }],
        image: true,
      }),
    );
    storage.setItem(
      IMAGE_KEY,
      JSON.stringify({ mimeType: 'image/gif', base64: 'AAAA', width: 1, height: 1, bytes: 3 }),
    );
    const back = new RegistrationDraft(storage).load();
    expect(back?.teamName).toHaveLength(40);
    expect(back?.members[0]).toEqual({ name: 'A'.repeat(80), studentId: '', email: 'a@b.co' });
    expect(back).toMatchObject({ teamImage: null, imageDropped: true });
  });

  it('origem fora da lista (rascunho mexido na aba) não chega na coluna Origem; chave inválida também não', () => {
    const back = loadRaw(
      JSON.stringify({
        v: 2,
        teamName: 'Bug Busters',
        members: [],
        source: '=HYPERLINK("x")',
        sessionKey: 'chave com espaço',
      }),
    );
    expect(back).toMatchObject({ teamName: 'Bug Busters', source: null, sessionKey: null });
  });
});
