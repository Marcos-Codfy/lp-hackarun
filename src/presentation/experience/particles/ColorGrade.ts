import { Vector3, Vector4 } from 'three';
import type { SceneKey } from '@presentation/app/AppEvents';

// grade de cor de uma forma: fundo → corpo pelo tom da partícula, crista pelo calor, acento por sorteio/calor alto
interface ShapeGrade {
  readonly deep: number;
  readonly body: number;
  readonly crest: number;
  readonly accent: number;
  // fração das partículas (por semente) que vira acento
  readonly accentShare: number;
  // quanto o calor alto (> 0.55) leva pro acento em vez da crista
  readonly heatAccent: number;
  readonly gain: number;
  // quanto o calor acende o miolo do ponto em branco
  readonly whiteHeat: number;
}

const GRADES: Record<SceneKey, ShapeGrade> = {
  // azul elétrico ultra saturado, cristas ciano, faíscas brancas
  core: {
    deep: 0x1f35ff,
    body: 0x1264ff,
    crest: 0x00e5ff,
    accent: 0xf5f8ff,
    accentShare: 0.02,
    heatAccent: 0.35,
    gain: 1.35,
    whiteHeat: 0.6,
  },
  orbit: {
    deep: 0x1f35ff,
    body: 0x00b4ff,
    crest: 0x00e5ff,
    accent: 0x941bff,
    accentShare: 0.16,
    heatAccent: 0,
    gain: 1,
    whiteHeat: 0.7,
  },
  // violeta + magenta, aro ciano (calor do gancho) e um pouco de ciano solto
  enigma: {
    deep: 0x941bff,
    body: 0xed28e8,
    crest: 0x00e5ff,
    accent: 0x00e5ff,
    accentShare: 0.08,
    heatAccent: 0,
    gain: 1,
    whiteHeat: 0.5,
  },
  // rota ciano/azul; calor alto (topo dos faróis) vira laranja conquista
  map: {
    deep: 0x1264ff,
    body: 0x00c8ff,
    crest: 0x7ff0ff,
    accent: 0xff852f,
    accentShare: 0,
    heatAccent: 1,
    gain: 0.9,
    // pouco branco: senão o bloom estoura o topo dos faróis e some o laranja
    whiteHeat: 0.26,
  },
  // grade azul; sol em pôr do sol synthwave: magenta embaixo, laranja no alto
  terrain: {
    deep: 0x1f35ff,
    body: 0x1264ff,
    crest: 0xed28e8,
    accent: 0xff852f,
    accentShare: 0.03,
    heatAccent: 0.8,
    gain: 1,
    whiteHeat: 0.35,
  },
  // telão ciano/branco; feixes (calor > 0.75) puxam pro violeta
  stage: {
    deep: 0x00a8ff,
    body: 0x00e5ff,
    crest: 0xf5f8ff,
    accent: 0x941bff,
    accentShare: 0.04,
    heatAccent: 1,
    gain: 1,
    whiteHeat: 0.6,
  },
  // laranja + ouro, brilhos brancos
  trophy: {
    deep: 0xff852f,
    body: 0xffc24a,
    crest: 0xffe3a3,
    accent: 0xf5f8ff,
    accentShare: 0.02,
    heatAccent: 1,
    gain: 1,
    whiteHeat: 0.9,
  },
  dust: {
    deep: 0x3b5bff,
    body: 0x8a6bff,
    crest: 0xb8c4ff,
    accent: 0xed28e8,
    accentShare: 0.03,
    heatAccent: 0,
    gain: 0.8,
    whiteHeat: 0.3,
  },
};

// magenta da carga final (o globo esquenta pro magenta antes de estourar em branco)
export const CHARGE_TINT = 0xed28e8;

// sRGB cru: o shader não converte espaço de cor
export const rgb = (hex: number): Vector3 =>
  new Vector3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);

// tabelas na ordem dos IDX_* do material (mesma ordem de keys)
export function paletteFor(keys: readonly SceneKey[]): { palette: Vector3[]; grade: Vector4[] } {
  const palette: Vector3[] = [];
  const grade: Vector4[] = [];
  keys.forEach((key) => {
    const g = GRADES[key];
    palette.push(rgb(g.deep), rgb(g.body), rgb(g.crest), rgb(g.accent));
    grade.push(new Vector4(g.accentShare, g.heatAccent, g.gain, g.whiteHeat));
  });
  return { palette, grade };
}
