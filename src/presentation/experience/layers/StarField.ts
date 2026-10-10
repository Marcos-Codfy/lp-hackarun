import { BufferAttribute, BufferGeometry, Points, ShaderMaterial, type IUniform } from 'three';
import { seededRandom } from '@shared/utils/math';
import fragmentShader from '../shaders/stars.frag.glsl?raw';
import vertexShader from '../shaders/stars.vert.glsl?raw';
import { ADDITIVE_LIGHT } from './additiveLight';

const NEAR = 28;
const FAR = 52;
// cone à frente da câmera: as órbitas lentas nunca mostram o "fim" do céu
const CONE = 1.25;
// gelo, azul elétrico claro, violeta, ciano (sRGB cru)
const TINTS: readonly (readonly [number, number, number])[] = [
  [0.85, 0.9, 1],
  [0.55, 0.66, 1],
  [0.72, 0.56, 1],
  [0.5, 0.92, 1],
];

type StarUniforms = {
  uTime: IUniform<number>;
  uPixelRatio: IUniform<number>;
  uOpacity: IUniform<number>;
};

// campo de estrelas bem ao fundo: pontos minúsculos, paralaxe natural pela distância
export class StarField {
  readonly points: Points<BufferGeometry, ShaderMaterial>;
  readonly uniforms: StarUniforms = {
    uTime: { value: 0 },
    uPixelRatio: { value: 1 },
    uOpacity: { value: 0.85 },
  };

  constructor(count: number) {
    const geometry = this.build(count);
    const material = new ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      ...ADDITIVE_LIGHT,
    });
    this.points = new Points(geometry, material);
    this.points.frustumCulled = false;
    this.points.renderOrder = -2;
  }

  update(time: number, opacity: number): void {
    this.uniforms.uTime.value = time;
    this.uniforms.uOpacity.value = opacity;
    // o céu gira quase nada: dá vida sem chamar atenção
    this.points.rotation.z = time * 0.004;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.points.material.dispose();
  }

  private build(count: number): BufferGeometry {
    const random = seededRandom(20261031);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const angle = Math.acos(1 - random() * (1 - Math.cos(CONE)));
      const around = random() * Math.PI * 2;
      const r = NEAR + random() * (FAR - NEAR);
      positions[i * 3] = Math.sin(angle) * Math.cos(around) * r;
      positions[i * 3 + 1] = Math.sin(angle) * Math.sin(around) * r * 0.8;
      positions[i * 3 + 2] = -Math.cos(angle) * r;
      // poucas estrelas fortes, muitas quase invisíveis
      const bright = Math.pow(random(), 3);
      const tint = TINTS[Math.floor(random() * TINTS.length)] ?? TINTS[0] ?? [1, 1, 1];
      const gain = 0.25 + bright * 0.75;
      colors[i * 3] = tint[0] * gain;
      colors[i * 3 + 1] = tint[1] * gain;
      colors[i * 3 + 2] = tint[2] * gain;
      sizes[i] = 1.4 + bright * 2.6;
      phases[i] = random();
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('aColor', new BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new BufferAttribute(sizes, 1));
    geometry.setAttribute('aPhase', new BufferAttribute(phases, 1));
    return geometry;
  }
}
