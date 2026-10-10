import {
  AddEquation,
  CustomBlending,
  OneFactor,
  OneMinusSrcAlphaFactor,
  ShaderMaterial,
  Vector2,
  Vector3,
  type IUniform,
} from 'three';
import type { SceneKey } from '@presentation/app/AppEvents';
import commonGlsl from '../shaders/common.glsl?raw';
import noiseGlsl from '../shaders/noise.glsl?raw';
import coreGlsl from '../shaders/core.glsl?raw';
import shapesGlsl from '../shaders/shapes.glsl?raw';
import vertexGlsl from '../shaders/particles.vert.glsl?raw';
import fragmentGlsl from '../shaders/particles.frag.glsl?raw';

export type ParticleUniforms = {
  uTime: IUniform<number>;
  // trecho atual da trilha: forma de origem, de destino e progresso 0..1
  uFrom: IUniform<number>;
  uTo: IUniform<number>;
  uT: IUniform<number>;
  uVelocity: IUniform<number>;
  uCharge: IUniform<number>;
  uPulse: IUniform<number>;
  uSpin: IUniform<Vector2>;
  uPointer: IUniform<Vector3>;
  uPointerStrength: IUniform<number>;
  uPixelRatio: IUniform<number>;
  uSize: IUniform<number>;
  uOpacity: IUniform<number>;
  uColorCyan: IUniform<Vector3>;
  uColorRoyal: IUniform<Vector3>;
  uColorHot: IUniform<Vector3>;
  uColorAmber: IUniform<Vector3>;
};

const ALL_KEYS: readonly SceneKey[] = [
  'core',
  'orbit',
  'enigma',
  'map',
  'terrain',
  'stage',
  'trophy',
  'dust',
];

// cores da paleta em sRGB direto (o shader não converte espaço de cor)
const rgb = (hex: number): Vector3 =>
  new Vector3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);

// cena ausente nem declara atributo: o compilador some com o ramo inteiro
function definesFor(keys: readonly SceneKey[]): Record<string, string | number> {
  const defines: Record<string, string | number> = {};
  ALL_KEYS.forEach((key) => {
    const index = keys.indexOf(key);
    if (index < 0) return;
    const name = key.toUpperCase();
    defines[`HAS_${name}`] = '';
    defines[`IDX_${name}`] = `${index}.0`;
  });
  return defines;
}

export function createParticleMaterial(keys: readonly SceneKey[]): {
  material: ShaderMaterial;
  uniforms: ParticleUniforms;
} {
  const uniforms: ParticleUniforms = {
    uTime: { value: 0 },
    uFrom: { value: 0 },
    uTo: { value: 0 },
    uT: { value: 0 },
    uVelocity: { value: 0 },
    uCharge: { value: 0 },
    uPulse: { value: 0 },
    uSpin: { value: new Vector2() },
    uPointer: { value: new Vector3(0, 0, 100) },
    uPointerStrength: { value: 0 },
    uPixelRatio: { value: 1 },
    uSize: { value: 5 },
    uOpacity: { value: 1 },
    uColorCyan: { value: rgb(0x00cfff) },
    uColorRoyal: { value: rgb(0x1e7bff) },
    uColorHot: { value: rgb(0xffffff) },
    uColorAmber: { value: rgb(0xffb547) },
  };

  const material = new ShaderMaterial({
    uniforms,
    defines: definesFor(keys),
    vertexShader: [commonGlsl, noiseGlsl, coreGlsl, shapesGlsl, vertexGlsl].join('\n'),
    fragmentShader: fragmentGlsl,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    // aditivo na cor, alpha "over": brilha somando sem estourar o alpha do canvas transparente
    blending: CustomBlending,
    blendEquation: AddEquation,
    blendSrc: OneFactor,
    blendDst: OneFactor,
    blendSrcAlpha: OneFactor,
    blendDstAlpha: OneMinusSrcAlphaFactor,
  });

  return { material, uniforms };
}
