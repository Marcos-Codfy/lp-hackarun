// ---------- map: mapa de missões (MissionRoute.ts / MapShape.ts) ----------
#define MAP_R 1.3
#define MAP_CURVE 0.6
#define MAP_THETA0 2.7925268
#define MAP_SWEEP 4.0142573
#define MAP_PACKET 0.08
#define MAP_BASE 0.03
#define MAP_TILT 0.55
#define MAP_YAW 0.12
// (u ao longo da espiral, afastamento lateral da curva) a partir da posição na plataforma
vec2 mapRouteCoord(vec3 p) {
  float r = length(p.xz);
  float u = 1.0 - pow(clamp(r / MAP_R, 0.0, 1.0), 1.0 / MAP_CURVE);
  float d = mod(atan(p.z, p.x) - (MAP_THETA0 - MAP_SWEEP * u) + 3.14159265, 6.2831853) - 3.14159265;
  return vec2(u, d * r);
}
vec2 mapStation(float k) {
  float u = k / 7.0;
  float theta = MAP_THETA0 - MAP_SWEEP * u;
  return vec2(cos(theta), sin(theta)) * MAP_R * pow(max(0.0, 1.0 - u), MAP_CURVE);
}
// gira a plataforma, inclina pra câmera e levanta o farol na vertical (o feixe não deita junto)
vec3 mapPlace(vec3 base, float lift) {
  vec3 q = rotY(base, MAP_YAW);
  float c = cos(MAP_TILT), s = sin(MAP_TILT);
  return vec3(q.x, q.y * c - q.z * s + lift, q.y * s + q.z * c);
}
// régua externa gira devagar; pacotes de energia sobem pelos faróis em loop
vec3 shapeMap(vec3 p) {
  if (p.y < 0.02) {
    float r = length(p.xz);
    vec3 b = (r > 1.45 && r < 1.58) ? rotY(p, uTime * 0.05) : p;
    return mapPlace(vec3(b.x, 0.0, b.z), b.y);
  }
  float k = floor(mapRouteCoord(p).x * 7.0 + 0.5);
  float top = MAP_BASE + MAP_PACKET * (k > 6.5 ? 14.0 : 5.0 + k);
  float lift = p.y;
  if (length(p.xz - mapStation(k)) < 0.03 && p.y < top - 0.006) {
    lift = MAP_BASE + mod(p.y - MAP_BASE + uTime * 0.16, top - MAP_BASE);
  }
  return mapPlace(vec3(p.x, 0.0, p.z), lift);
}
// faróis acima de 0.55 (acento laranja) e piscando quando o pulso chega; rota e varredura do radar na crista
float mapHeat(vec3 p) {
  vec2 rc = mapRouteCoord(p);
  float u1 = fract(uTime * 0.12);
  float u2 = fract(uTime * 0.12 + 0.5);
  if (p.y > 0.02) {
    float uk = floor(rc.x * 7.0 + 0.5) / 7.0;
    float arrive = shBand(uk - u1, 0.05) + shBand(uk - u2, 0.05);
    float packet = step(fract((p.y - MAP_BASE) / MAP_PACKET), 0.33);
    return clamp(0.64 + 0.18 * packet + 0.14 * arrive, 0.0, 1.0);
  }
  float road = (1.0 - smoothstep(0.03, 0.06, abs(rc.y))) * step(length(p.xz), MAP_R + 0.05);
  float pulse = shBand(rc.x - u1, 0.035) + shBand(rc.x - u2, 0.035);
  float sweep = exp(-mod(uTime * 0.5 - atan(p.z, p.x), 6.2831853) * 2.5);
  return clamp(road * (0.38 + 0.3 * pulse) + (1.0 - road) * sweep * 0.3, 0.0, 0.54);
}
