import { PerspectiveCamera, Scene, type WebGLRenderer } from 'three';
import type { AppContext } from '@presentation/app/AppContext';
import type { QualityTier, SceneKey } from '@presentation/app/AppEvents';
import { CameraRig } from './camera/CameraRig';
import { CanvasResizer } from './CanvasResizer';
import { FrameLoop } from './FrameLoop';
import { PointerTracker } from './input/PointerTracker';
import type { ParticleField } from './particles/ParticleField';
import { AdaptiveQuality, type QualityTarget } from './quality/AdaptiveQuality';
import type { QualityProfile } from './quality/QualityProfile';
import { ChargeController } from './scene/ChargeController';
import { SceneLayout } from './scene/SceneLayout';
import type { SceneMixer } from './scene/SceneMixer';
import { ShapeSpin } from './scene/ShapeSpin';
import { StageStatus } from './StageStatus';

const FOV = 40;
const CAMERA_Z = 6;
const POINT_SIZE = 5.6;

export interface StageParts {
  renderer: WebGLRenderer;
  field: ParticleField;
  mixer: SceneMixer;
  keys: readonly SceneKey[];
  profile: QualityProfile;
  holdIndex: number;
}

// Facade: o resto do app só enxerga start/dispose; three.js fica todo aqui dentro (montado pelo StageBuilder)
export class ExperienceStage implements QualityTarget {
  readonly tier: QualityTier;
  private readonly renderer: WebGLRenderer;
  private readonly field: ParticleField;
  private readonly mixer: SceneMixer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(FOV, 1, 0.1, 60);
  private readonly status = new StageStatus();
  private readonly spin = new ShapeSpin();
  private readonly layout: SceneLayout;
  private readonly rig: CameraRig;
  private readonly pointer: PointerTracker | null;
  private readonly charge: ChargeController;
  private readonly adaptive: AdaptiveQuality | null;
  private readonly loop: FrameLoop;
  private readonly resizer: CanvasResizer;
  private readonly reduced: boolean;
  private readonly coreIndex: number;
  private readonly offs: (() => void)[] = [];
  private profile: QualityProfile;
  private dprCap: number;
  private size = { width: 1, height: 1 };
  private startTime = -1;
  private shaderError = false;

  constructor(
    parts: StageParts,
    private readonly ctx: AppContext,
  ) {
    this.renderer = parts.renderer;
    this.field = parts.field;
    this.mixer = parts.mixer;
    this.profile = parts.profile;
    this.tier = parts.profile.tier;
    this.reduced = ctx.reducedMotion;
    this.dprCap = parts.profile.maxDpr;
    this.coreIndex = this.mixer.indexOf('core');

    this.camera.position.set(0, 0, CAMERA_Z);
    this.scene.add(this.field.points);
    this.field.uniforms.uSpin.value = this.spin.angles;
    this.layout = new SceneLayout(parts.keys);
    this.rig = new CameraRig(this.camera, parts.keys, CAMERA_Z, !this.reduced);
    this.pointer = this.reduced || ctx.coarsePointer ? null : new PointerTracker(this.camera);
    this.charge = new ChargeController(ctx.bus, ctx.scenes.progress, parts.holdIndex, this.reduced);
    this.adaptive = this.reduced
      ? null
      : new AdaptiveQuality(parts.profile, this, window.devicePixelRatio || 1);
    this.loop = new FrameLoop(this.frame, !this.reduced, () => this.adaptive?.reset());
    this.resizer = new CanvasResizer(this.renderer.domElement, this.applySize);

    // reduced motion: só desenha quando a cena ou a carga mudam
    if (this.reduced) {
      this.offs.push(ctx.scenes.progress.subscribe(() => this.loop.invalidate(), { immediate: false }));
      this.offs.push(ctx.bus.on('experience:charging', () => this.loop.invalidate()));
    }
    // shader que não compila não lança erro: sem isso o canvas ficaria vazio e o fallback sumiria
    this.renderer.debug.onShaderError = (gl, program, vertex, fragment) => {
      this.shaderError = true;
      console.error(
        '[experience] shader error',
        gl.getProgramInfoLog(program),
        gl.getShaderInfoLog(vertex),
        gl.getShaderInfoLog(fragment),
      );
    };
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.onContextRestored);
  }

  start(onReady: () => void, onFail: (reason: string) => void): void {
    this.status.listen(onReady, onFail);
    this.resizer.measureNow();
    this.loop.start();
  }

  setPixelRatioCap(cap: number): void {
    this.dprCap = cap;
    this.applySize(this.size.width, this.size.height);
  }

  setProfile(profile: QualityProfile): void {
    this.profile = profile;
    this.field.setVisibleCount(profile.count);
  }

  dispose(): void {
    this.loop.dispose();
    this.resizer.dispose();
    this.pointer?.dispose();
    this.charge.dispose();
    this.offs.forEach((off) => off());
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.onContextRestored);
    this.field.dispose();
    this.renderer.dispose();
    this.status.hide();
  }

  private readonly frame = (time: number, delta: number): void => {
    if (this.startTime < 0) this.startTime = time;
    const { progress, velocity } = this.ctx.scenes;
    // primeiro frame entra direto na cena atual (recarregar no meio da página não morfa do zero)
    this.mixer.update(progress.value, delta, this.reduced || !this.status.ready);
    this.charge.update(delta);
    if (!this.reduced) this.spin.update(delta, this.charge.charge);

    const weights = this.mixer.weights;
    const opacity = this.layout.apply(weights, this.field.points);
    this.pointer?.update(delta);
    this.rig.update(weights, this.pointer, this.charge.charge, time, delta);

    const u = this.field.uniforms;
    u.uFrom.value = this.mixer.from;
    u.uTo.value = this.mixer.to;
    u.uT.value = this.mixer.t;
    u.uTime.value = this.reduced ? 0 : time - this.startTime;
    u.uVelocity.value = this.reduced ? 0 : velocity.value;
    u.uCharge.value = this.charge.charge;
    u.uPulse.value = this.charge.pulse;
    u.uOpacity.value = opacity * this.profile.alpha;
    u.uSize.value = POINT_SIZE * this.profile.pointScale;
    if (this.pointer) {
      u.uPointer.value.copy(this.pointer.world);
      // repulsão forte no globo, quase nada nas outras formas
      u.uPointerStrength.value = this.pointer.active * (0.15 + 0.85 * (weights[this.coreIndex] ?? 0));
    }

    this.renderer.render(this.scene, this.camera);
    if (this.shaderError) {
      this.loop.setEnabled(false);
      this.status.fail('shader-error');
      return;
    }
    this.adaptive?.sample(delta);
    this.status.markReady();
  };

  private readonly applySize = (width: number, height: number): void => {
    this.size = { width, height };
    const dpr = Math.min(window.devicePixelRatio || 1, this.dprCap);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    const halfHeight = CAMERA_Z * Math.tan((FOV * Math.PI) / 360);
    this.layout.resize(halfHeight * this.camera.aspect, halfHeight);
    this.field.uniforms.uPixelRatio.value = dpr;
    this.loop.invalidate();
  };

  // GPU reiniciou: volta o brilho em CSS até o three restaurar o contexto
  private readonly onContextLost = (): void => {
    this.status.hide();
    this.loop.setEnabled(false);
  };

  private readonly onContextRestored = (): void => {
    if (!this.status.failed) this.loop.setEnabled(true);
  };
}
