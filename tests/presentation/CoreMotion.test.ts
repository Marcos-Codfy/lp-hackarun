// movimento do globo por cena: o hero fica igual, o globo do clímax só gira devagar e respira
import { describe, expect, it } from 'vitest';
import {
  BASE_MOTION,
  BREATH_PERIOD_S,
  CoreMotion,
  FINALE_MOTION,
  breathLevel,
  finaleWeight,
  type MotionProfile,
} from '@presentation/experience/scene/CoreMotion';

const ANCHOR = 10;
const STEP = 1 / 60;

// roda o movimento parado numa posição e devolve o que o shader recebe a cada frame
function run(motion: CoreMotion, position: number, seconds: number, charge = 0, from = 0) {
  const frames: { time: number; coreTime: number; coreScale: number; glow: number }[] = [];
  for (let time = from; time < from + seconds; time += STEP) {
    motion.update(position, charge, time, STEP);
    frames.push({ time, coreTime: motion.coreTime, coreScale: motion.coreScale, glow: motion.glow });
  }
  return frames;
}

describe('finaleWeight', () => {
  it('é 1 na seção do clímax e 0 longe dela', () => {
    expect(finaleWeight(ANCHOR, ANCHOR)).toBe(1);
    expect(finaleWeight(0, ANCHOR)).toBe(0);
    expect(finaleWeight(ANCHOR - 1, ANCHOR)).toBe(0);
  });

  it('a travessia que chega ao clímax já fica calma no miolo do voo', () => {
    expect(finaleWeight(ANCHOR - 0.75, ANCHOR)).toBe(1);
    expect(finaleWeight(ANCHOR - 0.5, ANCHOR)).toBe(1);
    const ramp = [0.99, 0.95, 0.9, 0.85, 0.8].map((d) => finaleWeight(ANCHOR - d, ANCHOR));
    ramp.reduce((prev, w) => (expect(w).toBeGreaterThanOrEqual(prev), w), 0);
  });

  it('sem seção de clímax (anchor -1) nunca acalma', () => {
    expect(finaleWeight(0, -1)).toBe(0);
    expect(finaleWeight(3, -1)).toBe(0);
  });
});

describe('perfis de movimento', () => {
  // tudo que agita o globo: no clímax tem que ser menor que no resto da página
  const AGITATION: (keyof MotionProfile)[] = [
    'drift',
    'chargeDrift',
    'flow',
    'chargeFlow',
    'spin',
    'chargeSpin',
    'squeeze',
    'pulse',
    'flight',
    'scroll',
    'push',
    'hand',
    'pointer',
  ];

  it.each(AGITATION)('o clímax tem menos %s que o resto', (field) => {
    expect(FINALE_MOTION[field]).toBeLessThan(BASE_MOTION[field]);
  });

  it('só o clímax respira, de leve (raio e brilho)', () => {
    expect(BASE_MOTION.breath).toBe(0);
    expect(BASE_MOTION.glow).toBe(0);
    expect(FINALE_MOTION.breath).toBeGreaterThan(0.008);
    expect(FINALE_MOTION.breath).toBeLessThanOrEqual(0.02);
    expect(FINALE_MOTION.glow).toBeLessThanOrEqual(0.12);
  });

  it('a turbulência da chegada cai pra no máximo um quarto', () => {
    expect(FINALE_MOTION.flight).toBeLessThanOrEqual(0.25);
  });
});

describe('breathLevel', () => {
  it('entra e sai suave: 0 → 1 → 0 com derivada zero nas pontas', () => {
    expect(breathLevel(0)).toBeCloseTo(0);
    expect(breathLevel(0.5)).toBeCloseTo(1);
    expect(breathLevel(1)).toBeCloseTo(0);
    expect(breathLevel(0.01)).toBeLessThan(0.002);
    expect(1 - breathLevel(0.49)).toBeLessThan(0.002);
  });
});

