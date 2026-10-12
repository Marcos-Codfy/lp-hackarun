// globo de energia (cena core): fitas de linhas de pontos dobrando como seda numa esfera
// o raio do atributo carrega o código (fita, linha na largura, posição no arco); a casca de verdade sai daqui

vec3 shapeCore(vec3 p, out float heat, out float edge, out float veil) {
  float len = length(p);
  vec3 n = p / max(len, 1e-4);
  float code = clamp((len / CORE_RADIUS - 1.0) / CORE_CODE_SPAN, 0.0, 1.0) * CORE_CODE_LEVELS;
  float id = floor(code);
  float ribbon = floor(id / 16.0);
  // v: 0..1 através da fita; along: 0..1 ao longo do arco; veil = pontos soltos da silhueta
  float v = mod(id, 16.0) / 15.0;
  float along = fract(code);
  veil = step(CORE_VEIL_RIBBON - 0.5, ribbon);
  float phase = hash11(ribbon * 7.31 + 1.7);

  float t = uCoreTime;
  float agitation = uCoreFlow;

  // fluxo tangente em baixa frequência: linhas vizinhas dobram juntas (ruído no espaço, contínuo no tempo)
  vec3 q = n * 0.95 + vec3(phase * 6.0, t, t * 0.7);
  vec3 flow = vec3(snoise(q), snoise(q + vec3(31.7, 11.3, 5.1)), snoise(q + vec3(7.9, 23.3, 41.1)));
  flow -= n * dot(flow, n);
  vec3 m = normalize(n + flow * 0.2 * agitation);

  // ondas radiais suaves (silhueta continua redonda) + torção na largura: a fita vira lâmina inclinada
  float big = snoise(m * 1.45 + vec3(0.0, -t * 1.2, phase * 3.0));
  float fine = snoise(m * 3.4 + vec3(t * 1.6, phase * 5.0, 0.0));
  float twist = (v - 0.5) * (0.07 + 0.06 * big) * (1.0 - veil);
  // o grão fino só diminui (globo calmo); nunca passa do de sempre
  float r = 1.0 + big * 0.04 * agitation + fine * 0.014 * min(agitation, 1.0) + twist;
  r *= uCoreScale;
  // pulso quase igual pra todas (uPulse já vem na escala da cena): o globo respira inteiro
  r += uPulse * (1.0 + 0.2667 * aSeed.x);

  heat = smoothstep(0.25, 0.95, big * 0.7 + fine * 0.5) * (1.0 - veil * 0.6);
  // bordas da fita e pontas do arco apagam (seda afinando); o véu fica fraco no miolo
  float across = mix(0.3, 1.0, smoothstep(0.0, 0.35, v) * smoothstep(1.0, 0.65, v));
  float tips = smoothstep(0.0, 0.18, along) * smoothstep(1.0, 0.82, along);
  edge = mix(across * tips, 1.0, veil);
  return rotY(m * (r * CORE_RADIUS), uSpin.x);
}
