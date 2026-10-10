// bokeh de primeiro plano: caixa que acompanha a câmera com "wrap" (paralaxe de verdade ao andar)
uniform float uTime;
uniform float uPixelRatio;
uniform float uScale;
uniform float uMaxSize;
uniform float uOpacity;
uniform vec3 uCenter;
uniform vec3 uBox;
uniform vec3 uColorA;
uniform vec3 uColorB;

attribute float aSize;
attribute float aPhase;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vec3 drift = vec3(
    sin(uTime * 0.05 + aPhase * 6.28) * 0.35,
    uTime * (0.025 + aPhase * 0.035),
    cos(uTime * 0.04 + aPhase * 3.1) * 0.25
  );
  vec3 rel = mod(position * uBox + drift - uCenter + uBox, 2.0 * uBox) - uBox;
  vec4 mv = viewMatrix * vec4(uCenter + rel, 1.0);
  gl_Position = projectionMatrix * mv;

  // some nas bordas da caixa (o wrap nunca aparece) e colado na lente
  vec3 edge = abs(rel) / uBox;
  float fade = (1.0 - smoothstep(0.6, 1.0, edge.x)) * (1.0 - smoothstep(0.6, 1.0, edge.y));
  fade *= 1.0 - smoothstep(0.55, 1.0, edge.z);
  float depth = -mv.z;
  fade *= smoothstep(0.3, 1.1, depth);

  vColor = mix(uColorA, uColorB, step(0.5, fract(aPhase * 7.31)));
  vAlpha = fade * uOpacity * (0.45 + 0.55 * fract(aPhase * 3.7));
  gl_PointSize = min(aSize * uScale * uPixelRatio / max(depth, 0.3), uMaxSize);
}
