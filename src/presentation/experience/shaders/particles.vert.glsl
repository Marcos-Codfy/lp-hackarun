// quanto do trecho cada partícula atrasa: a troca de forma vira uma onda, não um bloco
#define SPREAD 0.45

// acumuladores da partícula (cor graduada, calor de destaque e calor que vira branco no miolo do sprite)
float gTone;
float gPick;
vec3 gColor;
float gHeat;
float gHot;

// soma uma forma ativa (macro pra manter o índice da paleta constante)
#define ADD_SHAPE(IDX, W, H) { float h_ = (H); gHeat += h_ * (W); gColor += GRADE(IDX, h_, gTone, gPick) * (W); gHot += h_ * uGrade[int(IDX)].w * (W); }

void main() {
  // frente de onda varrendo a tela (esq. → dir., um pouco diagonal) + sorteio: a troca vira uma passada, não chuvisco.
  // a permutação comum põe a partícula no mesmo lugar relativo em toda forma, então a casa no globo serve de mapa
#ifdef HAS_CORE
  vec3 home = normalize(aCore);
#else
  vec3 home = normalize(aSeed + vec3(1e-4));
#endif
  float jitter = fract(aSeed.x * 12.9898 + aSeed.z * 78.233) - 0.5;
  float lag = clamp(0.5 + 0.36 * home.x + 0.12 * home.y + jitter * 0.34, 0.0, 1.0);
  float tp = smoothstep(lag * SPREAD, lag * SPREAD + (1.0 - SPREAD), uT);
  // 0 parada numa forma, 1 no meio do voo (trecho entre seções da mesma forma não voa)
  float flight = sin(3.14159265 * tp) * step(0.5, abs(uFrom - uTo));

  gTone = clamp(0.5 + aSeed.y * 0.5, 0.0, 1.0);
  gPick = fract(aSeed.z * 7.13 + aSeed.x * 3.71 + 0.37);
  gColor = vec3(0.0);
  gHeat = 0.0;
  gHot = 0.0;

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
  float coreHeat = 0.0;
  float coreEdge = 1.0;
  float coreVeil = 0.0;
  float w;

#ifdef HAS_CORE
  if (wCore > 0.001) { coreP = shapeCore(aCore, coreHeat, coreEdge, coreVeil); pos += coreP * wCore; }
#endif
#ifdef HAS_ORBIT
  w = weightOf(IDX_ORBIT, tp);
  if (w > 0.001) { pos += shapeOrbit(aOrbit) * w; ADD_SHAPE(IDX_ORBIT, w, orbitHeat(aOrbit)) }
#endif
#ifdef HAS_ENIGMA
  w = weightOf(IDX_ENIGMA, tp);
  if (w > 0.001) { pos += shapeEnigma(aEnigma) * w; ADD_SHAPE(IDX_ENIGMA, w, enigmaHeat(aEnigma)) }
#endif
#ifdef HAS_MAP
  w = weightOf(IDX_MAP, tp);
  if (w > 0.001) { pos += shapeMap(aMap) * w; ADD_SHAPE(IDX_MAP, w, mapHeat(aMap)) }
#endif
#ifdef HAS_TERRAIN
  w = weightOf(IDX_TERRAIN, tp);
  if (w > 0.001) { pos += shapeTerrain(aTerrain) * w; ADD_SHAPE(IDX_TERRAIN, w, terrainHeat(aTerrain)) }
#endif
#ifdef HAS_STAGE
  w = weightOf(IDX_STAGE, tp);
  if (w > 0.001) { pos += shapeStage(aStage) * w; ADD_SHAPE(IDX_STAGE, w, stageHeat(aStage)) }
#endif
#ifdef HAS_TROPHY
  w = weightOf(IDX_TROPHY, tp);
  if (w > 0.001) { pos += shapeTrophy(aTrophy) * w; ADD_SHAPE(IDX_TROPHY, w, trophyGlint()) }
#endif
#ifdef HAS_DUST
  if (wDust > 0.001) { pos += shapeDust(aDust) * wDust; ADD_SHAPE(IDX_DUST, wDust, 0.0) }
#endif

  // no meio do voo: as partículas escorrem pelas linhas de um fluxo ABC (sem divergência, contínuo no tempo);
  // vizinhas seguem a mesma corrente e o meio da troca vira filamentos girando, não chuvisco
  if (flight > 0.001) {
    vec3 q = pos * 1.9 + vec3(uTime * 0.12, 0.0, uTime * 0.07);
    vec3 start = q;
    for (int i = 0; i < 5; i++) {
      q += vec3(sin(q.z) + cos(q.y), sin(q.x) + cos(q.z), sin(q.y) + cos(q.x)) * (0.14 * flight);
    }
    pos += (q - start) / 1.9 + aSeed * (0.04 * flight);
    gHot += flight * 0.25;
  }

  // scroll rápido: o conjunto respira pra fora, suave e sem ruído por partícula
  pos += normalize(pos + vec3(1e-4)) * uVelocity * 0.14;

  vec4 world = modelMatrix * vec4(pos, 1.0);
  vec3 away = world.xyz - uPointer;
  float push = (1.0 - smoothstep(0.0, 1.1, length(away))) * uPointerStrength;
  world.xyz += normalize(away + vec3(1e-4)) * push * 0.5;

  vec4 mv = viewMatrix * world;
  gl_Position = projectionMatrix * mv;

  // globo: silhueta acesa (fresnel), miolo vazio e bordas das fitas mais apagadas
  float coreAlpha = 1.0;
#ifdef HAS_CORE
  if (wCore > 0.001) {
    vec3 coreNormal = normalize(normalMatrix * coreP);
    float rim = clamp(1.0 - abs(dot(coreNormal, normalize(-mv.xyz))), 0.0, 1.0);
    float h = clamp(coreHeat * 0.9 + pow(rim, 4.0) * 0.6 + uCharge * 0.6 + uAfterglow * 0.22, 0.0, 1.0);
    vec3 c = GRADE(IDX_CORE, h, mix(gTone, rim, 0.6), gPick);
    // carregando, parte das fitas puxa pro magenta antes do branco
    c = mix(c, uChargeTint, uCharge * step(0.55, gPick) * 0.55);
    gColor += c * wCore;
    gHeat += h * wCore;
    gHot += h * uGrade[int(IDX_CORE)].w * wCore;
    // fitas: frente visível mas discreta; véu: só a borda (desenha a silhueta inteira)
    float ribbonAlpha = mix(0.22, 1.0, pow(rim, 1.5)) * mix(0.04, 1.0, coreEdge);
    float veilAlpha = pow(rim, 3.0) * 1.3;
    coreAlpha = mix(ribbonAlpha, veilAlpha, coreVeil) * (1.0 + uAfterglow * 0.4);
  }
#endif

  float twinkle = mix(1.0, 0.55 + 0.45 * sin(uTime * 1.3 + aSeed.x * 30.0), wDust);
  float nearFade = smoothstep(0.06, 0.6, -mv.z);

  float size = uSize * aScale * (1.0 + wCore * uCharge * 0.35 + gHeat * 0.3) * (1.0 - flight * 0.3);
  float px = size * uPixelRatio * (6.0 / max(-mv.z, 0.05));
  // perto da lente vira disco desfocado: maior e mais fraco (mesma energia, sem borrão estourado)
  vSoft = smoothstep(9.0 * uPixelRatio, 30.0 * uPixelRatio, px);
  float energy = mix(1.0, clamp(pow(9.0 * uPixelRatio / px, 1.3), 0.03, 1.0), vSoft);
  gl_PointSize = min(px, 60.0 * uPixelRatio);

  vColor = gColor;
  vHeat = clamp(gHot, 0.0, 1.0);
  // em voo fica mais discreta: a forma nova é que tem que aparecer
  vAlpha = mix(1.0, coreAlpha, wCore) * twinkle * nearFade * energy * (1.0 - flight * 0.35);
}
