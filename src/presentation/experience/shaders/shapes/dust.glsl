// ---------- dust: galáxia distante (DustShape.ts) — giro rígido e lento, os braços não enrolam ----------
vec3 shapeDust(vec3 p) { return rotY(p, uTime * 0.03); }
