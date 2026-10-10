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
  flash: number;
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

  // o anel fica invisível até o clímax: na compilação adiantada ele precisa aparecer pra entrar na fila
  setCompiling(compiling: boolean): void {
    this.ring.mesh.visible = compiling;
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
    this.stars.update(frame.time, frame.stars * (0.85 + frame.flash * 1.5));
    this.bokeh.update(frame.camera, frame.time, frame.bokehA, frame.bokehB, frame.flash * 2);
    this.ring.update(frame.shock, frame.pivot, frame.radius, frame.camera);
  }

  dispose(): void {
    this.stars.dispose();
    this.bokeh.dispose();
    this.ring.dispose();
  }
}
