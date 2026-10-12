// parte pesada da inscrição (VM + View do formulário e o que eles puxam): chunk à parte, que o
// mountViews carrega quando a seção chega perto da tela ou quando um CTA leva até ela
import type { Clock } from '@application/index';
import type { RegistrationServices } from '@composition/client';
import type { AppContext } from '@presentation/app/AppContext';
import { RegistrationFormViewModel } from '@presentation/view-models/registration/RegistrationFormViewModel';
import type { TeamsViewModel } from '@presentation/view-models/teams/TeamsViewModel';
import { RegistrationFormView } from '../RegistrationFormView';

export interface RegistrationFormDeps {
  root: HTMLElement;
  ctx: AppContext;
  services: RegistrationServices;
  clock: Clock;
  // lista ao vivo das equipes: vagas esgotadas na planilha fecham o formulário
  teams: TeamsViewModel | null;
  // origem do último CTA clicado antes de o chunk chegar
  source: string | null;
}

export function mountRegistrationForm(deps: RegistrationFormDeps): RegistrationFormView {
  const { root, ctx, services, clock, teams, source } = deps;
  const status = root.dataset['status'];
  const vm = new RegistrationFormViewModel({
    submit: services.submitRegistration,
    prepareImage: services.prepareTeamImage,
    teamSize: ctx.config.registration.teamSize,
    isOpen: status === 'open' || status === 'closing',
    clock,
  });
  if (source) vm.setSource(source);
  ctx.bus.on('registration:intent', ({ source: next }) => vm.setSource(next));
  const view = new RegistrationFormView(root, vm, ctx.bus, (el) =>
    ctx.motion.scrollTo(el, { immediate: ctx.reducedMotion }),
  );
  view.mount();
  teams?.state.subscribe((state) => {
    if (state.status === 'ready') vm.refreshAvailability(state.slots.taken);
  });
  return view;
}
