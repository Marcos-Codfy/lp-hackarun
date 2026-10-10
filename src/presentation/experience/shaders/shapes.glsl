// deformações vivas de cada forma (o alvo estático vem do atributo); o globo fica em core.glsl.
// calor: até ~0.5 puxa pra crista da paleta, acima de 0.55 pro acento (ver ColorGrade.ts).
// as constantes de cada bloco espelham o arquivo TS da forma: mudou lá, muda aqui
vec2 shRot2(vec2 p, float a) {
  float c = cos(a), s = sin(a);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}
// Rodrigues: gira p em torno do eixo unitário k
vec3 shRotAxis(vec3 p, vec3 k, float a) {
  float c = cos(a);
  return p * c + cross(k, p) * sin(a) + k * dot(k, p) * (1.0 - c);
}
// faixa gaussiana (pulsos, varreduras)
float shBand(float x, float width) { return exp(-(x / width) * (x / width)); }

// ---------- orbit: cronômetro-giroscópio (OrbitShape.ts) ----------
#define ORBIT_HAND_Z 0.04
#define ORBIT_HAND_SPEED 0.7
const vec3 ORBIT_C_AXIS = vec3(0.70710678, -0.70710678, 0.0);
const vec3 ORBIT_BEAD_B = vec3(0.7527, 0.0, 0.5150);
const vec3 ORBIT_BEAD_C = vec3(-0.2830, 0.2830, 0.5498);
float orbitIsHand(vec3 p) {
  return step(abs(p.z - ORBIT_HAND_Z), 0.012) * step(abs(p.x), 0.06) * step(-0.32, p.y) * step(p.y, 1.2);
}
// ponteiro varre no plano do mostrador; anel B capota no eixo x e o C, preso nele, na diagonal (cardã)
vec3 shapeOrbit(vec3 p) {
  float r = length(p);
  float spinB = uTime * 0.55;
  vec3 q = p;
  if (orbitIsHand(p) > 0.5) q.xy = shRot2(p.xy, -uTime * ORBIT_HAND_SPEED);
  else if (r > 0.6 && r < 0.8) q = shRotAxis(shRotAxis(p, ORBIT_C_AXIS, -uTime * 0.8), vec3(1.0, 0.0, 0.0), spinB);
  else if (r >= 0.8 && r < 1.0) q = shRotAxis(p, vec3(1.0, 0.0, 0.0), spinB);
  return rotY(q, sin(uTime * 0.3) * 0.1);
}
// núcleo e ponteiro em brasa, marcas acendendo no rastro do ponteiro, arco já percorrido no aro
float orbitHeat(vec3 p) {
  float r = length(p);
  float heat = (1.0 - smoothstep(0.03, 0.16, r)) * 0.7;
  if (orbitIsHand(p) > 0.5) return max(heat, 0.6);
  float onDial = step(abs(p.z), 0.012);
  float theta = atan(p.y, p.x);
  float behind = mod(theta - (1.5707963 - uTime * ORBIT_HAND_SPEED), 6.2831853);
  float tick = onDial * step(0.97, r) * step(r, 1.32);
  heat += tick * (0.04 + step(r, 1.19) * 0.14 + 0.75 * exp(-behind * 1.2));
  float swept = mod(1.5707963 - theta, 6.2831853);
  heat += onDial * step(1.33, r) * step(r, 1.38) * step(swept, mod(uTime * ORBIT_HAND_SPEED, 6.2831853)) * 0.45;
  heat += (1.0 - smoothstep(0.02, 0.07, distance(p, ORBIT_BEAD_B))) * 0.9;
  heat += (1.0 - smoothstep(0.02, 0.07, distance(p, ORBIT_BEAD_C))) * 0.9;
  return clamp(heat, 0.0, 1.0);
}

