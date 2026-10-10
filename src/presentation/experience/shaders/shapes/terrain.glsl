// ---------- terrain: synthwave (TerrainShape.ts) ----------
#define TERRAIN_NEAR 1.3
#define TERRAIN_FAR -4.8
#define TERRAIN_W_NEAR 0.8
#define TERRAIN_W_FAR 5.4
#define TERRAIN_SPEED 0.22
float terrainWidth(float z) {
  return mix(TERRAIN_W_NEAR, TERRAIN_W_FAR, (TERRAIN_NEAR - z) / (TERRAIN_NEAR - TERRAIN_FAR));
}
// a linha rola pra câmera e reaparece no fundo; o espaçamento divide o trecho, então não tem emenda
float terrainScroll(float z) {
  return TERRAIN_FAR + mod(z - TERRAIN_FAR + uTime * TERRAIN_SPEED, TERRAIN_NEAR - TERRAIN_FAR);
}
// montanhas nas laterais (fração da largura visível) crescendo com a distância; vale plano no meio
float terrainHeight(float x, float z) {
  float side = smoothstep(0.4, 0.92, abs(x) / terrainWidth(z));
  float depth = smoothstep(TERRAIN_NEAR - 0.8, TERRAIN_NEAR - 3.4, z);
  float ridge = 1.0 - abs(snoise(vec3(x * 0.42, z * 0.42, 3.7)));
  return 1.5 * side * depth * (0.25 + 0.75 * ridge * ridge);
}
// sol e horizonte (atrás do fundo) ficam parados; linha (y = 0) rola e acompanha a largura; coluna só levanta
vec3 shapeTerrain(vec3 p) {
  if (p.z < TERRAIN_FAR - 0.03) return p;
  if (p.y > -0.005) {
    float z = terrainScroll(p.z);
    float x = p.x * terrainWidth(z) / terrainWidth(p.z);
    return vec3(x, terrainHeight(x, z), z);
  }
  return vec3(p.x, terrainHeight(p.x, p.z), p.z);
}
// sol mais quente no topo, horizonte aceso e a grade esquentando perto do fundo
float terrainHeat(vec3 p) {
  if (p.z < TERRAIN_FAR - 0.09) return 0.5 + 0.35 * clamp(p.y / 1.49, 0.0, 1.0) + 0.04 * sin(uTime * 1.2);
  if (p.z < TERRAIN_FAR - 0.03) return 0.5;
  float z = p.y > -0.005 ? terrainScroll(p.z) : p.z;
  return smoothstep(TERRAIN_NEAR - 2.5, TERRAIN_FAR, z) * 0.22;
}
