import { Color, Vector2 } from 'three';

// parâmetros do pós por frame (o PostDirector escreve, o pipeline lê)
export class PostState {
  bloomStrength = 1;
  bloomRadius = 0.5;
  bloomThreshold = 0.08;
  // tinta dos mips largos do bloom: o halo puxa pra cor da cena
  readonly bloomTint = new Color(1, 1, 1);
  exposure = 1;
  aberration = 0.006;
  vignette = 0.85;
  grain = 0.05;
  // 0..1: zoom blur radial (hiperespaço na travessia do globo)
  warp = 0;
  time = 0;
  // centro do globo na tela (uv), fase do anel de choque (< 0 = desligado) e raio do globo na tela
  // (em alturas de tela): a onda nasce na silhueta e abre por fora, sem varrer o miolo
  readonly focus = new Vector2(0.5, 0.5);
  shockPhase = -1;
  shockRadius = 0.4;
}