// ---------- enigma: "?" extrudado (EnigmaShape.ts) ----------
// flutua inteiro e balança um pouco no eixo y pra mostrar a espessura; a auréola gira no próprio plano
vec3 shapeEnigma(vec3 p) {
  vec3 q = p;
  if (p.z < -0.45) q.xy = shRot2(p.xy, uTime * 0.12);
  q = rotY(q, sin(uTime * 0.4) * 0.16);
  q.y += sin(uTime * 0.7) * 0.05;
  return q;
}
// face da frente acesa, varredura de holograma descendo e o ponto piscando feito cursor
float enigmaHeat(vec3 p) {
  float front = step(0.2, p.z);
  float scan = shBand(p.y - mix(1.9, -1.9, fract(uTime * 0.16)), 0.14);
  float cursor = step(p.y, -0.95) * step(-0.45, p.z) * step(0.5, fract(uTime * 0.8));
  return clamp(front * (0.28 + 0.45 * scan) + cursor * 0.4 + step(p.z, -0.45) * 0.12, 0.0, 1.0);
}

// ---------- map: mapa de missões (MissionRoute.ts / MapShape.ts) ----------
#define MAP_R 1.3
#define MAP_CURVE 0.6
#define MAP_THETA0 2.7925268
#define MAP_SWEEP 4.0142573
#define MAP_PACKET 0.08
#define MAP_BASE 0.03
#define MAP_TILT 0.55
#define MAP_YAW 0.12
// (u ao longo da espiral, afastamento lateral da curva) a partir da posição na plataforma
vec2 mapRouteCoord(vec3 p) {
  float r = length(p.xz);
  float u = 1.0 - pow(clamp(r / MAP_R, 0.0, 1.0), 1.0 / MAP_CURVE);
  float d = mod(atan(p.z, p.x) - (MAP_THETA0 - MAP_SWEEP * u) + 3.14159265, 6.2831853) - 3.14159265;
  return vec2(u, d * r);
}
vec2 mapStation(float k) {
  float u = k / 7.0;
  float theta = MAP_THETA0 - MAP_SWEEP * u;
  return vec2(cos(theta), sin(theta)) * MAP_R * pow(max(0.0, 1.0 - u), MAP_CURVE);
}
// gira a plataforma, inclina pra câmera e levanta o farol na vertical (o feixe não deita junto)
vec3 mapPlace(vec3 base, float lift) {
  vec3 q = rotY(base, MAP_YAW);
  float c = cos(MAP_TILT), s = sin(MAP_TILT);
  return vec3(q.x, q.y * c - q.z * s + lift, q.y * s + q.z * c);
}
// régua externa gira devagar; pacotes de energia sobem pelos faróis em loop
vec3 shapeMap(vec3 p) {
  if (p.y < 0.02) {
    float r = length(p.xz);
    vec3 b = (r > 1.45 && r < 1.58) ? rotY(p, uTime * 0.05) : p;
    return mapPlace(vec3(b.x, 0.0, b.z), b.y);
  }
  float k = floor(mapRouteCoord(p).x * 7.0 + 0.5);
  float top = MAP_BASE + MAP_PACKET * (k > 6.5 ? 14.0 : 5.0 + k);
  float lift = p.y;
  if (length(p.xz - mapStation(k)) < 0.03 && p.y < top - 0.006) {
    lift = MAP_BASE + mod(p.y - MAP_BASE + uTime * 0.16, top - MAP_BASE);
  }
  return mapPlace(vec3(p.x, 0.0, p.z), lift);
}
// faróis acima de 0.55 (acento laranja) e piscando quando o pulso chega; rota e varredura do radar na crista
float mapHeat(vec3 p) {
  vec2 rc = mapRouteCoord(p);
  float u1 = fract(uTime * 0.12);
  float u2 = fract(uTime * 0.12 + 0.5);
  if (p.y > 0.02) {
    float uk = floor(rc.x * 7.0 + 0.5) / 7.0;
    float arrive = shBand(uk - u1, 0.05) + shBand(uk - u2, 0.05);
    float packet = step(fract((p.y - MAP_BASE) / MAP_PACKET), 0.33);
    return clamp(0.64 + 0.18 * packet + 0.14 * arrive, 0.0, 1.0);
  }
  float road = (1.0 - smoothstep(0.03, 0.06, abs(rc.y))) * step(length(p.xz), MAP_R + 0.05);
  float pulse = shBand(rc.x - u1, 0.035) + shBand(rc.x - u2, 0.035);
  float sweep = exp(-mod(uTime * 0.5 - atan(p.z, p.x), 6.2831853) * 2.5);
  return clamp(road * (0.38 + 0.3 * pulse) + (1.0 - road) * sweep * 0.3, 0.0, 0.54);
}

