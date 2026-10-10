import { BufferAttribute, BufferGeometry, Points, type ShaderMaterial } from 'three';
import type { SceneKey } from '@presentation/app/AppEvents';
import { seededRandom } from '@shared/utils/math';
import type { ShapeFactory } from '../shapes/ShapeFactory';
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

// devolve a thread pro navegador entre uma forma e outra (sem travar input)
const yieldToMain = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

// um único THREE.Points com um alvo por cena; o morph inteiro acontece no vertex shader
export class ParticleField {
  readonly points: Points<BufferGeometry, ShaderMaterial>;

  private constructor(
    private readonly geometry: BufferGeometry,
    readonly uniforms: ParticleUniforms,
    material: ShaderMaterial,
  ) {
    this.points = new Points(geometry, material);
    // as posições reais saem do shader: o bounding box do CPU não serve pra culling
    this.points.frustumCulled = false;
  }

  static async create(
    keys: readonly SceneKey[],
    count: number,
    factory: ShapeFactory,
  ): Promise<ParticleField> {
    const geometry = new BufferGeometry();
    for (const key of keys) {
      const target = new BufferAttribute(factory.build(key, count), 3);
      geometry.setAttribute(ATTRIBUTE[key], target);
      // o three conta vértices pelo "position": reaproveita o primeiro alvo (mesmo buffer, sem upload extra)
      if (!geometry.hasAttribute('position')) geometry.setAttribute('position', target);
      await yieldToMain();
    }

    const random = seededRandom(20261111);
    const seeds = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      seeds[i * 3] = random() * 2 - 1;
      seeds[i * 3 + 1] = random() * 2 - 1;
      seeds[i * 3 + 2] = random() * 2 - 1;
      // maioria pequena, umas poucas grandes que viram "estrelas"
      scales[i] = 0.55 + Math.pow(random(), 4) * 1.6;
    }
    geometry.setAttribute('aSeed', new BufferAttribute(seeds, 3));
    geometry.setAttribute('aScale', new BufferAttribute(scales, 1));

    const { material, uniforms } = createParticleMaterial(keys);
    return new ParticleField(geometry, uniforms, material);
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
