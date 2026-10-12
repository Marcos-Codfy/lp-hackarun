// clímax do globo: carga em curva, pulso suave e lento (sem estouro) que some sozinho e brilho calmo no fim
import { describe, expect, it } from 'vitest';
import { EventBus } from '@shared/core/EventBus';
import { Observable } from '@shared/core/Observable';
import type { AppEvents } from '@presentation/app/AppEvents';
import {
  BURST_S,
  ChargeController,
  PULSE_S,
  SHOCK_S,
  SWELL_RISE_S,
} from '@presentation/experience/scene/ChargeController';

const ANCHOR = 9;
const STEP = 1 / 60;

function setup({ instant = false, at = ANCHOR - 2 } = {}) {
  const bus = new EventBus<AppEvents>();
  const progress = new Observable(at);
  const charge = new ChargeController(bus, progress, ANCHOR, instant);
  return { bus, progress, charge };
}

// avança o controlador por `seconds` e devolve o pico de cada envelope no caminho (e quando o pulso bate)
function run(charge: ChargeController, seconds: number) {
  const peak = { swell: 0, pulse: 0, shock: -1, pulseAt: 0, swellJump: 0 };
  let last = charge.swell;
  for (let t = 0; t < seconds; t += STEP) {
    charge.update(STEP);
    peak.swell = Math.max(peak.swell, charge.swell);
    if (charge.pulse > peak.pulse) peak.pulseAt = t;
    peak.pulse = Math.max(peak.pulse, charge.pulse);
    peak.shock = Math.max(peak.shock, charge.shock);
    peak.swellJump = Math.max(peak.swellJump, Math.abs(charge.swell - last));
    last = charge.swell;
  }
  return peak;
}

function charged() {
  const { bus, progress, charge } = setup();
  progress.set(ANCHOR);
  bus.emit('experience:charging', { durationMs: 900 });
  run(charge, 0.9);
  bus.emit('experience:charged', undefined);
  return charge;
}

describe('ChargeController', () => {
  it('a carga sobe em curva durante a segura e segura no topo', () => {
    const { bus, progress, charge } = setup();
    progress.set(ANCHOR);
    bus.emit('experience:charging', { durationMs: 900 });
    run(charge, 0.3);
    const early = charge.charge;
    run(charge, 0.6);
    expect(early).toBeLessThan(0.1);
    expect(charge.charge).toBeCloseTo(1, 2);
    expect(charge.swell).toBe(0);
  });

  it('no charged solta um pulso suave que termina sozinho e assenta no brilho calmo', () => {
    const charge = charged();
    const peak = run(charge, BURST_S + 0.1);
    expect(peak.swell).toBeGreaterThan(0.95);
    expect(peak.swell).toBeLessThanOrEqual(1);
    // respiro normalizado (a amplitude de cada cena fica no CoreMotion)
    expect(peak.pulse).toBeGreaterThan(0.95);
    expect(peak.pulse).toBeLessThanOrEqual(1);
    expect(peak.shock).toBeGreaterThan(0.95);
    // fim do pulso: tudo zerado, sem resto de luz
    expect(charge.swell).toBe(0);
    expect(charge.pulse).toBe(0);
    expect(charge.shock).toBe(-1);
    run(charge, 4);
    expect(charge.charge).toBe(0);
    expect(charge.afterglow).toBeCloseTo(1, 2);
  });

  it('o pulso é lento: respiro com pico depois de meio segundo e anel abrindo por mais de 2 s', () => {
    expect(PULSE_S).toBeGreaterThanOrEqual(2);
    expect(SHOCK_S).toBeGreaterThanOrEqual(2.4);
    expect(BURST_S).toBeGreaterThanOrEqual(Math.max(PULSE_S, SHOCK_S));
    const peak = run(charged(), BURST_S);
    expect(peak.pulseAt).toBeGreaterThan(0.5);
    expect(peak.pulseAt).toBeLessThan(1);
  });

  it('a luz sobe macia (sem estalo) e apaga devagar', () => {
    const charge = charged();
    const rise = run(charge, SWELL_RISE_S);
    expect(charge.swell).toBeGreaterThan(0.95);
    // nenhum frame salta mais que 6% de luz
    expect(rise.swellJump).toBeLessThan(0.06);
    run(charge, 0.55);
    expect(charge.swell).toBeGreaterThan(0.5);
    const fall = run(charge, BURST_S);
    expect(fall.swellJump).toBeLessThan(0.06);
    expect(charge.swell).toBe(0);
  });

  it('charged repetido ou sem carga antes não dispara outro pulso', () => {
    const { bus, progress, charge } = setup();
    progress.set(ANCHOR);
    bus.emit('experience:charged', undefined);
    expect(run(charge, 0.5).swell).toBe(0);
  });

  it('reduced motion: sem pulso, entra direto no brilho calmo', () => {
    const { bus, progress, charge } = setup({ instant: true });
    progress.set(ANCHOR);
    bus.emit('experience:charging', { durationMs: 0 });
    bus.emit('experience:charged', undefined);
    const peak = run(charge, 1);
    expect(peak.swell).toBe(0);
    expect(peak.pulse).toBe(0);
    expect(peak.shock).toBe(-1);
    expect(charge.afterglow).toBe(1);
  });

  it('chegou já parado no final (deep link): começa assentado', () => {
    const { charge } = setup({ at: ANCHOR });
    expect(charge.afterglow).toBe(1);
  });
});
