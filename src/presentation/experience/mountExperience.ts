// STUB — será substituído pela experiência three.js (partículas que morfam com o scroll)
import type { AppContext } from '@presentation/app/AppContext';

export async function mountExperience(ctx: AppContext): Promise<void> {
  ctx.bus.emit('experience:fallback', { reason: 'not-implemented' });
}
