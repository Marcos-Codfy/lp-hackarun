import { BufferAttribute, BufferGeometry, Points, Sphere, Vector3, type ShaderMaterial } from 'three';
import type { SceneKey } from '@presentation/app/AppEvents';
import { SHAPE_RADIUS } from '../shapes/ShapeStrategy';
import type { ParticleBuffers } from './ParticleBuffers';
import { createParticleMaterial, type ParticleUniforms } from './ParticleMaterial';

const ATTRIBUTE: Record<SceneKey, string> = {
  core: 'aCore',
  orbit: 'aOrbit',
  enigma: 'aEnigma',
  map: 'aMap',
  terrain: 'aTerrain',
  stage: 'aStage',
  trophy: 'aTrophy',
  dust: 'aDust',
};

// o que o shader precisa saber a cada frame
export interface ParticleFrame {
  from: number;
  to: number;
  t: number;
  time: number;
  velocity: number;
  charge: number;
  pulse: number;
  afterglow: number;
  opacity: number;
  size: number;
}

// um único THREE.Points com um alvo por cena; o morph inteiro acontece no vertex shader
export class ParticleField {
  readonly points: Points<BufferGeometry, ShaderMaterial>;

  // "position" provisório: o three põe a presença dele na chave do programa, e o compile vem antes dos dados
  private readonly geometry = new BufferGeometry().setAttribute(
    'position',
    new BufferAttribute(new Float32Array(3), 3),
  );

  private constructor(
    private readonly keys: readonly SceneKey[],
    readonly uniforms: ParticleUniforms,
    material: ShaderMaterial,
  ) {
    this.points = new Points(this.geometry, material);
    // as posições reais saem do shader: o bounding box do CPU não serve pra culling
    this.points.frustumCulled = false;
    // a esfera só entra na ordenação da cena, e aqui nem decide (renderOrder único): fixa, o three não
    // varre as dezenas de milhares de pontos no 1º frame
    this.geometry.boundingSphere = new Sphere(new Vector3(), SHAPE_RADIUS);
  }

  // nasce sem dados: o programa depende só do material, então compila enquanto o worker gera as formas
  static create(keys: readonly SceneKey[]): ParticleField {
    const { material, uniforms } = createParticleMaterial(keys);
    return new ParticleField(keys, uniforms, material);
  }

  fill(buffers: ParticleBuffers): void {
    const geometry = this.geometry;
    this.keys.forEach((key, i) => {
      const data = buffers.targets[i];
      // alvo faltando deixaria a forma colapsada na origem: melhor cair no fallback
      if (!data) throw new Error(`missing particle target: ${key}`);
      const target = new BufferAttribute(data, 3);
      geometry.setAttribute(ATTRIBUTE[key], target);
      // o three conta vértices pelo "position": reaproveita o primeiro alvo (mesmo buffer, sem upload extra)
      if (i === 0) geometry.setAttribute('position', target);
    });
    geometry.setAttribute('aSeed', new BufferAttribute(buffers.seeds, 3));
    geometry.setAttribute('aScale', new BufferAttribute(buffers.scales, 1));
  }

  update(frame: ParticleFrame): void {
    const u = this.uniforms;
    u.uFrom.value = frame.from;
    u.uTo.value = frame.to;
    u.uT.value = frame.t;
    u.uTime.value = frame.time;
    u.uVelocity.value = frame.velocity;
    u.uCharge.value = frame.charge;
    u.uPulse.value = frame.pulse;
    u.uAfterglow.value = frame.afterglow;
    u.uOpacity.value = frame.opacity;
    u.uSize.value = frame.size;
  }

  // rebaixar o tier só esconde o fim do buffer (a permutação comum mantém as formas inteiras)
  setVisibleCount(count: number): void {
    this.geometry.setDrawRange(0, count);
  }

  dispose(): void {
    this.geometry.dispose();
    this.points.material.dispose();
  }
}
