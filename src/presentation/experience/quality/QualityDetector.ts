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

// tier inicial pelo aparelho; ?quality=low|medium|high força um tier e trava o ajuste por FPS (QA)
export class QualityDetector {
  readonly forced = forcedTier() !== null;

  constructor(
    private readonly gl: WebGLRenderingContext | WebGL2RenderingContext,
    private readonly coarsePointer: boolean,
  ) {}

  detect(): QualityTier {
    const forced = forcedTier();
    if (forced) return forced;

    const gpu = this.gpuName();
    if (SOFTWARE_GPU.test(gpu)) return 'low';
    const hints = this.hints();
    const weak = WEAK_GPU.test(gpu);

    if (hints.coarse || hints.smallScreen) {
      const capable = CAPABLE_MOBILE_GPU.test(gpu) || (hints.cores >= 8 && (hints.memory ?? 4) >= 6 && !weak);
      return capable ? 'medium' : 'low';
    }
    if (weak || hints.cores <= 2 || (hints.memory !== undefined && hints.memory < 4)) return 'medium';
    if (STRONG_GPU.test(gpu)) return 'high';
    return hints.cores >= 8 ? 'high' : 'medium';
  }

  private hints(): DeviceHints {
    const nav = navigator as Navigator & { deviceMemory?: number };
    return {
      cores: nav.hardwareConcurrency || 4,
      memory: nav.deviceMemory,
      coarse: this.coarsePointer,
      smallScreen: Math.min(screen.width, screen.height) < 600,
    };
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
