import type { CountdownDTO } from '@application/index';
import { qs, qsa } from '@shared/utils/dom';
import type { CountdownViewModel } from '@presentation/view-models/countdown/CountdownViewModel';
import { milestoneSentence, milestoneTag, pad2 } from '@presentation/view-models/countdown/milestoneText';

type Unit = 'days' | 'hours' | 'minutes' | 'seconds';
const UNITS: readonly Unit[] = ['days', 'hours', 'minutes', 'seconds'];

// [data-countdown]: só mexe no texto que mudou; frase do leitor de tela muda só com o marco
export class CountdownView {
  private readonly root: HTMLElement;
  private readonly vm: CountdownViewModel;
  private readonly calm: boolean;
  private readonly digits = new Map<Unit, HTMLElement>();
  private lastKey: string | undefined;

  constructor(root: HTMLElement, vm: CountdownViewModel, options: { calm: boolean }) {
    this.root = root;
    this.vm = vm;
    this.calm = options.calm;
  }

  mount(): void {
    qsa('[data-countdown-unit]', this.root).forEach((el) => {
      this.digits.set(el.dataset['countdownUnit'] as Unit, el);
    });
    this.root.classList.toggle('is-calm', this.calm);
    this.vm.state.subscribe((state) => this.render(state));
    this.watchVisibility();
  }

  private render(state: CountdownDTO): void {
    const key = state.key ?? 'over';
    if (key !== this.lastKey) this.renderMilestone(state, key);
    for (const unit of UNITS) {
      const el = this.digits.get(unit);
      const text = pad2(state[unit]);
      if (el && el.textContent !== text) el.textContent = text;
    }
  }

  private renderMilestone(state: CountdownDTO, key: string): void {
    const label = state.isOver ? 'Corrida encerrada' : state.label;
    this.setText('[data-countdown-label]', label);
    this.setText('[data-countdown-sr]', milestoneSentence(label, state.target));
    this.setText('[data-countdown-tag]', milestoneTag(state.target));
    this.root.dataset['milestone'] = key;
    if (this.lastKey !== undefined && !this.calm) this.flash();
    this.lastKey = key;
  }

  private flash(): void {
    this.root.classList.remove('is-switching');
    void this.root.offsetWidth;
    this.root.classList.add('is-switching');
  }

  private setText(selector: string, text: string): void {
    const el = qs(selector, this.root);
    if (el && el.textContent !== text) el.textContent = text;
  }

  // fora da tela ou aba escondida não precisa contar
  private watchVisibility(): void {
    let onScreen = true;
    const sync = () => (onScreen && !document.hidden ? this.vm.start() : this.vm.stop());
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        onScreen = entries.some((e) => e.isIntersecting);
        sync();
      }).observe(this.root);
    }
    document.addEventListener('visibilitychange', sync);
    sync();
  }
}
