import type { AudioCue } from '@application/ports/AudioCue';

// null object: som desligado ou navegador sem Web Audio
export class NullAudioCue implements AudioCue {
  play(): Promise<void> {
    return Promise.resolve();
  }
}
