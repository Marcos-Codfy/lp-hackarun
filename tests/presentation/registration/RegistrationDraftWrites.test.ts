// rascunho na aba sem custo: a foto (até ~546 mil caracteres) fica numa chave própria e só é regravada quando
// muda; cada pausa na digitação regrava só os textos. A chave de idempotência do envio vai junto
import { describe, expect, it } from 'vitest';
import { DRAFT_KEY, RegistrationDraft } from '@presentation/view-models/registration/RegistrationDraft';
import { preparedImage } from '../../helpers/images';
import { filled, IMAGE_KEY, MemoryStorage } from './draftStorage';

const KEY = '3f0c9a52-6d1e-4b7a-9c3e-2a5b8d7e1f40';

describe('RegistrationDraft · chave do envio e gravação leve', () => {
  it('guarda a chave de idempotência e a origem da lista, e devolve as duas', () => {
    const storage = new MemoryStorage();
    new RegistrationDraft(storage).save(filled(), 'hero', KEY);
    expect(new RegistrationDraft(storage).load()).toMatchObject({ source: 'hero', sessionKey: KEY });
  });

  it('a foto vai pra chave própria e só é regravada quando muda; cada pausa regrava só os textos', () => {
    const storage = new MemoryStorage();
    const draft = new RegistrationDraft(storage);
    const fields = filled();
    draft.save(fields, null);
    draft.save({ ...fields, teamName: 'Bug Busters 2' }, null);
    draft.save({ ...fields, teamName: 'Bug Busters 3' }, null);
    expect(storage.writes.filter((k) => k === IMAGE_KEY)).toHaveLength(1);
    expect(storage.writes.filter((k) => k === DRAFT_KEY)).toHaveLength(3);
    expect(storage.getItem(DRAFT_KEY)).not.toContain(preparedImage().base64);
    draft.save({ ...fields, teamImage: preparedImage({ width: 640 }) }, null);
    expect(storage.writes.filter((k) => k === IMAGE_KEY)).toHaveLength(2);
    draft.save({ ...fields, teamImage: null }, null);
    expect(storage.getItem(IMAGE_KEY)).toBeNull();
  });

  it('rascunho recuperado: a mesma foto não é regravada', () => {
    const storage = new MemoryStorage();
    new RegistrationDraft(storage).save(filled(), null);
    const draft = new RegistrationDraft(storage);
    const back = draft.load();
    storage.writes.length = 0;
    draft.save({ ...filled(), teamImage: back?.teamImage ?? null }, null);
    expect(storage.writes).toEqual([DRAFT_KEY]);
  });

  it('clear apaga os textos e a foto', () => {
    const storage = new MemoryStorage();
    const draft = new RegistrationDraft(storage);
    draft.save(filled(), null);
    draft.clear();
    expect(storage.data.size).toBe(0);
  });
});
