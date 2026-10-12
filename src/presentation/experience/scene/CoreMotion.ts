import { lerp, smoothstep } from '@shared/utils/math';

// quanto o globo (e o que mexe nele) se movimenta numa cena
export interface MotionProfile {
  // fluxo das fitas: velocidade do ruído (1/s) e amplitude (x base); a carga soma por cima
  readonly drift: number;
  readonly chargeDrift: number;
  readonly flow: number;
  readonly chargeFlow: number;
  // giro próprio do globo (rad/s)
  readonly spin: number;
  readonly chargeSpin: number;
  // contração na carga, empurrão radial do pulso e respiro (frações do raio)
  readonly squeeze: number;
  readonly pulse: number;
  readonly breath: number;
  // brilho que acompanha o respiro (fração da opacidade)
  readonly glow: number;
  // turbulência do voo entre formas e respiro do scroll rápido (x base)
  readonly flight: number;
  readonly scroll: number;
  // aproximação da câmera na carga (unidades de mundo), câmera na mão e repulsão do ponteiro (x base)
  readonly push: number;
  readonly hand: number;
  readonly pointer: number;
}

type Motion = { -readonly [K in keyof MotionProfile]: MotionProfile[K] };

// todas as cenas, hero incluído: o movimento de sempre
export const BASE_MOTION: MotionProfile = {
  drift: 0.075,
  chargeDrift: 0.42,
  flow: 1,
  chargeFlow: 0.7,
  spin: 0.12,
  chargeSpin: 1.8,
  squeeze: 0.1,
  pulse: 0.15,
  breath: 0,
  glow: 0,
  flight: 1,
  scroll: 1,
  push: 0.3,
  hand: 1,
  pointer: 1,
};

// globo do clímax (#inscricao): composto e legível atrás do título e do CTA. Gira devagar e só respira;
// a carga vira luz (calor, brilho, anel), não agitação, e a chegada vem sem redemoinho
export const FINALE_MOTION: MotionProfile = {
  drift: 0.03,
  chargeDrift: 0,
  flow: 0.5,
  chargeFlow: 0,
  spin: 0.06,
  chargeSpin: 0.1,
  squeeze: 0.025,
  pulse: 0.05,
  breath: 0.016,
  glow: 0.1,
  flight: 0.22,
  scroll: 0.35,
  push: 0.12,
  hand: 0.5,
  pointer: 0.4,
};

const FIELDS = Object.keys(BASE_MOTION) as (keyof MotionProfile)[];

// um respiro inteiro (inspira e expira)
export const BREATH_PERIOD_S = 3.6;
// trecho (em seções) no começo da travessia em que a calma entra: o miolo do voo já chega calmo
const RAMP = 0.2;

// peso do final: 1 na seção do clímax e no trecho que chega ou sai dela, 0 nas outras (anchor < 0: nunca)
export function finaleWeight(position: number, anchor: number): number {
  if (anchor < 0) return 0;
  return smoothstep(1, 1 - RAMP, Math.abs(position - anchor));
}

// respiro com entrada e saída suaves: 0 → 1 → 0 a cada período
export function breathLevel(phase: number): number {
  return 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);
}

// mistura o perfil base com o do final pelo peso da cena e integra no tempo o que não pode saltar
// (fase do fluxo e do respiro); com delta 0 (reduced motion, pausa) nada avança
export class CoreMotion {
  readonly profile: Motion = { ...BASE_MOTION };
  calm = 0;
  // fase do ruído das fitas que vai pro shader
  coreTime = 0;
  // amplitude do fluxo, escala do raio (contração da carga e respiro) e giro do globo
  coreFlow = 1;
  coreScale = 1;
  spinRate = BASE_MOTION.spin;
  // brilho extra do respiro e aproximação da câmera
  glow = 0;
  push = 0;
  // desvio acumulado da fase em relação ao ritmo base (no hero fica 0: mesma fase de sempre)
  private offset = 0;
  private breathPhase = 0;

  constructor(private readonly anchor: number) {}

  update(position: number, charge: number, time: number, delta: number): void {
    this.calm = finaleWeight(position, this.anchor);
    const m = this.profile;
    FIELDS.forEach((field) => (m[field] = lerp(BASE_MOTION[field], FINALE_MOTION[field], this.calm)));

    this.offset += (m.drift + charge * m.chargeDrift - BASE_MOTION.drift) * delta;
    this.coreTime = time * BASE_MOTION.drift + this.offset;
    this.breathPhase = (this.breathPhase + delta / BREATH_PERIOD_S) % 1;
    const breath = breathLevel(this.breathPhase);

    this.coreFlow = m.flow + charge * m.chargeFlow;
    this.coreScale = (1 - charge * m.squeeze) * (1 + breath * m.breath);
    this.spinRate = m.spin + charge * m.chargeSpin;
    this.glow = breath * m.glow;
    this.push = charge * m.push;
  }
}
