import type { AppContext } from '@presentation/app/AppContext';
import type { BootSteps } from '@presentation/app/BootQueue';
import type { SectionAnimator } from './SectionAnimator';

// Registry: lista ordenada de animadores; cada um monta num passo próprio do boot
// e um animador que quebra não derruba os outros
export class AnimatorRegistry {
  private readonly animators: SectionAnimator[] = [];

  register(...animators: SectionAnimator[]): this {
    this.animators.push(...animators);
    return this;
  }

  schedule(ctx: AppContext, boot: BootSteps): void {
    for (const animator of this.animators) {
      boot.add(`animate ${animator.label}`, () => AnimatorRegistry.mountOne(animator, ctx));
    }
  }

  teardownAll(): void {
    this.animators.forEach((animator) => animator.teardown());
  }

  private static mountOne(animator: SectionAnimator, ctx: AppContext): void {
    try {
      animator.mount(ctx);
    } catch (error) {
      console.error(`[animators] ${animator.label} failed`, error);
    }
  }
}
