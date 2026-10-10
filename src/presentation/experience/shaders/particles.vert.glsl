// quanto do trecho cada partícula atrasa: a troca de forma vira uma onda, não um bloco
#define SPREAD 0.45

void main() {
  // cada partícula sai num momento diferente e chega com smoothstep
  float lag = fract(aSeed.x * 12.9898 + aSeed.z * 78.233);
  float tp = smoothstep(lag * SPREAD, lag * SPREAD + (1.0 - SPREAD), uT);
  // 0 parada numa forma, 1 no meio do voo (trecho entre seções da mesma forma não voa)
  float flight = sin(3.14159265 * tp) * step(0.5, abs(uFrom - uTo));

#ifdef HAS_CORE
  float wCore = weightOf(IDX_CORE, tp);
#else
  float wCore = 0.0;
#endif
#ifdef HAS_DUST
  float wDust = weightOf(IDX_DUST, tp);
#else
  float wDust = 0.0;
#endif

  vec3 pos = vec3(0.0);
  vec3 coreP = vec3(0.0, 0.0, 1.0);
  float heat = 0.0;
  float w;

#ifdef HAS_CORE
  if (wCore > 0.001) { coreP = shapeCore(aCore); pos += coreP * wCore; }
#endif
#ifdef HAS_ORBIT
  w = weightOf(IDX_ORBIT, tp);
  if (w > 0.001) pos += shapeOrbit(aOrbit) * w;
#endif
#ifdef HAS_ENIGMA
  w = weightOf(IDX_ENIGMA, tp);
  if (w > 0.001) pos += shapeEnigma(aEnigma) * w;
#endif
#ifdef HAS_MAP
  w = weightOf(IDX_MAP, tp);
  if (w > 0.001) { pos += shapeMap(aMap) * w; heat += mapHeat(aMap) * w; }
#endif
#ifdef HAS_TERRAIN
  w = weightOf(IDX_TERRAIN, tp);
  if (w > 0.001) pos += shapeTerrain(aTerrain) * w;
#endif
#ifdef HAS_STAGE
  w = weightOf(IDX_STAGE, tp);
  if (w > 0.001) pos += aStage * w;
#endif
#ifdef HAS_TROPHY
  w = weightOf(IDX_TROPHY, tp);
  if (w > 0.001) { pos += shapeTrophy(aTrophy) * w; heat += trophyGlint() * w; }
#endif
#ifdef HAS_DUST
  if (wDust > 0.001) pos += shapeDust(aDust) * wDust;
#endif

  // no meio do voo: redemoinho contínuo (ruído no espaço, não por frame) + leve abertura
  if (flight > 0.001) {
    vec3 q = pos * 0.85 + vec3(0.0, 0.0, uTime * 0.18);
    vec3 swirl = vec3(snoise(q), snoise(q + vec3(19.1, 7.3, 3.7)), snoise(q + vec3(5.2, 31.4, 11.9)));
    pos += (swirl * 0.42 + aSeed * 0.22) * flight;
    heat += flight * 0.3;
  }

  // scroll rápido: o conjunto respira pra fora, suave e sem ruído por partícula
  pos += normalize(pos + vec3(1e-4)) * uVelocity * 0.14;

  vec4 world = modelMatrix * vec4(pos, 1.0);
  vec3 away = world.xyz - uPointer;
  float push = (1.0 - smoothstep(0.0, 1.1, length(away))) * uPointerStrength;
  world.xyz += normalize(away + vec3(1e-4)) * push * 0.5;

  vec4 mv = viewMatrix * world;
  gl_Position = projectionMatrix * mv;

  // borda acesa no globo (tipo fresnel) e miolo quase vazio, como nas referências
  vec3 coreNormal = normalize(normalMatrix * coreP);
  float rim = clamp(1.0 - abs(dot(coreNormal, normalize(-mv.xyz))), 0.0, 1.0);
  float coreAlpha = mix(0.16, 1.0, pow(rim, 2.2));
  float twinkle = mix(1.0, 0.55 + 0.45 * sin(uTime * 1.3 + aSeed.x * 30.0), wDust);
  float nearFade = smoothstep(0.4, 1.6, -mv.z);

  vAlpha = mix(1.0, coreAlpha, wCore) * twinkle * nearFade;
  vTone = mix(clamp(0.5 + aSeed.y * 0.5, 0.0, 1.0), 1.0 - rim, 0.65 * wCore);
  vHeat = clamp(heat + wCore * (pow(rim, 6.0) * 0.65 + uCharge * 0.55), 0.0, 1.0);
  // âmbar só no pico da carga e só numa fração das partículas
  vAmber = wCore * uPulse * step(0.82, fract(aSeed.x * 13.37 + 0.5));

  float size = uSize * aScale * (1.0 + wCore * uCharge * 0.4 + heat * 0.5);
  gl_PointSize = min(size * uPixelRatio * (6.0 / max(-mv.z, 0.1)), 64.0);
}