describe('CoreMotion', () => {
  it('no hero tudo fica como sempre (mesma fase, sem respiro, giro de sempre)', () => {
    const motion = new CoreMotion(ANCHOR);
    const frames = run(motion, 0, 2);
    frames.forEach((f) => {
      expect(f.coreTime).toBeCloseTo(f.time * BASE_MOTION.drift, 10);
      expect(f.coreScale).toBe(1);
      expect(f.glow).toBe(0);
    });
    expect(motion.coreFlow).toBe(1);
    expect(motion.spinRate).toBe(BASE_MOTION.spin);
    expect(motion.push).toBe(0);
    expect(motion.profile).toEqual(BASE_MOTION);
  });

  it('no clímax o fluxo das fitas anda mais devagar que no hero', () => {
    const motion = new CoreMotion(ANCHOR);
    const frames = run(motion, ANCHOR, 2);
    const first = frames[0];
    const last = frames.at(-1);
    if (!first || !last) throw new Error('no frames');
    const rate = (last.coreTime - first.coreTime) / (last.time - first.time);
    expect(rate).toBeCloseTo(FINALE_MOTION.drift, 4);
    expect(rate).toBeLessThan(BASE_MOTION.drift * 0.5);
  });

  it('respira com período de ~3,6 s e amplitude pequena', () => {
    const motion = new CoreMotion(ANCHOR);
    const frames = run(motion, ANCHOR, BREATH_PERIOD_S * 2);
    const scales = frames.map((f) => f.coreScale);
    expect(Math.min(...scales)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...scales)).toBeCloseTo(1 + FINALE_MOTION.breath, 4);
    // topo do respiro no meio do período, de volta ao repouso no fim
    const at = (s: number) => frames.reduce((a, b) => (Math.abs(b.time - s) < Math.abs(a.time - s) ? b : a));
    expect(at(BREATH_PERIOD_S / 2).coreScale).toBeCloseTo(1 + FINALE_MOTION.breath, 3);
    expect(at(BREATH_PERIOD_S).coreScale).toBeCloseTo(1, 3);
    expect(Math.max(...frames.map((f) => f.glow))).toBeCloseTo(FINALE_MOTION.glow, 4);
  });

  it('a carga no clímax vira luz, não agitação: fluxo e giro calmos', () => {
    const motion = new CoreMotion(ANCHOR);
    motion.update(ANCHOR, 1, 0, STEP);
    expect(motion.coreFlow).toBeLessThanOrEqual(FINALE_MOTION.flow);
    expect(motion.spinRate).toBeLessThan((BASE_MOTION.spin + BASE_MOTION.chargeSpin) * 0.1);
    expect(motion.coreScale).toBeGreaterThan(0.97);
    expect(motion.push).toBeCloseTo(FINALE_MOTION.push);
  });

  it('a fase do fluxo nunca salta, nem na carga nem ao entrar no clímax', () => {
    const motion = new CoreMotion(ANCHOR);
    const far = run(motion, 0, 30);
    const near = run(motion, ANCHOR, 1, 1, 30);
    const steps = [...far, ...near].map((f, i, all) =>
      i === 0 ? 0 : f.coreTime - (all[i - 1]?.coreTime ?? 0),
    );
    const maxRate = BASE_MOTION.drift + BASE_MOTION.chargeDrift;
    steps.forEach((step) => expect(Math.abs(step)).toBeLessThanOrEqual(maxRate * STEP + 1e-9));
  });

  it('delta 0 (reduced motion e pausa): fase e respiro ficam parados', () => {
    const motion = new CoreMotion(ANCHOR);
    run(motion, ANCHOR, 1);
    const { coreScale } = motion;
    // em pausa o relógio também para: o mesmo instante repetido dá o mesmo frame
    motion.update(ANCHOR, 0, 1, 0);
    const { coreTime } = motion;
    motion.update(ANCHOR, 0, 1, 0);
    expect(motion.coreTime).toBe(coreTime);
    expect(motion.coreScale).toBe(coreScale);
  });

  it('sem seção de clímax o último core continua igual ao hero', () => {
    const motion = new CoreMotion(-1);
    run(motion, ANCHOR, 1);
    expect(motion.calm).toBe(0);
    expect(motion.profile).toEqual(BASE_MOTION);
  });
});
