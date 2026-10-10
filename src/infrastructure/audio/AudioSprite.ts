export interface SpriteSlot {
  // segundos dentro do arquivo
  readonly offset: number;
  readonly duration: number;
}

export interface SpriteVariation {
  readonly slot: SpriteSlot;
  readonly rate: number;
}

type RandomFn = () => number;

// mapa de um arquivo com vários sons curtos em sequência + sorteio com leve variação de tom
export class AudioSprite {
  readonly slots: readonly SpriteSlot[];
  private readonly minRate: number;
  private readonly maxRate: number;

  constructor(slots: readonly SpriteSlot[], rate: { min: number; max: number }) {
    if (slots.length === 0) throw new Error('AudioSprite needs at least one slot');
    this.slots = slots;
    this.minRate = rate.min;
    this.maxRate = rate.max;
  }

  // n slots do mesmo tamanho colados a partir do zero
  static uniform(count: number, duration: number, rate: { min: number; max: number }): AudioSprite {
    const slots = Array.from({ length: count }, (_, i) => ({ offset: i * duration, duration }));
    return new AudioSprite(slots, rate);
  }

  pick(random: RandomFn = Math.random): SpriteVariation {
    const index = Math.min(this.slots.length - 1, Math.floor(random() * this.slots.length));
    const slot = this.slots[index] ?? this.slots[0];
    const rate = this.minRate + (this.maxRate - this.minRate) * random();
    return { slot: slot as SpriteSlot, rate };
  }
}
