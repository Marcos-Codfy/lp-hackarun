uniform vec3 uColorCyan;
uniform vec3 uColorRoyal;
uniform vec3 uColorHot;
uniform vec3 uColorAmber;
uniform float uOpacity;

varying float vAlpha;
varying float vTone;
varying float vHeat;
varying float vAmber;

// sprite redondo: miolo nítido + halo suave = bloom fake, sem passe de pós-processamento
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;

  float core = 1.0 - smoothstep(0.0, 0.3, d);
  float halo = pow(1.0 - d, 2.2) * 0.42;

  vec3 color = mix(uColorCyan, uColorRoyal, vTone);
  color = mix(color, uColorHot, clamp(vHeat * (0.35 + core), 0.0, 1.0));
  color = mix(color, uColorAmber, vAmber);

  float alpha = min((core + halo) * vAlpha * uOpacity, 1.0);
  // saída pré-multiplicada pro blending aditivo customizado do material
  gl_FragColor = vec4(color * alpha, alpha);
}
