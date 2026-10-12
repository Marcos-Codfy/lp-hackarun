import { ShaderMaterial, Vector2, Vector3, type IUniform, type Vector4 } from 'three';
import type { SceneKey } from '@presentation/app/AppEvents';
import { CORE_CODE_LEVELS, CORE_CODE_SPAN, CORE_VEIL_RIBBON } from '../shapes/CoreCode';
import { SHAPE_RADIUS } from '../shapes/ShapeStrategy';
import commonGlsl from '../shaders/common.glsl?raw';
import noiseGlsl from '../shaders/noise.glsl?raw';
import coreGlsl from '../shaders/core.glsl?raw';
import shapeHelpersGlsl from '../shaders/shapes/helpers.glsl?raw';
import orbitGlsl from '../shaders/shapes/orbit.glsl?raw';
import enigmaGlsl from '../shaders/shapes/enigma.glsl?raw';
import mapGlsl from '../shaders/shapes/map.glsl?raw';
import terrainGlsl from '../shaders/shapes/terrain.glsl?raw';
import stageGlsl from '../shaders/shapes/stage.glsl?raw';
import trophyGlsl from '../shaders/shapes/trophy.glsl?raw';
import dustGlsl from '../shaders/shapes/dust.glsl?raw';
import vertexGlsl from '../shaders/particles.vert.glsl?raw';
import fragmentGlsl from '../shaders/particles.frag.glsl?raw';
import { ADDITIVE_LIGHT } from '../layers/additiveLight';
import { CHARGE_TINT, paletteFor, rgb } from './ColorGrade';

export type ParticleUniforms = {
  uTime: IUniform<number>;
  // trecho atual da trilha: forma de origem, de destino e progresso 0..1
  uFrom: IUniform<number>;
  uTo: IUniform<number>;
  uT: IUniform<number>;
  uVelocity: IUniform<number>;
  uCharge: IUniform<number>;
  uPulse: IUniform<number>;
  uAfterglow: IUniform<number>;
  uSpin: IUniform<Vector2>;
  // movimento do globo por cena (CoreMotion): fase e amplitude do fluxo, escala do raio, turbulência do voo
  uCoreTime: IUniform<number>;
  uCoreFlow: IUniform<number>;
  uCoreScale: IUniform<number>;
  uFlight: IUniform<number>;
  uPointer: IUniform<Vector3>;
  uPointerStrength: IUniform<number>;
  uPixelRatio: IUniform<number>;
  uSize: IUniform<number>;
  uOpacity: IUniform<number>;
  uHalo: IUniform<number>;
  uPalette: IUniform<Vector3[]>;
  uGrade: IUniform<Vector4[]>;
  uChargeTint: IUniform<Vector3>;
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

const float = (value: number): string => (Number.isInteger(value) ? `${value}.0` : `${value}`);

// cena ausente nem declara atributo: o compilador some com o ramo inteiro
function definesFor(keys: readonly SceneKey[]): Record<string, string | number> {
  const defines: Record<string, string | number> = {
    SHAPE_COUNT: Math.max(1, keys.length),
    CORE_RADIUS: float(SHAPE_RADIUS),
    CORE_CODE_SPAN: float(CORE_CODE_SPAN),
    CORE_CODE_LEVELS: float(CORE_CODE_LEVELS),
    CORE_VEIL_RIBBON: float(CORE_VEIL_RIBBON),
  };
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
  const { palette, grade } = paletteFor(keys);
  const uniforms: ParticleUniforms = {
    uTime: { value: 0 },
    uFrom: { value: 0 },
    uTo: { value: 0 },
    uT: { value: 0 },
    uVelocity: { value: 0 },
    uCharge: { value: 0 },
    uPulse: { value: 0 },
    uAfterglow: { value: 0 },
    uSpin: { value: new Vector2() },
    uCoreTime: { value: 0 },
    uCoreFlow: { value: 1 },
    uCoreScale: { value: 1 },
    uFlight: { value: 1 },
    uPointer: { value: new Vector3(0, 0, 100) },
    uPointerStrength: { value: 0 },
    uPixelRatio: { value: 1 },
    uSize: { value: 5 },
    uOpacity: { value: 1 },
    uHalo: { value: 1 },
    uPalette: { value: palette },
    uGrade: { value: grade },
    uChargeTint: { value: rgb(CHARGE_TINT) },
  };

  const material = new ShaderMaterial({
    uniforms,
    defines: definesFor(keys),
    vertexShader: [
      commonGlsl,
      noiseGlsl,
      coreGlsl,
      // um arquivo por objeto, na mesma ordem de sempre (helpers primeiro)
      shapeHelpersGlsl,
      orbitGlsl,
      enigmaGlsl,
      mapGlsl,
      terrainGlsl,
      stageGlsl,
      trophyGlsl,
      dustGlsl,
      vertexGlsl,
    ].join('\n'),
    fragmentShader: fragmentGlsl,
    ...ADDITIVE_LIGHT,
  });

  return { material, uniforms };
}
