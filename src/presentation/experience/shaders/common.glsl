// declarações do vertex; HAS_<CENA>, IDX_<CENA>, SHAPE_COUNT e CORE_* chegam como defines do ParticleMaterial
uniform float uTime;
uniform float uFrom;
uniform float uTo;
uniform float uT;
uniform float uVelocity;
uniform float uCharge;
uniform float uPulse;
uniform float uAfterglow;
uniform vec2 uSpin;
uniform vec3 uPointer;
uniform float uPointerStrength;
uniform float uPixelRatio;
uniform float uSize;
// 4 cores por forma: fundo, corpo, crista, acento (ordem dos IDX_*)
uniform vec3 uPalette[SHAPE_COUNT * 4];
// por forma: fração de acento por semente, calor → acento, ganho de cor, calor → branco
uniform vec4 uGrade[SHAPE_COUNT];
uniform vec3 uChargeTint;

attribute vec3 aSeed;
attribute float aScale;

#ifdef HAS_CORE
attribute vec3 aCore;
#endif
#ifdef HAS_ORBIT
attribute vec3 aOrbit;
#endif
#ifdef HAS_ENIGMA
attribute vec3 aEnigma;
#endif
#ifdef HAS_MAP
attribute vec3 aMap;
#endif
#ifdef HAS_TERRAIN
attribute vec3 aTerrain;
#endif
#ifdef HAS_STAGE
attribute vec3 aStage;
#endif
#ifdef HAS_TROPHY
attribute vec3 aTrophy;
#endif
#ifdef HAS_DUST
attribute vec3 aDust;
#endif

varying vec3 vColor;
varying float vAlpha;
varying float vHeat;
varying float vSoft;

vec3 rotY(vec3 p, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}

float hash11(float x) {
  return fract(sin(x) * 43758.5453);
}

// peso da forma idx pra esta partícula: origem perde, destino ganha (from == to dá 1)
float weightOf(float idx, float tp) {
  float isFrom = 1.0 - step(0.5, abs(uFrom - idx));
  float isTo = 1.0 - step(0.5, abs(uTo - idx));
  return isFrom * (1.0 - tp) + isTo * tp;
}

// cor graduada: corpo pelo tom, crista pelo calor, acento por sorteio da semente ou calor alto
vec3 gradeWith(vec3 deep, vec3 body, vec3 crest, vec3 accent, vec4 g, float heat, float tone, float pick) {
  vec3 c = mix(deep, body, tone);
  c = mix(c, crest, smoothstep(0.22, 0.85, heat));
  float share = max(step(1.0 - g.x, pick), smoothstep(0.55, 0.95, heat) * g.y);
  return mix(c, accent, share) * g.z;
}

// índice sempre constante (IDX_* é define): indexação dinâmica de uniform vira um switch enorme no ANGLE/D3D
#define GRADE(IDX, H, TONE, PICK) gradeWith(uPalette[int(IDX) * 4], uPalette[int(IDX) * 4 + 1], uPalette[int(IDX) * 4 + 2], uPalette[int(IDX) * 4 + 3], uGrade[int(IDX)], H, TONE, PICK)
