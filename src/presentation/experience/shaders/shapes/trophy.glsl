// ---------- trophy: taça de torno (TrophyShape.ts / TrophyProfile.ts) ----------
#define TROPHY_STAR_Y 1.5
// a taça gira com uSpin.y; a estrela (y > 1.2) fica de frente pra câmera e só balança
vec3 shapeTrophy(vec3 p) {
  if (p.y > 1.2) return rotY(p, sin(uTime * 0.8) * 0.25) + vec3(0.0, sin(uTime * 1.1) * 0.025, 0.0);
  return rotY(p, uSpin.y);
}
// metal polido: luz principal fixa à esquerda-frente e contraluz à direita (o brilho fica, a taça gira por baixo)
float trophyGlint() {
#ifdef HAS_TROPHY
  vec3 p = aTrophy;
  if (p.y > 1.2) return 0.62 + 0.3 * (1.0 - smoothstep(0.0, 0.12, length(p.xy - vec2(0.0, TROPHY_STAR_Y))));
  if (length(p.xz) < 0.02) return 0.0;
  float a = atan(p.z, p.x) - uSpin.y;
  float key = pow(max(0.0, cos(a - 2.1)), 36.0);
  float rim = pow(max(0.0, cos(a - 0.35)), 60.0) * 0.6;
  float sparkle = pow(max(0.0, sin(uTime * 1.6 + aSeed.x * 40.0)), 40.0) * 0.6;
  return clamp(key * 0.95 + rim + sparkle, 0.0, 1.0);
#else
  return 0.0;
#endif
}
