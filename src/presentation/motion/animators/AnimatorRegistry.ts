import type { AppContext } from '@presentation/app/AppContext';
import type { SectionAnimator } from './SectionAnimator';

// Registry: lista ordenada de animadores; um animador que quebra não derruba os outros
export class AnimatorRegistry {
  private readonly animators: SectionAnimator[] = [];

  register(...animators: SectionAnimator[]): this {
    this.animators.push(...animators);
    return this;
  }

  mountAll(ctx: AppContext): void {
    for (const animator of this.animators) {
      try {
        animator.mount(ctx);
      } catch (error) {
        console.error(`[animators] ${animator.constructor.name} failed`, error);
      }
    }
  }

  teardownAll(): void {
    this.animators.forEach((animator) => animator.teardown());
  }
}
