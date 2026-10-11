// programa que não linkou: os logs do driver pro console (o palco cai no fallback em CSS logo depois)
export function logShaderError(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  program: WebGLProgram,
  vertex: WebGLShader,
  fragment: WebGLShader,
): void {
  console.error(
    '[experience] shader error',
    gl.getProgramInfoLog(program),
    gl.getShaderInfoLog(vertex),
    gl.getShaderInfoLog(fragment),
  );
}