// ---------- terrain: synthwave (TerrainShape.ts) ----------
#define TERRAIN_NEAR 1.3
#define TERRAIN_FAR -4.8
#define TERRAIN_W_NEAR 0.8
#define TERRAIN_W_FAR 5.4
#define TERRAIN_SPEED 0.22
float terrainWidth(float z) {
  return mix(TERRAIN_W_NEAR, TERRAIN_W_FAR, (TERRAIN_NEAR - z) / (TERRAIN_NEAR - TERRAIN_FAR));
}
// a linha rola pra câmera e reaparece no fundo; o espaçamento divide o trecho, então não tem emenda
float terrainScroll(float z) {
  return TERRAIN_FAR + mod(z - TERRAIN_FAR + uTime * TERRAIN_SPEED, TERRAIN_NEAR - TERRAIN_FAR);
}
// montanhas nas laterais (fração da largura visível) crescendo com a distância; vale plano no meio
float terrainHeight(float x, float z) {
  float side = smoothstep(0.4, 0.92, abs(x) / terrainWidth(z));
  float depth = smoothstep(TERRAIN_NEAR - 0.8, TERRAIN_NEAR - 3.4, z);
  float ridge = 1.0 - abs(snoise(vec3(x * 0.42, z * 0.42, 3.7)));
  return 1.5 * side * depth * (0.25 + 0.75 * ridge * ridge);
}
// sol e horizonte (atrás do fundo) ficam parados; linha (y = 0) rola e acompanha a largura; coluna só levanta
vec3 shapeTerrain(vec3 p) {
  if (p.z < TERRAIN_FAR - 0.03) return p;
  if (p.y > -0.005) {
    float z = terrainScroll(p.z);
    float x = p.x * terrainWidth(z) / terrainWidth(p.z);
    return vec3(x, terrainHeight(x, z), z);
  }
  return vec3(p.x, terrainHeight(p.x, p.z), p.z);
}
// sol mais quente no topo, horizonte aceso e a grade esquentando perto do fundo
float terrainHeat(vec3 p) {
  if (p.z < TERRAIN_FAR - 0.09) return 0.5 + 0.35 * clamp(p.y / 1.49, 0.0, 1.0) + 0.04 * sin(uTime * 1.2);
  if (p.z < TERRAIN_FAR - 0.03) return 0.5;
  float z = p.y > -0.005 ? terrainScroll(p.z) : p.z;
  return smoothstep(TERRAIN_NEAR - 2.5, TERRAIN_FAR, z) * 0.22;
}

