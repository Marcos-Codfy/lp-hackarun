import { Mesh, PlaneGeometry, ShaderMaterial, type Camera, type IUniform, type Vector3 } from 'three';
import { rgb } from '../particles/ColorGrade';
import fragmentShader from '../shaders/shock.frag.glsl?raw';
import { ADDITIVE_LIGHT } from './additiveLight';

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// inclinação do anel: elipse "equatorial", lê como explosão em volta do globo e não como um círculo chapado
const TILT = 1.12;
const GROWTH = 3.4;

type ShockUniforms = {
  uPhase: IUniform<number>;
  uInner: IUniform<Vector3>;
  uOuter: IUniform<Vector3>;
};

// anel de choque do clímax (funciona em todos os tiers; com bloom ganha o halo de verdade)
export class ShockwaveRing {
  readonly mesh: Mesh<PlaneGeometry, ShaderMaterial>;
  private readonly uniforms: ShockUniforms = {
    uPhase: { value: 0 },
    uInner: { value: rgb(0x00e5ff) },
    uOuter: { value: rgb(0xed28e8) },
  };

  constructor() {
    const material = new ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      ...ADDITIVE_LIGHT,
    });
    this.mesh = new Mesh(new PlaneGeometry(2, 2), material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    this.mesh.visible = false;
  }

  // phase < 0 esconde; radius = raio do globo no mundo
  update(phase: number, center: Vector3, radius: number, camera: Camera): void {
    this.mesh.visible = phase >= 0 && phase < 1;
    if (!this.mesh.visible) return;
    const eased = 1 - Math.pow(1 - phase, 3);
    this.uniforms.uPhase.value = phase;
    this.mesh.position.copy(center);
    this.mesh.quaternion.copy(camera.quaternion);
    this.mesh.rotateX(TILT);
    this.mesh.scale.setScalar(radius * (0.95 + eased * GROWTH));
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
