import type { QualityTier } from '@presentation/app/AppEvents';

const SOFTWARE_GPU = /swiftshader|llvmpipe|softpipe|software|basic render/i;
const WEAK_GPU =
  /intel.*(hd|uhd) graphics|mali-(4|t)|mali-g(5|7)[0-2]|adreno( \(tm\))? [1-5]\d\d|powervr|sgx|vivante|videocore/i;
const STRONG_GPU = /nvidia|geforce|quadro|rtx|radeon (rx|pro)|apple m\d/i;
// celulares que aguentam bloom em meia resolução (iPhone recente, Adreno 640+, Mali G76+/G6xx+, Immortalis, Xclipse)
const CAPABLE_MOBILE_GPU =
  /apple gpu|adreno( \(tm\))? (6[4-9]\d|[7-9]\d\d)|mali-g(7[6-9]|[6-9]\d\d)|immortalis|xclipse/i;
const GENERIC_NAME = /^(webkit webgl|mozilla|angle)$/i;

interface DeviceHints {
  cores: number;
  memory: number | undefined;
  coarse: boolean;
  smallScreen: boolean;
}

const forcedTier = (): QualityTier | null => {
  const forced = new URLSearchParams(location.search).get('quality');
  return forced === 'low' || forced === 'medium' || forced === 'high' ? forced : null;
};

function deviceHints(coarse: boolean): DeviceHints {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    cores: nav.hardwareConcurrency || 4,
    memory: nav.deviceMemory,
    coarse,
    smallScreen: Math.min(screen.width, screen.height) < 600,
  };
}

const capableByHints = (hints: DeviceHints): boolean => hints.cores >= 8 && (hints.memory ?? 4) >= 6;

const lowSpec = (hints: DeviceHints): boolean =>
  hints.cores <= 2 || (hints.memory !== undefined && hints.memory < 4);

// desktop com GPU comum (nem fraca nem forte): decide pelos núcleos
const desktopByHints = (hints: DeviceHints): QualityTier =>
  !lowSpec(hints) && hints.cores >= 8 ? 'high' : 'medium';

// tier inicial pelo aparelho; ?quality=low|medium|high força um tier e trava o ajuste por FPS (QA)
export class QualityDetector {
  readonly forced = forcedTier() !== null;

  constructor(
    private readonly gl: WebGLRenderingContext | WebGL2RenderingContext,
    private readonly coarsePointer: boolean,
  ) {}

  // palpite antes de existir contexto (sem o nome da GPU): tamanho do canvas e contagem das formas no worker.
  // Segue o detect no caso de GPU comum; errar só custa refazer as formas
  static guess(coarsePointer: boolean): QualityTier {
    const forced = forcedTier();
    if (forced) return forced;
    const hints = deviceHints(coarsePointer);
    if (hints.coarse || hints.smallScreen) return capableByHints(hints) ? 'medium' : 'low';
    return desktopByHints(hints);
  }

  detect(): QualityTier {
    const forced = forcedTier();
    if (forced) return forced;

    const gpu = this.gpuName();
    if (SOFTWARE_GPU.test(gpu)) return 'low';
    const hints = deviceHints(this.coarsePointer);
    const weak = WEAK_GPU.test(gpu);

    if (hints.coarse || hints.smallScreen) {
      const capable = CAPABLE_MOBILE_GPU.test(gpu) || (capableByHints(hints) && !weak);
      return capable ? 'medium' : 'low';
    }
    if (weak || lowSpec(hints)) return 'medium';
    if (STRONG_GPU.test(gpu)) return 'high';
    return desktopByHints(hints);
  }

  // o RENDERER puro já vem desmascarado no Firefox; a extensão só se o nome for genérico
  private gpuName(): string {
    const gl = this.gl;
    const plain = String(gl.getParameter(gl.RENDERER) ?? '');
    if (plain && !GENERIC_NAME.test(plain)) return plain;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? '') : plain;
  }
}