// ---------- stage: telão de show (StageRig.ts / StageFloor.ts) ----------
#define STAGE_HALF_W 1.3
#define STAGE_HALF_H 0.73125
#define STAGE_Y 0.4
#define STAGE_PITCH 0.052
#define STAGE_FLOOR -0.56
#define STAGE_BEAM_Y 1.34125
const float STAGE_BEAM_X[8] = float[8](-1.62, -1.15, -0.68, -0.22, 0.22, 0.68, 1.15, 1.62);
const float STAGE_BEAM_A[8] = float[8](-0.78, -0.42, -0.2, -0.06, 0.06, 0.2, 0.42, 0.78);
// pixel do equalizador espelhado (2 colunas acesas, 1 apagada). Apagado vira grade fraca ou é emprestado pra
// barra da mesma coluna: barra mais densa e recorte nítido. xy = posição exibida, z = 0 apagado, 1 aceso, 2 topo
vec3 stageLed(vec3 p) {
  vec2 l = vec2(p.x + STAGE_HALF_W, p.y - STAGE_Y + STAGE_HALF_H);
  float col = floor(l.x / STAGE_PITCH);
  float row = floor(l.y / STAGE_PITCH);
  float m = abs(floor(col / 3.0) - 8.0);
  float level = 0.16 + 0.72 * (0.5 + 0.5 * sin(uTime * 2.1 - m * 0.9)) * (1.0 - m / 11.0);
  float rows = max(2.0, floor(level * 28.0));
  float gap = step(1.5, mod(col, 3.0));
  if (gap < 0.5 && row < rows) return vec3(p.xy, row > rows - 1.5 ? 2.0 : 1.0);
  if (fract(sin(col * 12.9898 + row * 78.233) * 43758.5453) < 0.22) return vec3(p.xy, 0.0);
  float r = mod(row, rows);
  return vec3(p.xy + vec2(-gap, r - row) * STAGE_PITCH, r > rows - 1.5 ? 2.0 : 1.0);
}
float stageIsLed(vec3 p) {
  return step(abs(p.z), 0.012) * step(abs(p.x), STAGE_HALF_W - 0.004) * step(abs(p.y - STAGE_Y), STAGE_HALF_H - 0.004);
}
// canhões varrem devagar em volta da própria boca; plateia pula no ritmo em ondas
vec3 shapeStage(vec3 p) {
  vec3 q = p;
  if (stageIsLed(p) > 0.5) q.xy = stageLed(p).xy;
  else if (p.z < -0.025 && p.y > STAGE_BEAM_Y - 0.03) {
    float best = 1e9;
    float k = 0.0;
    for (int i = 0; i < 8; i++) {
      vec2 d = p.xy - vec2(STAGE_BEAM_X[i], STAGE_BEAM_Y);
      vec2 dir = vec2(sin(STAGE_BEAM_A[i]), cos(STAGE_BEAM_A[i]));
      float score = abs(d.x * dir.y - d.y * dir.x) / (0.02 + max(dot(d, dir), 0.0) * 0.08);
      if (score < best) { best = score; k = float(i); }
    }
    vec2 o = vec2(STAGE_BEAM_X[int(k)], STAGE_BEAM_Y);
    q.xy = o + shRot2(p.xy - o, 0.16 * sin(uTime * 0.55 + k * 1.7));
  } else if (p.z > 0.75) q.y += 0.024 * max(0.0, sin(uTime * 5.0 + p.x * 2.3 + p.z * 4.0));
  return q;
}
// LED aceso/topo da barra + faixa de varredura; feixes acima de 0.75 (acento), ribaltas e celulares acesos
float stageHeat(vec3 p) {
  float heat = 0.08;
  if (stageIsLed(p) > 0.5) {
    vec3 led = stageLed(p);
    float fy = (led.y - STAGE_Y + STAGE_HALF_H) / (2.0 * STAGE_HALF_H);
    float lit = step(0.5, led.z);
    heat = 0.03 + lit * 0.37 + step(1.5, led.z) * 0.2 + lit * 0.12 * shBand(fy - fract(uTime * 0.22), 0.05);
  } else if (p.z < -0.025 && p.y > STAGE_BEAM_Y - 0.03) heat = 0.8;
  else if (abs(p.z) < 0.012 && abs(p.y - STAGE_Y) < STAGE_HALF_H + 0.05 && abs(p.x) < STAGE_HALF_W + 0.05) heat = 0.3;
  else if (p.z > 0.3 && p.z < 0.6 && p.y > STAGE_FLOOR - 0.005) heat = 0.6;
  else if (p.z > 0.75 && p.y > STAGE_FLOOR - 0.06) heat = 0.65;
  return heat;
}

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

// ---------- dust: galáxia distante (DustShape.ts) — giro rígido e lento, os braços não enrolam ----------
vec3 shapeDust(vec3 p) { return rotY(p, uTime * 0.03); }
