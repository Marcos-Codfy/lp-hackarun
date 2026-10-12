// clímax do globo: carga em curva, pulso suave (sem estouro) que some sozinho e brilho calmo no fim
import { describe, expect, it } from 'vitest';
import { EventBus } from '@shared/core/EventBus';
import { Observable } from '@shared/core/Observable';
import type { AppEvents } from '@presentation/app/AppEvents';
import { ChargeController } from '@presentation/experience/scene/ChargeController';

const ANCHOR = 9;
const STEP = 1 / 60;

function setup({ instant = false, at = ANCHOR - 2 } = {}) {
  const bus = new EventBus<AppEvents>();
  const progress = new Observable(at);
  const charge = new ChargeController(bus, progress, ANCHOR, instant);
  return { bus, progress, charge };
}

// avança o controlador por `seconds` e devolve o pico de cada envelope no caminho
function run(charge: ChargeController, seconds: number) {
  const peak = { swell: 0, pulse: 0, shock: -1 };
  for (let t = 0; t < seconds; t += STEP) {
    charge.update(STEP);
    peak.swell = Math.max(peak.swell, charge.swell);
    peak.pulse = Math.max(peak.pulse, charge.pulse);
    peak.shock = Math.max(peak.shock, charge.shock);
  }
  return peak;
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
    const { bus, progress, charge } = setup();
    progress.set(ANCHOR);
    bus.emit('experience:charging', { durationMs: 900 });
    run(charge, 0.9);
    bus.emit('experience:charged', undefined);
    const peak = run(charge, 2);
    expect(peak.swell).toBeGreaterThan(0.9);
    expect(peak.swell).toBeLessThanOrEqual(1);
    expect(peak.pulse).toBeGreaterThan(0.3);
    expect(peak.pulse).toBeLessThan(0.7);
    expect(peak.shock).toBeGreaterThan(0.9);
    // fim do pulso: tudo zerado, sem resto de luz
    expect(charge.swell).toBe(0);
    expect(charge.pulse).toBe(0);
    expect(charge.shock).toBe(-1);
    run(charge, 3);
    expect(charge.charge).toBe(0);
    expect(charge.afterglow).toBeCloseTo(1, 2);
  });

  it('a luz do pulso sobe rápido e já está caindo antes de meio segundo', () => {
    const { bus, progress, charge } = setup();
    progress.set(ANCHOR);
    bus.emit('experience:charging', { durationMs: 900 });
    run(charge, 0.9);
    bus.emit('experience:charged', undefined);
    run(charge, 0.22);
    const top = charge.swell;
    run(charge, 0.3);
    expect(top).toBeGreaterThan(0.95);
    expect(charge.swell).toBeLessThan(0.5);
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
