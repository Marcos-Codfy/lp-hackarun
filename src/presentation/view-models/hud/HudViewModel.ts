import { Observable } from '@shared/core/Observable';
import { clamp } from '@shared/utils/math';
import { pad2 } from '../countdown/milestoneText';

export interface HudState {
  index: number;
  total: number;
  label: string;
  // progresso do scroll na página inteira, 0..1
  progress: number;
}

// "03 de 11 · MISSÕES": com barra ("03/11") a página toda em dd/mm lia o contador como data
export const formatCheckpoint = (s: Pick<HudState, 'index' | 'total' | 'label'>): string =>
  `${pad2(s.index + 1)} de ${pad2(s.total)} · ${s.label.toLocaleUpperCase('pt-BR')}`;

// HUD da corrida: em qual checkpoint a pessoa está e quanto falta
export class HudViewModel {
  readonly state: Observable<HudState>;
  private readonly labels: readonly string[];

  constructor(labels: readonly string[]) {
    this.labels = labels;
    this.state = new Observable<HudState>({
      index: 0,
      total: labels.length,
      label: labels[0] ?? '',
      progress: 0,
    });
  }

  enter(index: number): void {
    const label = this.labels[index];
    if (label === undefined || index === this.state.value.index) return;
    this.state.update((s) => ({ ...s, index, label }));
  }

  setProgress(value: number): void {
    // arredonda pra não redesenhar por causa de 0,0001
    const progress = Math.round(clamp(value) * 1000) / 1000;
    if (progress === this.state.value.progress) return;
    this.state.update((s) => ({ ...s, progress }));
  }
}
