import { Observable } from '@shared/core/Observable';
import type { EventBus } from '@shared/core/EventBus';
import type { AppEvents, SceneKey } from '@presentation/app/AppEvents';
import type { SceneTrack } from '@presentation/app/AppContext';
import { ScrollTrigger } from './gsap';
import { layoutBoxOf, progressAt, spanOf, type SceneSpan } from './SceneMap';
import { VelocityMeter } from './VelocityMeter';

const SCENE_KEYS = new Set<string>([
  'core',
  'nebula',
  'enigma',
  'route',
  'arena',
  'screen',
  'trophy',
  'dust',
]);

const isSceneKey = (value: string | undefined): value is SceneKey =>
  value !== undefined && SCENE_KEYS.has(value);

interface SceneSection {
  el: HTMLElement;
  key: SceneKey;
}

function readSections(): SceneSection[] {
  const sections: SceneSection[] = [];
  document.querySelectorAll<HTMLElement>('[data-scene]').forEach((el) => {
    const key = el.dataset['scene'];
    if (isSceneKey(key)) sections.push({ el, key });
  });
  return sections;
}

// traduz o scroll em trilha de cenas: índice contínuo, velocidade e "qual seção manda agora"
export class SceneDirector {
  readonly track: SceneTrack;
  private readonly sections = readSections();
  private readonly progress = new Observable(0);
  private readonly velocity: VelocityMeter;
  private spans: SceneSpan[] = [];
  private viewport = 0;
  private dominant = -1;

  constructor(
    private readonly bus: EventBus<AppEvents>,
    private readonly reducedMotion: boolean,
  ) {
    this.velocity = new VelocityMeter(!reducedMotion);
    this.track = {
      keys: this.sections.map((section) => section.key),
      progress: this.progress,
      velocity: this.velocity.value,
    };

    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        this.velocity.push(self.getVelocity());
        this.update();
      },
    });
    // 'refresh' global roda depois de todos os pins recalcularem: hora certa de medir
    ScrollTrigger.addEventListener('refresh', this.remeasure);
    // primeira leitura no próximo frame, quando as Views já assinaram o bus
    requestAnimationFrame(this.remeasure);
  }

  private readonly remeasure = (): void => {
    const scrollY = window.scrollY;
    this.viewport = window.innerHeight;
    this.spans = this.sections.map(({ el }) => {
      const rect = layoutBoxOf(el).getBoundingClientRect();
      return spanOf(rect.top + scrollY, rect.height, this.viewport);
    });
    this.update();
  };

  private update(): void {
    if (this.spans.length === 0) return;
    const raw = progressAt(this.spans, window.scrollY + this.viewport / 2);
    // reduced motion: sem scrub, a cena troca inteira
    this.progress.set(this.reducedMotion ? Math.round(raw) : raw);
    this.announce(Math.round(raw));
  }

  private announce(index: number): void {
    if (index === this.dominant) return;
    const section = this.sections[index];
    if (!section) return;
    this.dominant = index;
    this.bus.emit('scene:enter', { key: section.key, index, sectionId: section.el.id });
  }
}
