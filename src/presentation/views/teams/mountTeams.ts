// liga cada [data-teams] (contador, vitrine e lista ao vivo) ao seu VM. Em /equipes entra no boot;
// na LP é um chunk à parte, carregado quando a seção de equipes chega perto da tela
import type { SlotsDTO } from '@application/index';
import type { ClientContainer } from '@composition/client';
import { qsa, readJsonAttr } from '@shared/utils/dom';
import { TeamsViewModel, type PublicTeam } from '@presentation/view-models/teams/TeamsViewModel';
import { TeamsView } from '../TeamsView';

// devolve os VMs na ordem da página (a /inscricao tem o próprio, no mountRegistrationPage, pras vagas ao vivo)
export function mountTeams(
  c: ClientContainer,
  fallbackSlots: SlotsDTO,
  roots: HTMLElement[] = qsa('[data-teams]'),
): TeamsViewModel[] {
  return roots.map((root) => {
    const vm = new TeamsViewModel({
      initial: readJsonAttr<PublicTeam[]>(root, 'data-teams-initial', []),
      slots: readJsonAttr<SlotsDTO>(root, 'data-teams-slots', fallbackSlots),
      listTeams: c.listTeams,
    });
    new TeamsView(root, vm).mount();
    return vm;
  });
}
