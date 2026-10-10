varying vec3 vColor;
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float a = 1.0 - d;
  a *= a * vAlpha;
  gl_FragColor = vec4(vColor * a, a);
}
