import { TaskBudget } from './TaskBudget';

// os mesmos atributos que o WebGLRenderer pediria (ele sempre cria com alpha: true; o fundo opaco vem do clearColor)
const ATTRIBUTES: WebGLContextAttributes = {
  alpha: true,
  depth: true,
  stencil: false,
  antialias: false,
  premultipliedAlpha: true,
  preserveDrawingBuffer: false,
  powerPreference: 'high-performance',
  failIfMajorPerformanceCaveat: false,
};

// as que o three liga no construtor (WebGLExtensions.init) + as que o palco pede logo depois
const BOOT_EXTENSIONS = [
  'EXT_color_buffer_float',
  'WEBGL_clip_cull_distance',
  'OES_texture_float_linear',
  'EXT_color_buffer_half_float',
  'WEBGL_multisampled_render_to_texture',
  'WEBGL_render_shared_exponent',
  'KHR_parallel_shader_compile',
  'EXT_texture_filter_anisotropic',
  'WEBGL_debug_renderer_info',
] as const;

const POLL_MS = 4;
const SETTLE_TIMEOUT_MS = 3000;

const nextMacrotask = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, POLL_MS));

// respostas do getParameter adiantadas (pname → valor) pra quem consulta no boot
export type ContextAnswers = ReadonlyMap<number, unknown>;

// sem WebGL2 (three r163+) não tem palco: quem chama cai no fallback em CSS
export function createContext(canvas: HTMLCanvasElement): WebGL2RenderingContext {
  const gl = canvas.getContext('webgl2', ATTRIBUTES);
  if (!gl) throw new Error('webgl2 context unavailable');
  return gl;
}

// o contexto termina de nascer no processo da GPU depois do getContext: a 1ª chamada síncrona (o three faz
// várias no construtor) esperaria isso tudo travando a página. A fence sinaliza quando a GPU alcançou, e o
// status dela só atualiza entre tarefas, então a espera não bloqueia nada
export async function gpuSettled(gl: WebGL2RenderingContext): Promise<void> {
  const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  if (!sync) return;
  gl.flush();
  const start = performance.now();
  try {
    while (gl.getSyncParameter(sync, gl.SYNC_STATUS) !== gl.SIGNALED) {
      if (gl.isContextLost() || performance.now() - start > SETTLE_TIMEOUT_MS) return;
      await nextMacrotask();
    }
  } finally {
    gl.deleteSync(sync);
  }
}

// cada consulta síncrona à GPU custa 0,3 ms com ela livre e de 50 a 200 ms quando o processo da GPU está
// ocupado com o resto da página; o construtor do three faz dezenas de uma vez. Aqui elas vêm antes, depois
// de o contexto assentar, e a tarefa cede a vez assim que passa do orçamento. Extensões e precisão o
// navegador guarda; o resto volta como resposta pronta (constantes ou estado inicial que nada mexe até lá)
export async function warmContext(gl: WebGL2RenderingContext): Promise<ContextAnswers> {
  const answers = new Map<number, unknown>();
  const ask = (pname: number) => (): void => {
    answers.set(pname, gl.getParameter(pname));
  };
  const steps: (() => void)[] = [
    ...BOOT_EXTENSIONS.map((name) => () => gl.getExtension(name)),
    () => gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.HIGH_FLOAT),
    () => gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT),
    // as do construtor do three
    ask(gl.SAMPLES),
    ask(gl.VERSION),
    ask(gl.SCISSOR_BOX),
    // nome da GPU (tier) e teto do gl_PointSize (bokeh)
    () => {
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      if (info) ask(info.UNMASKED_RENDERER_WEBGL)();
    },
    ask(gl.ALIASED_POINT_SIZE_RANGE),
  ];
  await gpuSettled(gl);
  const budget = new TaskBudget();
  for (const step of steps) {
    step();
    await budget.next();
  }
  return answers;
}

// roda build (síncrono) com o getParameter respondendo do que já foi consultado; depois volta ao nativo
export function answering<T>(gl: WebGL2RenderingContext, answers: ContextAnswers, build: () => T): T {
  const native = gl.getParameter.bind(gl);
  gl.getParameter = (pname: GLenum): unknown => (answers.has(pname) ? answers.get(pname) : native(pname));
  try {
    return build();
  } finally {
    Reflect.deleteProperty(gl, 'getParameter');
  }
}
