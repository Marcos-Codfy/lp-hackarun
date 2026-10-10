import {
  BufferAttribute,
  BufferGeometry,
  Points,
  ShaderMaterial,
  Vector3,
  type Camera,
  type Color,
  type IUniform,
} from 'three';
import { seededRandom } from '@shared/utils/math';
import fragmentShader from '../shaders/bokeh.frag.glsl?raw';
import vertexShader from '../shaders/bokeh.vert.glsl?raw';
import { ADDITIVE_LIGHT } from './additiveLight';

// caixa de bokeh: metade da largura/altura/profundidade e distância do centro à lente
const BOX = new Vector3(3.4, 2.3, 1.8);
const AHEAD = 2.3;
const OPACITY = 0.18;

type BokehUniforms = {
  uTime: IUniform<number>;
  uPixelRatio: IUniform<number>;
  uScale: IUniform<number>;
  uMaxSize: IUniform<number>;
  uOpacity: IUniform<number>;
  uCenter: IUniform<Vector3>;
  uBox: IUniform<Vector3>;
  uColorA: IUniform<Vector3>;
  uColorB: IUniform<Vector3>;
};

// poucas luzes grandes e desfocadas passando perto da lente; bem fracas pra não brigar com o texto
export class BokehLayer {
  readonly points: Points<BufferGeometry, ShaderMaterial>;
  readonly uniforms: BokehUniforms = {
    uTime: { value: 0 },
    uPixelRatio: { value: 1 },
    uScale: { value: 90 },
    uMaxSize: { value: 256 },
    uOpacity: { value: OPACITY },
    uCenter: { value: new Vector3() },
    uBox: { value: BOX.clone() },
    uColorA: { value: new Vector3(0.07, 0.39, 1) },
    uColorB: { value: new Vector3(0, 0.9, 1) },
  };
  private readonly forward = new Vector3();

  constructor(count: number, maxPointSize: number) {
    this.uniforms.uMaxSize.value = maxPointSize;
    const material = new ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      ...ADDITIVE_LIGHT,
    });
    this.points = new Points(this.build(count), material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 2;
  }

  // escala do ponto acompanha a altura da tela (mesmo tamanho aparente em qualquer monitor)
  resize(heightPx: number, dpr: number): void {
    this.uniforms.uScale.value = heightPx * 0.13;
    this.uniforms.uPixelRatio.value = dpr;
  }

  update(camera: Camera, time: number, colorA: Color, colorB: Color, boost: number): void {
    const u = this.uniforms;
    camera.getWorldDirection(this.forward);
    u.uCenter.value.copy(camera.position).addScaledVector(this.forward, AHEAD);
    u.uTime.value = time;
    u.uColorA.value.set(colorA.r, colorA.g, colorA.b);
    u.uColorB.value.set(colorB.r, colorB.g, colorB.b);
    u.uOpacity.value = OPACITY * (1 + boost);
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.points.material.dispose();
  }

  private build(count: number): BufferGeometry {
    const random = seededRandom(20261112);
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = random() * 2 - 1;
      positions[i * 3 + 1] = random() * 2 - 1;
      positions[i * 3 + 2] = random() * 2 - 1;
      sizes[i] = 0.5 + Math.pow(random(), 2) * 1.4;
      phases[i] = random();
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new BufferAttribute(sizes, 1));
    geometry.setAttribute('aPhase', new BufferAttribute(phases, 1));
    return geometry;
  }
}
