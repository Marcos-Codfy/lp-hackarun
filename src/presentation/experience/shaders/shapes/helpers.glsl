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
