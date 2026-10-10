varying vec3 vColor;
varying float vAlpha;

// disco de lente fora de foco: miolo chapado e borda um pouco mais clara
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float disc = 1.0 - smoothstep(0.8, 1.0, d);
  float rim = smoothstep(0.55, 0.93, d) * disc;
  float a = (disc * 0.6 + rim * 0.4) * vAlpha;
  gl_FragColor = vec4(vColor * a, a);
}
