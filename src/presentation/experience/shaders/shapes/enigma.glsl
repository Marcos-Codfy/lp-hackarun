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
