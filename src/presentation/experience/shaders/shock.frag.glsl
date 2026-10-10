// anel da onda de choque (o mesh cresce; aqui só a banda de luz com eco interno)
uniform float uPhase;
uniform vec3 uInner;
uniform vec3 uOuter;

varying vec2 vUv;

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float d = length(p);
  if (d > 1.0) discard;
  float width = 0.02 + 0.05 * uPhase;
  float band = (d - 0.9) / width;
  float echo = (d - 0.74) / (width * 1.6);
  float ring = exp(-band * band) + exp(-echo * echo) * 0.35;
  float glow = exp(-abs(d - 0.9) * 10.0) * 0.3;
  float fade = (1.0 - uPhase) * (1.0 - uPhase);
  vec3 color = mix(uInner, uOuter, smoothstep(-1.5, 1.5, band));
  float a = (ring + glow) * fade;
  gl_FragColor = vec4(color * a, a);
}
