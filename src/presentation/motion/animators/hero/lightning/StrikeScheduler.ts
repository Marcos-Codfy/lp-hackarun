import { chance, rand, type Bolt, type BoltKind } from './types';

export interface BoltFrame {
  alpha: number;
  restrike: boolean;
}

const INTRO_DELAY_MS = 650;

// ritmo da tempestade: descarga grande a cada 1–3 s, arcos no meio e crackle contínuo bem fraco
export class StrikeScheduler {
  private nextStrike = 0;
  private nextArc = 0;
  private nextCrackle = 0;
  private intro = true;

  constructor(private readonly lite: boolean) {}

  // volta da pausa: reprograma tudo a partir de agora (sem rajada acumulada)
  reset(now: number): void {
    this.nextStrike = now + (this.intro ? INTRO_DELAY_MS : rand(300, 900));
    this.nextArc = now + rand(400, 900);
    this.nextCrackle = now;
  }

  due(now: number): BoltKind[] {
    const out: BoltKind[] = [];
    if (now >= this.nextStrike) {
      // largada: rajada de descargas pra "ligar" o logo
      const count = this.intro ? 4 : chance(0.35) ? 2 : 1;
      for (let i = 0; i < count; i++) out.push('strike');
      // descarga grande "contagia" a borda com arcos
      if (this.intro) out.push('arc', 'arc', 'arc');
      else if (chance(0.5)) out.push('arc');
      this.intro = false;
      this.nextStrike = now + rand(800, 2200);
    }
    if (now >= this.nextArc) {
      out.push('arc');
      if (chance(0.3)) out.push('arc');
      this.nextArc = now + rand(220, 700);
    }
    if (now >= this.nextCrackle) {
      const count = this.lite ? 1 : Math.round(rand(2, 3));
      for (let i = 0; i < count; i++) out.push('crackle');
      this.nextCrackle = now + rand(50, 110);
    }
    return out;
  }

  // envelope de brilho: ataque rápido, cintilação aleatória e decaimento; null = raio morreu
  static frame(bolt: Bolt, now: number): BoltFrame | null {
    const t = (now - bolt.born) / bolt.life;
    if (t >= 1) return null;
    const attack = Math.min(1, t / 0.05);
    // segura o brilho no primeiro terço e só depois apaga
    const decay = t < 0.35 ? 1 : Math.pow((1 - t) / 0.65, 1.4);
    // apagões curtos: é o que faz parecer raio de verdade e não uma linha que some
    const flicker = chance(bolt.kind === 'strike' ? 0.14 : 0.08) ? 0.18 : rand(0.65, 1);
    return { alpha: attack * decay * flicker * bolt.intensity, restrike: t > 0.42 };
  }
}
