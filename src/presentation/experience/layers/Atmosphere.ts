import type { Camera, Color, Scene, Vector3 } from 'three';
import type { QualityProfile } from '../quality/QualityProfile';
import { BokehLayer } from './BokehLayer';
import { ShockwaveRing } from './ShockwaveRing';
import { StarField } from './StarField';

export interface AtmosphereFrame {
  camera: Camera;
  time: number;
  stars: number;
  bokehA: Color;
  bokehB: Color;
  swell: number;
  shock: number;
  pivot: Vector3;
  radius: number;
}

// camadas de profundidade em volta das partículas: céu ao fundo, bokeh na frente e o anel do clímax
export class Atmosphere {
  private readonly stars: StarField;
  private readonly bokeh: BokehLayer;
  private readonly ring = new ShockwaveRing();

  constructor(scene: Scene, profile: QualityProfile, maxPointSize: number) {
    this.stars = new StarField(profile.stars);
    this.bokeh = new BokehLayer(profile.bokeh, maxPointSize);
    scene.add(this.stars.points, this.bokeh.points, this.ring.mesh);
  }

  // o anel fica invisível até o clímax: no aquecimento ele aparece pra fazer o 1º desenho fora do clímax
  setPriming(priming: boolean): void {
    this.ring.mesh.visible = priming;
  }

  resize(heightPx: number, dpr: number): void {
    this.stars.uniforms.uPixelRatio.value = dpr;
    this.bokeh.resize(heightPx, dpr);
  }

  // tier mais baixo: só esconde o fim dos buffers
  setProfile(profile: QualityProfile): void {
    this.stars.points.geometry.setDrawRange(0, profile.stars);
    this.bokeh.points.geometry.setDrawRange(0, profile.bokeh);
  }

  update(frame: AtmosphereFrame): void {
    // o pulso só acorda o céu e o bokeh um pouco: luz de energia, não clarão
    this.stars.update(frame.time, frame.stars * (0.85 + frame.swell * 0.45));
    this.bokeh.update(frame.camera, frame.time, frame.bokehA, frame.bokehB, frame.swell * 0.6);
    this.ring.update(frame.shock, frame.pivot, frame.radius, frame.camera);
  }

  dispose(): void {
    this.stars.dispose();
    this.bokeh.dispose();
    this.ring.dispose();
  }
}
