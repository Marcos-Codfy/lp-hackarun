import type { SceneKey } from '@presentation/app/AppEvents';

// enquadramento de cada cena, relativo à câmera base (z = 6 olhando a origem)
export interface Shot {
  // translação da câmera: lateral, altura (grua) e profundidade (negativo = mais perto)
  readonly truck: number;
  readonly crane: number;
  readonly dolly: number;
  // y do ponto de mira (negativo = olha pra baixo)
  readonly aim: number;
  readonly fov: number;
  // órbita lenta em volta da forma (rad) e velocidade (rad/s do seno)
  readonly yaw: number;
  readonly pitch: number;
  readonly speed: number;
  // vaivém lateral (travelling) em unidades de mundo
  readonly track: number;
}

export const SHOT_FIELDS = [
  'truck',
  'crane',
  'dolly',
  'aim',
  'fov',
  'yaw',
  'pitch',
  'speed',
  'track',
] as const;

const still = (shot: Partial<Shot>): Shot => ({
  truck: 0,
  crane: 0,
  dolly: 0,
  aim: 0,
  fov: 0,
  yaw: 0,
  pitch: 0,
  speed: 0.1,
  track: 0,
  ...shot,
});

export const SHOTS: Record<SceneKey, Shot> = {
  // hero: quase parado, só respira
  core: still({ yaw: 0.05, pitch: 0.03, speed: 0.09 }),
  // giroscópio: um pouco acima, órbita lenta
  orbit: still({ crane: 0.35, dolly: -0.4, aim: -0.05, yaw: 0.32, pitch: 0.08, speed: 0.11 }),
  // "?": órbita lenta mantendo a composição ao lado do texto
  enigma: still({ dolly: -0.2, yaw: 0.28, pitch: 0.06, speed: 0.12 }),
  // mapa: travelling suave por cima
  map: still({ crane: 0.45, dolly: -0.2, aim: -0.12, yaw: 0.06, speed: 0.08, track: 0.35 }),
  // arena: grua alta olhando o piso
  // yaw baixo: o sol fica longe do pivô e um giro maior tira ele do quadro no celular
  terrain: still({ crane: 1.05, dolly: 0.1, aim: -0.5, yaw: 0.03, pitch: 0.04, speed: 0.07, fov: 2 }),
  // telão: chega perto (push-in)
  stage: still({ crane: 0.12, dolly: -0.75, aim: 0.02, yaw: 0.12, speed: 0.09 }),
  // troféu: órbita lenta
  trophy: still({ crane: 0.18, dolly: -0.3, yaw: 0.34, pitch: 0.05, speed: 0.13 }),
  // poeira: dentro da nuvem (a volta pro globo final vira um pull-back)
  dust: still({ dolly: -1.4, yaw: 0.08, speed: 0.05 }),
};
