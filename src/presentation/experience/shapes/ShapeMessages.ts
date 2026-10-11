import type { SceneKey } from '@presentation/app/AppEvents';
import type { ParticleBuffers } from '../particles/ParticleBuffers';

// contrato entre a thread principal e o shapes.worker
export interface ShapeRequest {
  keys: readonly SceneKey[];
  count: number;
}

export type ShapeReply = { buffers: ParticleBuffers } | { error: string };
