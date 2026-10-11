import {
  Camera,
  Mesh,
  PlaneGeometry,
  Scene,
  WebGLRenderTarget,
  type Material,
  type Object3D,
  type WebGLRenderer,
} from 'three';
import type { WebGLProgram as ThreeProgram } from 'three';
import { TaskBudget } from '../TaskBudget';
import type { RenderPipeline } from './RenderPipeline';
import { logShaderError } from './shaderError';

// cada consulta do status é uma ida à GPU (com ela ocupada, até centenas de ms): sem pressa, o link leva segundos
const POLL_MS = 50;

// isReady existe no r186 (consulta COMPLETION_STATUS_KHR), só falta nos tipos
type ParallelProgram = ThreeProgram & { isReady?: () => boolean };

const isReady = (program: ParallelProgram): boolean => program.isReady?.() ?? true;
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// pré-compila em fatias (montar o shader no JS já pesa) com o alvo certo de cada um
// (o three troca o programa por alvo). Com KHR_parallel_shader_compile o link roda na GPU em paralelo
// e a espera só consulta o status, sem travar a página
export class StageCompiler {
  constructor(
    private readonly renderer: WebGLRenderer,
    private readonly camera: Camera,
  ) {
    // liga antes do 1º linkProgram (o warmContext já pediu: aqui sai do cache)
    renderer.extensions.get('KHR_parallel_shader_compile');
  }

  // um objeto só, antes do palco existir (o programa das partículas leva segundos na GPU e não precisa
  // esperar). A chave do programa só vê se há alvo, então um 1×1 descartável basta; a câmera não entra nela
  static queueAhead(renderer: WebGLRenderer, object: Object3D, offscreen: boolean): void {
    const target = offscreen ? new WebGLRenderTarget(1, 1) : null;
    renderer.setRenderTarget(target);
    try {
      renderer.compile(object, new Camera(), new Scene());
    } finally {
      renderer.setRenderTarget(null);
      target?.dispose();
    }
  }

  // devolve os programas novos; espera todos ficarem prontos (inclusive os que entraram na fila antes)
  async compile(scene: Scene, pipeline: RenderPipeline): Promise<ThreeProgram[]> {
    const before = new Set(this.programs());
    const target = pipeline.sceneTarget;
    const budget = new TaskBudget();
    for (const object of scene.children) {
      this.queue(object, scene, target);
      await budget.next();
    }
    const { offscreen, screen } = pipeline.passMaterials();
    // sem normal, igual ao triângulo do FullScreenQuad (normal muda a chave do programa)
    const quad = new PlaneGeometry(2, 2).deleteAttribute('normal');
    const passes: [Material, WebGLRenderTarget | null][] = [
      ...offscreen.map((material): [Material, WebGLRenderTarget | null] => [material, target]),
      ...screen.map((material): [Material, WebGLRenderTarget | null] => [material, null]),
    ];
    try {
      for (const [material, passTarget] of passes) {
        // os quads do pós vivem fora da cena: uma cena descartável só pra enfileirar o programa
        const holder = new Scene().add(new Mesh(quad, material));
        this.queue(holder, holder, passTarget);
        await budget.next();
      }
    } finally {
      // o compile só cria programas: a geometria nem chega a subir
      quad.dispose();
    }
    const created = this.programs().filter((program) => !before.has(program));
    await this.linkedAll(this.programs());
    return created;
  }

  // 1º uso de cada programa (tabela de uniforms) fora do 1º frame, em fatias. Os logs do link custam
  // três idas síncronas à GPU por programa: aqui o three não busca e o link é conferido direto
  // (o LINK_STATUS já vem no cache do navegador). false = algum programa não linkou
  async warm(programs: readonly ThreeProgram[] = this.programs()): Promise<boolean> {
    const { debug } = this.renderer;
    const checking = debug.checkShaderErrors;
    let linked = true;
    const budget = new TaskBudget();
    debug.checkShaderErrors = false;
    try {
      for (const program of programs) {
        if (checking && !this.linked(program)) linked = false;
        program.getUniforms();
        await budget.next();
      }
    } finally {
      debug.checkShaderErrors = checking;
    }
    return linked;
  }

  private programs(): ThreeProgram[] {
    return this.renderer.info.programs ?? [];
  }

  // o compileAsync do three olha o programa *atual* de cada material, que alterna enquanto o palco segue
  // desenhando com o pipeline antigo (troca de nível): aqui a espera é pelos programas mesmo (os antigos
  // já estão prontos). Programa liberado no meio do caminho ou contexto perdido não segura a fila
  private async linkedAll(programs: readonly ThreeProgram[]): Promise<void> {
    const gl = this.renderer.getContext();
    for (;;) {
      const live = new Set(this.programs());
      const waiting = programs.some((program) => live.has(program) && !isReady(program));
      if (!waiting || gl.isContextLost()) return;
      await delay(POLL_MS);
    }
  }

  private linked(program: ThreeProgram): boolean {
    const gl = this.renderer.getContext();
    const native = program.program;
    if (!(native instanceof WebGLProgram) || gl.getProgramParameter(native, gl.LINK_STATUS) !== false)
      return true;
    logShaderError(gl, native, program.vertexShader, program.fragmentShader);
    return false;
  }

  private queue(object: Object3D, scene: Scene, target: WebGLRenderTarget | null): void {
    // só a parte síncrona (montar e mandar os shaders); o alvo entra na chave do programa
    this.renderer.setRenderTarget(target);
    try {
      this.renderer.compile(object, this.camera, scene);
    } finally {
      this.renderer.setRenderTarget(null);
    }
  }
}
