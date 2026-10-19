// parte pesada da página /inscricao (VM + View do formulário, rascunho, etapas e o que eles puxam): chunk à
// parte, que o LightApp baixa junto com os serviços de envio
import type { EventBus } from '@shared/core/EventBus';
import { qs } from '@shared/utils/dom';
import type { ClientContainer, RegistrationServices } from '@composition/client';
import type { AppConfig } from '@presentation/app/AppConfig';
import type { AppEvents } from '@presentation/app/AppEvents';
import {
  RegistrationDraft,
  type DraftStorage,
} from '@presentation/view-models/registration/RegistrationDraft';
import { RegistrationFormViewModel } from '@presentation/view-models/registration/RegistrationFormViewModel';
import { sourceFromSearch } from '@presentation/view-models/registration/registrationOrigin';
import { RegistrationFormView } from '../RegistrationFormView';
import { DraftKeeper } from './DraftKeeper';
import { StatusBadgeView } from './StatusBadgeView';
import { StepProgressView } from './StepProgressView';

export interface RegistrationPageDeps {
  // [data-registration-form]
  root: HTMLElement;
  config: AppConfig;
  bus: EventBus<AppEvents>;
  services: RegistrationServices;
  container: Pick<ClientContainer, 'clock'>;
  reducedMotion: boolean;
}

// sessionStorage pode nem abrir (cookies bloqueados): sem ele o formulário segue, só sem rascunho
function tabStorage(): DraftStorage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

// com teto de vagas, a contagem da planilha diz se ainda cabe gente (vagas esgotadas fecham o formulário)
async function watchCapacity(deps: RegistrationPageDeps, vm: RegistrationFormViewModel): Promise<void> {
  const { counter } = deps.services;
  if (deps.config.registration.slots.capacity === null || !counter || !vm.isOpen) return;
  const taken = await counter.taken();
  if (taken !== null) vm.refreshAvailability(taken);
}

export function mountRegistrationPage(deps: RegistrationPageDeps): RegistrationFormViewModel {
  const { root, bus, services, container, reducedMotion } = deps;
  const status = root.dataset['status'];
  const vm = new RegistrationFormViewModel({
    submit: services.submitRegistration,
    isOpen: status === 'open' || status === 'closing',
    clock: container.clock,
  });
  const keeper = new DraftKeeper({
    root,
    vm,
    draft: new RegistrationDraft(tabStorage()),
    bar: qs('[data-draft]'),
    source: sourceFromSearch(location.search),
  });
  keeper.restore();
  // enviado: o painel de apoio (lista e etapas) sai antes do sucesso ganhar o foco; depois, o conteúdo pularia
  const aside = qs('[data-reg-aside]');
  if (aside) {
    vm.state.subscribe((state) => {
      aside.hidden = state.status === 'success';
    });
  }
  // o resumo de erros para logo abaixo do header (scroll-padding do html)
  const behavior: ScrollBehavior = reducedMotion ? 'instant' : 'smooth';
  new RegistrationFormView(root, vm, bus, (el) => el.scrollIntoView({ block: 'start', behavior })).mount();
  keeper.mount();
  const progress = qs('[data-form-progress]');
  if (progress) new StepProgressView(progress, root, vm, reducedMotion).mount();
  const badge = qs('[data-reg-status]');
  if (badge) new StatusBadgeView(badge, vm).mount();
  void watchCapacity(deps, vm);
  return vm;
}
