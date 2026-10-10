import { BoltBuilder } from './BoltBuilder';
import { ContourIndex } from './ContourIndex';
import { chance, rand, type Bolt, type BoltKind, type ContourPoint, type Vec } from './types';

// caixa da imagem dentro do canvas, tudo em px do canvas (já com DPR)
export interface StageFrame {
  ox: number;
  oy: number;
  w: number;
  h: number;
  width: number;
  height: number;
  // escala das espessuras (DPR x tamanho do logo)
  scale: number;
}

// Factory: transforma "quero um raio do tipo X agora" em geometria pronta pra pintar
export class BoltFactory {
  private readonly builder = new BoltBuilder();
  private readonly index: ContourIndex;

  constructor(
    contour: readonly ContourPoint[],
    private frame: StageFrame,
  ) {
    this.index = new ContourIndex(contour, frame.h / (frame.w || 1));
  }

  resize(frame: StageFrame): void {
    this.frame = frame;
  }

  create(kind: BoltKind, now: number): Bolt | null {
    if (kind === 'strike') {
      // mais da metade das descargas sai das pontas: fica longe do texto em cima e embaixo
      const start = chance(0.6) ? this.index.randomSide() : this.index.random();
      return start ? this.strike(start, now) : null;
    }
    const start = this.index.random();
    return start ? this.arc(start, now, kind === 'crackle') : null;
  }

  // descarga que sai da borda pra fora, com galhos
  private strike(start: ContourPoint, now: number): Bolt {
    const { w } = this.frame;
    const from = this.toCanvas(start);
    // borda de cima/baixo: inclina pra fora do centro (em diagonal), nunca reto pro título
    const lean = Math.abs(start.ny) > 0.6 ? Math.sign(start.x - 0.5) * 1.1 : 0;
    const angle = Math.atan2(start.ny, start.nx + lean) + rand(-0.45, 0.45);
    const reach = w * rand(0.12, 0.26) * (start.ny > 0.4 ? 0.55 : 1);
    const to = this.clampToStage({
      x: from.x + Math.cos(angle) * reach,
      y: from.y + Math.sin(angle) * reach,
    });
    const options = {
      roughness: 0.3,
      forks: Math.round(rand(2, 5)),
      minSegment: 3 * this.frame.scale,
      width: 1.2,
    };
    return {
      kind: 'strike',
      tint: chance(0.14) ? 'violet' : 'blue',
      strokes: this.builder.build(from, to, options),
      restrike: chance(0.45) ? this.builder.build(from, to, options) : null,
      origin: from,
      born: now,
      life: rand(320, 560),
      intensity: rand(0.9, 1),
    };
  }

  // arco colado na borda (crackle = versão curtinha e fraca)
  private arc(start: ContourPoint, now: number, tiny: boolean): Bolt | null {
    const end = tiny ? this.index.near(start, 0.012, 0.045) : this.index.near(start, 0.05, 0.18);
    if (!end) return null;
    const from = this.toCanvas(start);
    const to = this.toCanvas(end);
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    // borda de baixo estufa menos: o slogan fica logo ali
    const facingDown = (start.ny + end.ny) / 2 > 0.4;
    const push = distance * rand(0.15, tiny ? 0.3 : 0.42) * (facingDown ? 0.45 : 1);
    const bulge = { x: ((start.nx + end.nx) / 2) * push, y: ((start.ny + end.ny) / 2) * push };
    const options = {
      roughness: tiny ? 0.35 : 0.24,
      forks: tiny ? 0 : Math.round(rand(0, 2)),
      minSegment: 2.5 * this.frame.scale,
      width: tiny ? 0.55 : 0.8,
    };
    return {
      kind: tiny ? 'crackle' : 'arc',
      tint: chance(0.1) ? 'violet' : 'blue',
      strokes: this.builder.arc(from, to, bulge, options),
      restrike: null,
      origin: null,
      born: now,
      life: tiny ? rand(110, 220) : rand(260, 480),
      intensity: tiny ? rand(0.6, 0.95) : rand(0.8, 1),
    };
  }

  private toCanvas(point: ContourPoint): Vec {
    const { ox, oy, w, h } = this.frame;
    return { x: ox + point.x * w, y: oy + point.y * h };
  }

  private clampToStage(point: Vec): Vec {
    const pad = 6 * this.frame.scale;
    return {
      x: Math.min(this.frame.width - pad, Math.max(pad, point.x)),
      y: Math.min(this.frame.height - pad, Math.max(pad, point.y)),
    };
  }
}
