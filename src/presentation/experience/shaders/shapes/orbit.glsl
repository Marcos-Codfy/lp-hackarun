// ---------- orbit: cronômetro-giroscópio (OrbitShape.ts) ----------
#define ORBIT_HAND_Z 0.04
#define ORBIT_HAND_SPEED 0.7
const vec3 ORBIT_C_AXIS = vec3(0.70710678, -0.70710678, 0.0);
const vec3 ORBIT_BEAD_B = vec3(0.7527, 0.0, 0.5150);
const vec3 ORBIT_BEAD_C = vec3(-0.2830, 0.2830, 0.5498);
float orbitIsHand(vec3 p) {
  return step(abs(p.z - ORBIT_HAND_Z), 0.012) * step(abs(p.x), 0.06) * step(-0.32, p.y) * step(p.y, 1.2);
}
// ponteiro varre no plano do mostrador; anel B capota no eixo x e o C, preso nele, na diagonal (cardã)
vec3 shapeOrbit(vec3 p) {
  float r = length(p);
  float spinB = uTime * 0.55;
  vec3 q = p;
  if (orbitIsHand(p) > 0.5) q.xy = shRot2(p.xy, -uTime * ORBIT_HAND_SPEED);
  else if (r > 0.6 && r < 0.8) q = shRotAxis(shRotAxis(p, ORBIT_C_AXIS, -uTime * 0.8), vec3(1.0, 0.0, 0.0), spinB);
  else if (r >= 0.8 && r < 1.0) q = shRotAxis(p, vec3(1.0, 0.0, 0.0), spinB);
  return rotY(q, sin(uTime * 0.3) * 0.1);
}
// núcleo e ponteiro em brasa, marcas acendendo no rastro do ponteiro, arco já percorrido no aro
float orbitHeat(vec3 p) {
  float r = length(p);
  float heat = (1.0 - smoothstep(0.03, 0.16, r)) * 0.7;
  if (orbitIsHand(p) > 0.5) return max(heat, 0.6);
  float onDial = step(abs(p.z), 0.012);
  float theta = atan(p.y, p.x);
  float behind = mod(theta - (1.5707963 - uTime * ORBIT_HAND_SPEED), 6.2831853);
  float tick = onDial * step(0.97, r) * step(r, 1.32);
  heat += tick * (0.04 + step(r, 1.19) * 0.14 + 0.75 * exp(-behind * 1.2));
  float swept = mod(1.5707963 - theta, 6.2831853);
  heat += onDial * step(1.33, r) * step(r, 1.38) * step(swept, mod(uTime * ORBIT_HAND_SPEED, 6.2831853)) * 0.45;
  heat += (1.0 - smoothstep(0.02, 0.07, distance(p, ORBIT_BEAD_B))) * 0.9;
  heat += (1.0 - smoothstep(0.02, 0.07, distance(p, ORBIT_BEAD_C))) * 0.9;
  return clamp(heat, 0.0, 1.0);
}
