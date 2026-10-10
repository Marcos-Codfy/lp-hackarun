// estrelas distantes: piscar lento por estrela (seno, nunca ruído por frame)
uniform float uTime;
uniform float uPixelRatio;
uniform float uOpacity;

attribute float aSize;
attribute float aPhase;
attribute vec3 aColor;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float twinkle = 0.62 + 0.38 * sin(uTime * (0.35 + aPhase * 0.8) + aPhase * 40.0);
  vColor = aColor;
  vAlpha = uOpacity * twinkle;
  gl_PointSize = aSize * uPixelRatio;
}
