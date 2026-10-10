uniform float uOpacity;
// 1 = halo fake no próprio sprite (render direto); ~0 com bloom de verdade
uniform float uHalo;

varying vec3 vColor;
varying float vAlpha;
varying float vHeat;
varying float vSoft;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;

  // ponto nítido (o bloom faz o brilho) ou disco desfocado quando passa colado na lente
  float disc = 1.0 - smoothstep(mix(0.28, 0.5, vSoft), mix(0.62, 1.0, vSoft), d);
  float halo = pow(1.0 - d, 2.4) * 0.45 * uHalo * (1.0 - vSoft);
  // calor alto: o miolo do ponto vai pro branco gelo
  float hot = clamp(vHeat * (0.2 + disc * 0.8), 0.0, 1.0) * (1.0 - vSoft);
  vec3 color = mix(vColor, vec3(0.96, 0.97, 1.0), hot);

  float alpha = (disc + halo) * vAlpha * uOpacity;
  // pré-multiplicado pro blending aditivo do material
  gl_FragColor = vec4(color * alpha, alpha);
}
