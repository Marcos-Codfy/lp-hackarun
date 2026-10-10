// declarações do vertex; HAS_<CENA> e IDX_<CENA> chegam como defines do ParticleMaterial
uniform float uTime;
uniform float uFrom;
uniform float uTo;
uniform float uT;
uniform float uVelocity;
uniform float uCharge;
uniform float uPulse;
uniform vec2 uSpin;
uniform vec3 uPointer;
uniform float uPointerStrength;
uniform float uPixelRatio;
uniform float uSize;

attribute vec3 aSeed;
attribute float aScale;

#ifdef HAS_CORE
attribute vec3 aCore;
#endif
#ifdef HAS_NEBULA
attribute vec3 aNebula;
#endif
#ifdef HAS_ENIGMA
attribute vec3 aEnigma;
#endif
#ifdef HAS_ROUTE
attribute vec3 aRoute;
#endif
#ifdef HAS_ARENA
attribute vec3 aArena;
#endif
#ifdef HAS_SCREEN
attribute vec3 aScreen;
#endif
#ifdef HAS_TROPHY
attribute vec3 aTrophy;
#endif
#ifdef HAS_DUST
attribute vec3 aDust;
#endif

varying float vAlpha;
varying float vTone;
varying float vHeat;
varying float vAmber;

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
