import { afterEach, describe, expect, it, vi } from 'vitest';
import { SubmitMentorRegistration } from '@application/index';
import type { MentorServices } from '@composition/client';
import { mountMentorPage } from '@presentation/views/mentor/mountMentorPage';
import { ManualClock } from '../../helpers/fixtures';
import { FakeMentorGateway } from '../../helpers/mentorFixtures';
import { mentorMarkup } from './mentorMarkup';
import { fillValidMentor } from './mentorSetup';

function mount(status = 'open') {
  document.body.innerHTML = `<aside data-mentor-aside>o que faz um mentor</aside>${mentorMarkup(status)}`;
  const clock = new ManualClock('2026-11-01T12:00:00Z');
  const gateway = new FakeMentorGateway();
  const submit = new SubmitMentorRegistration({ gateway, clock, sleep: async (ms) => clock.advance(ms) });
  const services: MentorServices = { submitMentor: submit };
  const root = document.querySelector<HTMLElement>('[data-mentor-form]') as HTMLElement;
  const vm = mountMentorPage({ root, services, container: { clock }, reducedMotion: true });
  return { vm, gateway, aside: document.querySelector<HTMLElement>('[data-mentor-aside]') as HTMLElement };
}

afterEach(() => {
  history.replaceState(null, '', '/');
  vi.restoreAllMocks();
});

describe('mountMentorPage', () => {
  it('a origem do CTA (?origem=crew) vai no envio; origem inventada vira "direct"', async () => {
    history.replaceState(null, '', '/seja-mentor?origem=crew');
    const first = mount();
    fillValidMentor(first.vm);
    await first.vm.submit();
    expect(first.gateway.calls[0]?.source).toBe('crew');

    history.replaceState(null, '', '/seja-mentor?origem=hero');
    const second = mount();
    fillValidMentor(second.vm);
    await second.vm.submit();
    expect(second.gateway.calls[0]?.source).toBe('direct');
  });

  it('o painel lateral some quando o cadastro é enviado', async () => {
    const { vm, aside } = mount();
    expect(aside.hidden).toBe(false);
    fillValidMentor(vm);
    await vm.submit();
    expect(aside.hidden).toBe(true);
  });

  it('build fechado: o VM nasce fechado', () => {
    const { vm } = mount('soon');
    expect(vm.isOpen).toBe(false);
  });
});
