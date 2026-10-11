import {
  BufferGeometry,
  type Camera,
  type Object3D,
  type Scene,
  type WebGLRenderer,
  type WebGLRenderTarget,
} from 'three';

// draw range vazio: o three sobe os buffers e liga programa e VAO, mas a GPU não desenha nada
function withoutDraw(object: Object3D, run: () => void): void {
  const geometry = (object as { geometry?: unknown }).geometry;
  if (!(geometry instanceof BufferGeometry)) {
    run();
    return;
  }
  const { start, count } = geometry.drawRange;
  geometry.setDrawRange(0, 0);
  try {
    run();
  } finally {
    geometry.setDrawRange(start, count);
  }
}

// o 1º frame objeto por objeto e em dois passos: o upload dos buffers, depois o 1º desenho de verdade
// (é ele que fecha a variante do shader no driver). O canvas ainda está invisível, o alvo não importa
export function scenePrimeSteps(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  target: WebGLRenderTarget | null,
): (() => void)[] {
  const draw = (object: Object3D) => (): void => {
    renderer.setRenderTarget(target);
    renderer.render(object, camera);
    renderer.setRenderTarget(null);
  };
  return scene.children.flatMap((object) => [() => withoutDraw(object, draw(object)), draw(object)]);
}
