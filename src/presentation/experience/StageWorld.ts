import { PerspectiveCamera, Scene } from 'three';
import type { AppContext } from '@presentation/app/AppContext';
import type { SceneKey } from '@presentation/app/AppEvents';
import { CameraRig } from './camera/CameraRig';
import { PointerTracker } from './input/PointerTracker';
import { Atmosphere } from './layers/Atmosphere';
import type { ParticleField } from './particles/ParticleField';
import { PostDirector } from './post/PostDirector';
import type { PostState } from './post/PostState';
import type { EffectsLevel, QualityProfile } from './quality/QualityProfile';
import { ChargeController } from './scene/ChargeController';
import { SceneLayout } from './scene/SceneLayout';
import type { SceneMixer } from './scene/SceneMixer';
import { ShapeSpin } from './scene/ShapeSpin';
import { SHAPE_RADIUS } from './shapes/ShapeStrategy';

const FOV = 40;
const CAMERA_Z = 6;
const POINT_SIZE = 3.4;
// com bloom de verdade o sprite fica quase nítido (linhas de pontos); sem bloom, halo fake inteiro
const HALO = { full: 0.12, half: 0.2, off: 1 } as const;

export interface WorldParts {
  field: ParticleField;
  mixer: SceneMixer;
  keys: readonly SceneKey[];
  profile: QualityProfile;
  holdIndex: number;
  maxPointSize: number;
}

// o mundo 3D de um frame: trilha → formas → layout → câmera → camadas → luz do pós
export class StageWorld {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(FOV, 1, 0.1, 120);
  private readonly field: ParticleField;
  private readonly mixer: SceneMixer;
  private readonly keys: readonly SceneKey[];
  private readonly spin = new ShapeSpin();
  private readonly layout: SceneLayout;
  private readonly rig: CameraRig;
  private readonly atmosphere: Atmosphere;
  private readonly director: PostDirector;
  private readonly pointer: PointerTracker | null;
  private readonly charge: ChargeController;
  private readonly reduced: boolean;
  private readonly coreIndex: number;
  private profile: QualityProfile;
  // ponto acompanha o tamanho da tela: no celular a forma é bem menor e o ponto cheio vira bolha
  private pointFit = 1;

  constructor(
    parts: WorldParts,
    private readonly ctx: AppContext,
  ) {
    this.field = parts.field;
    this.mixer = parts.mixer;
    this.keys = parts.keys;
    this.profile = parts.profile;
    this.reduced = ctx.reducedMotion;
    this.coreIndex = parts.mixer.indexOf('core');

    this.scene.add(this.field.points);
    this.field.uniforms.uSpin.value = this.spin.angles;
    this.layout = new SceneLayout(parts.keys);
    this.rig = new CameraRig(this.camera, parts.keys, CAMERA_Z, FOV, !this.reduced);
    this.atmosphere = new Atmosphere(this.scene, parts.profile, parts.maxPointSize);
    this.director = new PostDirector(parts.keys);
    this.pointer = this.reduced || ctx.coarsePointer ? null : new PointerTracker(this.camera);
    this.charge = new ChargeController(ctx.bus, ctx.scenes.progress, parts.holdIndex, this.reduced);
  }

  get post(): PostState {
    return this.director.state;
  }

  // o anel fica escondido até o clímax: na compilação adiantada ele precisa entrar na fila
  setCompiling(compiling: boolean): void {
    this.atmosphere.setCompiling(compiling);
  }

  setEffects(level: EffectsLevel): void {
    this.field.uniforms.uHalo.value = HALO[level];
  }

  setProfile(profile: QualityProfile): void {
    this.profile = profile;
    this.field.setVisibleCount(profile.count);
    this.atmosphere.setProfile(profile);
  }

  resize(width: number, height: number, dpr: number): void {
    this.pointFit = Math.min(1.15, Math.max(0.55, Math.min(width, height) / 820));
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    const halfHeight = CAMERA_Z * Math.tan((FOV * Math.PI) / 360);
    this.layout.resize(halfHeight * this.camera.aspect, halfHeight);
    this.field.uniforms.uPixelRatio.value = dpr;
    this.atmosphere.resize(height, dpr);
  }

  // snap: entra direto na cena atual (primeiro frame e reduced motion)
  update(time: number, delta: number, snap: boolean): void {
    const velocity = this.reduced ? 0 : this.ctx.scenes.velocity.value;
    const { mixer, charge } = this;
    mixer.update(this.ctx.scenes.progress.value, delta, snap);
    charge.update(delta);
    if (!this.reduced) this.spin.update(delta, charge.charge);

    const weights = mixer.weights;
    const opacity = this.layout.apply(weights, this.field.points);
    const pivot = this.field.points.position;
    this.pointer?.update(delta);
    const from = this.keys[mixer.from] ?? 'core';
    const to = this.keys[mixer.to] ?? 'core';
    const { flash, shock, afterglow } = charge;
    this.rig.update(
      { weights, from, to, t: mixer.t, pivot, charge: charge.charge, flash, velocity, time, delta },
      this.pointer,
    );
    this.camera.updateMatrixWorld();

    this.field.update({
      from: mixer.from,
      to: mixer.to,
      t: mixer.t,
      time,
      velocity,
      charge: charge.charge,
      pulse: charge.pulse,
      afterglow,
      // o flash também acende as partículas (no tier sem bloom é o único flash)
      opacity: opacity * this.profile.alpha * (1 + flash * 0.6),
      size: POINT_SIZE * this.profile.pointScale * this.pointFit,
    });
    this.updatePointer(weights);

    const post = { charge: charge.charge, flash, shockPhase: shock, afterglow, warp: this.rig.warp };
    this.director.update({ weights, ...post, velocity, time, pivot }, this.camera);
    const d = this.director;
    const radius = this.field.points.scale.x * SHAPE_RADIUS;
    const layers = { stars: d.stars, bokehA: d.bokehA, bokehB: d.bokehB, flash, shock, pivot, radius };
    this.atmosphere.update({ camera: this.camera, time, ...layers });
  }

  dispose(): void {
    this.pointer?.dispose();
    this.charge.dispose();
    this.field.dispose();
    this.atmosphere.dispose();
  }

  private updatePointer(weights: Float32Array): void {
    if (!this.pointer) return;
    const u = this.field.uniforms;
    u.uPointer.value.copy(this.pointer.world);
    // repulsão forte no globo, quase nada nas outras formas
    u.uPointerStrength.value = this.pointer.active * (0.15 + 0.85 * (weights[this.coreIndex] ?? 0));
  }
}
