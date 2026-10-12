// passe final: onda de choque, zoom blur, aberração cromática, exposição, ombro suave, vinheta e grão
uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uTime;
uniform float uExposure;
uniform float uAberration;
uniform float uVignette;
uniform float uGrain;
uniform float uWarp;
uniform vec2 uFocus;
uniform float uShock;
uniform float uShockRadius;

varying vec2 vUv;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// ombro suave que preserva a cor (pelo canal mais forte); só a luz muito acima de 1 vaza pro branco
vec3 shoulder(vec3 c) {
  const float knee = 0.7;
  float peak = max(max(c.r, c.g), c.b);
  float mapped = peak <= knee ? peak : knee + (1.0 - knee) * (1.0 - exp(-(peak - knee) / (1.0 - knee)));
  vec3 hue = c * (mapped / max(peak, 1e-5));
  vec3 bleed = 1.0 - exp(-c * 1.2);
  return mix(hue, max(hue, bleed), smoothstep(1.2, 3.5, peak));
}

vec3 sampleSplit(vec2 uv, vec2 split) {
  return vec3(texture2D(tDiffuse, uv + split).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - split).b);
}

void main() {
  vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
  vec2 uv = vUv;

  // onda do clímax: nasce na silhueta do globo e abre junto com o anel 3D (mesma curva do ringScale,
  // banda em 0,9 do quad), refratando de leve; o miolo (título, contador, CTA) não é varrido
  float ring = 0.0;
  if (uShock >= 0.0) {
    vec2 d = (uv - uFocus) * aspect;
    float dist = length(d);
    float eased = 1.0 - pow(1.0 - uShock, 3.0);
    float reach = uShockRadius * (1.02 + eased * 0.58);
    float band = (dist - reach) / (0.035 + 0.05 * uShock);
    ring = exp(-band * band) * smoothstep(0.0, 0.12, uShock) * (1.0 - uShock) * (1.0 - uShock);
    uv -= (d / max(dist, 1e-4)) / aspect * ring * 0.008;
  }

  vec2 fromCenter = uv - 0.5;
  // aberração só nas bordas (cresce com o cubo da distância): o miolo da tela fica nítido
  float edge = dot(fromCenter, fromCenter);
  vec2 split = fromCenter * edge * (uAberration + ring * 0.015);

  vec3 color;
  if (uWarp > 0.002) {
    // hiperespaço: amostras ao longo do raio a partir do foco
    vec2 dir = (uv - uFocus) * uWarp * 0.16;
    color = vec3(0.0);
    for (int i = 0; i < 8; i++) {
      color += sampleSplit(uv - dir * (float(i) / 7.0), split);
    }
    color *= (1.0 + uWarp * 0.5) / 8.0;
  } else {
    color = sampleSplit(uv, split);
  }

  color *= uExposure;
  // a frente da onda só tinge de ciano: luz de energia, não clarão por trás do texto
  color += ring * vec3(0.05, 0.22, 0.34);
  color = shoulder(color);

  float vig = smoothstep(1.15, 0.3, length(fromCenter * aspect * vec2(0.82, 1.0)));
  color *= mix(1.0, vig, uVignette);

  // grão a 24 qps: textura de filme, não chiado de TV
  float frame = floor(uTime * 24.0);
  float grain = hash12(gl_FragCoord.xy + vec2(frame * 17.13, frame * 5.71)) - 0.5;
  float luma = dot(color, vec3(0.299, 0.587, 0.114));
  color += grain * uGrain * (0.25 + luma);

  gl_FragColor = vec4(max(color, 0.0), 1.0);
}
