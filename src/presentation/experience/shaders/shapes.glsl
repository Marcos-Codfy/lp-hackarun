// deformações vivas de cada forma (o alvo estático vem do atributo); o globo fica em core.glsl


// galáxia gira devagar, com um leve vaivém diferencial pros braços respirarem
vec3 shapeOrbit(vec3 p) {
  float d = length(p.xz);
  return rotY(p, uTime * 0.05 + sin(uTime * 0.2 + d * 2.0) * 0.12);
}

// "?" flutua devagar, inteiro (sem tremer partícula por partícula)
vec3 shapeEnigma(vec3 p) {
  float bob = sin(uTime * 0.7 + p.y * 1.2) * 0.035;
  return p + vec3(0.0, bob, 0.0);
}

// raio elétrico: ondulação contínua ao longo do caminho (ruído no espaço, sem saltos por frame)
vec3 shapeMap(vec3 p) {
  float hum = sin(uTime * 2.4 + p.x * 4.5) * 0.02;
  float crackle = snoise(vec3(p.x * 3.2, uTime * 0.9, aSeed.z * 2.0)) * 0.03;
  return p + vec3(0.0, hum + crackle, crackle * 0.6);
}

// frente de energia correndo pela rota da esquerda pra direita
float mapHeat(vec3 p) {
  float front = mix(-2.0, 2.0, fract(uTime * 0.16));
  float d = (p.x - front) * 3.5;
  return exp(-d * d) * 0.8;
}

vec3 shapeTerrain(vec3 p) {
  float y = sin(p.x * 2.4 + uTime * 0.7) * 0.07 + sin(p.z * 3.0 - uTime * 0.9) * 0.06;
  return vec3(p.x, p.y + y, p.z);
}

vec3 shapeTrophy(vec3 p) {
  return rotY(p, uSpin.y);
}

// brilhos curtos espalhados pelo metal
float trophyGlint() {
  return pow(max(0.0, sin(uTime * 1.6 + aSeed.x * 40.0)), 30.0) * 0.9;
}

vec3 shapeDust(vec3 p) {
  vec3 drift = vec3(
    sin(uTime * 0.11 + aSeed.x * 6.28),
    cos(uTime * 0.09 + aSeed.y * 6.28),
    sin(uTime * 0.07 + aSeed.z * 6.28)
  );
  return p + drift * 0.14;
}
