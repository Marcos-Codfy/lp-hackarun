// globo de energia (cena core)

// casca de energia: ondas de ruído na direção radial; a carga agita, contrai e solta um pulso
vec3 shapeCore(vec3 p) {
  vec3 n = normalize(p);
  float t = uTime * (0.16 + uCharge * 0.45);
  float agitation = 1.0 + uCharge * 0.8;
  float wave = snoise(n * 1.4 + vec3(0.0, t, t * 0.7)) * 0.6;
  wave += snoise(n * 3.1 - vec3(t * 0.9)) * 0.28 * agitation;
  float r = 1.0 + wave * 0.17 * agitation;
  r *= 1.0 - uCharge * 0.14;
  r += uPulse * (0.22 + 0.18 * aSeed.x);
  return rotY(p * r, uSpin.x);
}
