import { Vector2 } from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import fragmentShader from '../shaders/cinematic.frag.glsl?raw';
import type { PostState } from './PostState';

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// passe final de "lente": grade e textura de cinema por cima do bloom
export class CinematicPass extends ShaderPass {
  constructor() {
    super({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new Vector2(1, 1) },
        uTime: { value: 0 },
        uExposure: { value: 1 },
        uFlash: { value: 0 },
        uAberration: { value: 0 },
        uVignette: { value: 0 },
        uGrain: { value: 0 },
        uWarp: { value: 0 },
        uFocus: { value: new Vector2(0.5, 0.5) },
        uShock: { value: -1 },
      },
      vertexShader,
      fragmentShader,
    });
  }

  override setSize(width: number, height: number): void {
    (this.uniforms['uResolution']?.value as Vector2).set(width, height);
  }

  apply(state: PostState): void {
    const u = this.uniforms;
    const set = (name: string, value: number): void => {
      const uniform = u[name];
      if (uniform) uniform.value = value;
    };
    set('uTime', state.time);
    set('uExposure', state.exposure);
    set('uFlash', state.flash);
    set('uAberration', state.aberration);
    set('uVignette', state.vignette);
    set('uGrain', state.grain);
    set('uWarp', state.warp);
    set('uShock', state.shockPhase);
    (u['uFocus']?.value as Vector2).copy(state.focus);
  }
}
