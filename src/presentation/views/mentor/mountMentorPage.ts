// parte pesada da página /seja-mentor (VM + View do formulário e o que eles puxam): chunk à parte, que o LightApp
// baixa junto com o envio do cadastro
import { qs } from '@shared/utils/dom';
import type { MentorServices, ClientContainer } from '@composition/client';
import { MentorFormViewModel } from '@presentation/view-models/mentor/MentorFormViewModel';
import { mentorSourceFromSearch } from '@presentation/view-models/mentor/mentorOrigin';
import { MentorFormView } from './MentorFormView';

export interface MentorPageDeps {
  // [data-mentor-form]
  root: HTMLElement;
  services: MentorServices;
  container: Pick<ClientContainer, 'clock'>;
  reducedMotion: boolean;
}

export function mountMentorPage(deps: MentorPageDeps): MentorFormViewModel {
  const { root, services, container, reducedMotion } = deps;
  const vm = new MentorFormViewModel({
    submit: services.submitMentor,
    isOpen: root.dataset['status'] === 'open',
    clock: container.clock,
  });
  vm.setSource(mentorSourceFromSearch(location.search));
  // enviado: o painel "o que faz um mentor" sai antes do sucesso ganhar o foco; depois, o conteúdo pularia
  const aside = qs('[data-mentor-aside]');
  if (aside) {
    vm.state.subscribe((state) => {
      aside.hidden = state.status === 'success';
    });
  }
  // o resumo de erros para logo abaixo do header (scroll-padding do html)
  const behavior: ScrollBehavior = reducedMotion ? 'instant' : 'smooth';
  new MentorFormView(root, vm, (el) => el.scrollIntoView({ block: 'start', behavior })).mount();
  return vm;
}
