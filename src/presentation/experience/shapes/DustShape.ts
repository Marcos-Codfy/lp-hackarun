import type { ShapeStrategy } from './ShapeStrategy';
import { TAU, split, type Random } from './sampling';
import { PointBrush } from './PointBrush';

// galáxia distante e calma (fundo de leitura): bojo pequeno, dois braços em espiral logarítmica
// feitos de fios finos, disco ralo e estrelas soltas. O disco fica em y = 0; o layout inclina
const R_IN = 0.2;
const R_OUT = 1.6;
const PITCH = 0.3;
const STRANDS = [-0.07, 0, 0.07] as const;

export class DustShape implements ShapeStrategy {
  readonly key = 'dust';

  generate(count: number, random: Random): Float32Array {
    const b = new PointBrush(count, random);
    const [bulge = 0, arms = 0, disk = 0, stars = 0] = split(count, [0.07, 0.58, 0.25, 0.1]);
    for (let i = 0; i < bulge; i++) b.dot(0, 0, 0, 0.1);
    for (let i = 0; i < arms; i++) {
      const r = R_IN + (R_OUT - R_IN) * Math.pow(random(), 1.15);
      const strand = STRANDS[i % STRANDS.length] ?? 0;
      const a = Math.log(r / R_IN) / PITCH + (i % 2) * Math.PI + strand + (random() - 0.5) * 0.1 * (1 + r);
      // desfoque pequeno e isotrópico: o braço engrossa pra fora sem o disco perder a espessura fina
      b.dot(Math.cos(a) * r, 0, Math.sin(a) * r, 0.01 + 0.022 * r);
    }
    for (let i = 0; i < disk; i++) {
      const r = Math.min(R_OUT * 1.1, -Math.log(1 - random() * 0.97) * 0.45);
      const a = random() * TAU;
      b.dot(Math.cos(a) * r, (random() - 0.5) * 0.1, Math.sin(a) * r);
    }
    for (let i = 0; i < stars; i++) {
      const r = 0.3 + random() * 1.8;
      const a = random() * TAU;
      b.dot(Math.cos(a) * r, (random() - 0.5) * 0.6, Math.sin(a) * r);
    }
    return b.finish();
  }
}
