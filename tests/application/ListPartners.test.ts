// faixa "Quem faz acontecer": realização, organização e parceria, nessa ordem, venha o JSON como vier
import { describe, expect, it } from 'vitest';
import partnersData from '@infrastructure/content/partners.json';
import type { RawPartner } from '@infrastructure/content/schema';
import { StaticPartnerRepository } from '@infrastructure/repositories/StaticContentRepositories';
import { ListPartners } from '@application/index';
import { Partner, type PartnerRepository, type PartnerRole } from '@domain/index';

const partner = (id: string, role: PartnerRole) =>
  Partner.create({ id, name: id, fullName: null, role, url: null, logo: null });
const repo = (list: Partner[]): PartnerRepository => ({ list: async () => list });

describe('ListPartners', () => {
  it('ordena por papel: realização, organização, parceria e apoio', async () => {
    const list = await new ListPartners(
      repo([
        partner('apoio', 'supporter'),
        partner('shopping', 'partner'),
        partner('liga', 'coorganizer'),
        partner('faculdade', 'organizer'),
      ]),
    ).execute();
    expect(list.map((p) => [p.id, p.role])).toEqual([
      ['faculdade', 'organizer'],
      ['liga', 'coorganizer'],
      ['shopping', 'partner'],
      ['apoio', 'supporter'],
    ]);
  });

  it('conteúdo real: UniCatólica realiza, LAES organiza (com o Instagram) e o Capim Dourado é parceiro', async () => {
    const list = await new ListPartners(new StaticPartnerRepository(partnersData as RawPartner[])).execute();
    expect(list.map((p) => [p.name, p.role])).toEqual([
      ['UniCatólica', 'organizer'],
      ['LAES', 'coorganizer'],
      ['Capim Dourado Shopping', 'partner'],
    ]);
    expect(list.find((p) => p.id === 'laes')?.url).toBe('https://www.instagram.com/laes.eng/');
  });
});
