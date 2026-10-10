import type { EventBus } from '@shared/core/EventBus';
import type { AppEvents } from '@presentation/app/AppEvents';
import type { SoundViewModel } from '@presentation/view-models/sound/SoundViewModel';
import { ChargeCueGate } from '@presentation/view-models/sound/ChargeCueGate';

// liga os eventos do bus aos sons: cue no pico da carga do globo e clique a cada caractere digitado
export class SoundBusBinder {
  private readonly bus: EventBus<AppEvents>;
  private readonly sound: SoundViewModel;
  private readonly gate: ChargeCueGate;
  private offs: (() => void)[] = [];

  constructor(bus: EventBus<AppEvents>, sound: SoundViewModel, gate = new ChargeCueGate()) {
    this.bus = bus;
    this.sound = sound;
    this.gate = gate;
  }

  mount(): void {
    this.offs = [
      this.bus.on('experience:charging', () => this.gate.arm()),
      // exatamente no 'charged' (sincronizado com o flash do 3D), uma vez por carga
      this.bus.on('experience:charged', () => {
        if (this.gate.fire()) this.sound.playCue();
      }),
      this.bus.on('ui:type', () => this.sound.playTyping()),
    ];
  }

  unmount(): void {
    this.offs.forEach((off) => off());
    this.offs = [];
  }
}
