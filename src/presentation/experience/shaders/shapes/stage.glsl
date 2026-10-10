// ---------- stage: telão de show (StageRig.ts / StageFloor.ts) ----------
#define STAGE_HALF_W 1.3
#define STAGE_HALF_H 0.73125
#define STAGE_Y 0.4
#define STAGE_PITCH 0.052
#define STAGE_FLOOR -0.56
#define STAGE_BEAM_Y 1.34125
// canhão k: o índice vem no z da partícula (StageRig: z = -0.05 - k * 0.02) e o x da base sai de fórmula.
// sem loop nem array indexado por variável: o ANGLE (D3D) virava isso num switch enorme e a compilação travava
float stageBeamIndex(vec3 p) { return clamp(floor((-p.z - 0.05) / 0.02 + 0.5), 0.0, 7.0); }
float stageBeamX(float k) { return 0.4629 * (k - 3.5); }
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
    float k = stageBeamIndex(p);
    vec2 o = vec2(stageBeamX(k), STAGE_BEAM_Y);
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
