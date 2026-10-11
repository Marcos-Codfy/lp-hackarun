// boot resiliente: GSAP/Lenis ou um animador quebrado não pode deixar a página sem contador, formulário e menu
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppContext } from '@presentation/app/AppContext';
import type { BootSteps } from '@presentation/app/BootQueue';

const mocks = vi.hoisted(() => ({
  registerMotionPlugins: vi.fn(),
  mountMotion: vi.fn(),
  mountViews: vi.fn(),
  mountControllers: vi.fn(),
  mountAnimators: vi.fn(),
  anchorNavigator: vi.fn(),
  viewStep: vi.fn(),
  controllerStep: vi.fn(),
}));

vi.mock('@presentation/motion/core/gsap', () => ({ registerMotionPlugins: mocks.registerMotionPlugins }));
vi.mock('@presentation/motion/core/mountMotion', () => ({ mountMotion: mocks.mountMotion }));
vi.mock('@presentation/motion/core/AnchorNavigator', () => ({ AnchorNavigator: mocks.anchorNavigator }));
vi.mock('@presentation/views/mountViews', () => ({ mountViews: mocks.mountViews }));
vi.mock('@presentation/controllers/mountControllers', () => ({ mountControllers: mocks.mountControllers }));
vi.mock('@presentation/motion/animators/mountAnimators', () => ({ mountAnimators: mocks.mountAnimators }));
vi.mock('@presentation/experience/mountExperience', () => ({ mountExperience: vi.fn() }));

const boom = (message: string) => () => {
  throw new Error(message);
};

// App.booted é estático: cada teste carrega o módulo de novo (e a classe NativeScroll junto)
async function bootApp() {
  vi.resetModules();
  const { App } = await import('@presentation/app/App');
  const { NativeScroll } = await import('@presentation/motion/core/NativeScroll');
  App.boot();
  await vi.waitFor(() => expect(mocks.viewStep).toHaveBeenCalled());
  return { ctx: mocks.mountViews.mock.calls[0]?.[0] as AppContext, NativeScroll };
}

describe('App.boot', () => {
  let error: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetAllMocks();
    document.body.innerHTML = `
      <script id="app-config" type="application/json">{}</script>`;
    error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.mountViews.mockImplementation((_ctx: AppContext, boot: BootSteps) =>
      boot.add('countdown', mocks.viewStep),
    );
    mocks.mountControllers.mockImplementation((_ctx: AppContext, boot: BootSteps) =>
      boot.add('header', mocks.controllerStep),
    );
  });

  afterEach(() => error.mockRestore());

  it('mountMotion quebrado: cai no scroll nativo com trilha vazia e as Views montam', async () => {
    mocks.mountMotion.mockImplementation(boom('lenis down'));

    const { ctx, NativeScroll } = await bootApp();

    expect(ctx.motion).toBeInstanceOf(NativeScroll);
    expect(ctx.scenes.keys).toEqual([]);
    expect(ctx.scenes.progress.value).toBe(0);
    expect(error).toHaveBeenCalledWith('[boot] motion failed', expect.any(Error));
  });

  it('no plano B os links "#secao" continuam com o navegador de âncoras', async () => {
    mocks.mountMotion.mockImplementation(boom('gsap down'));

    const { ctx } = await bootApp();

    expect(mocks.anchorNavigator).toHaveBeenCalledWith(ctx.motion);
  });

  it('animador quebrado não leva os controladores nem as Views', async () => {
    const motion = { scrollTo: vi.fn(), stop: vi.fn(), start: vi.fn() };
    mocks.mountMotion.mockReturnValue({ motion, scenes: { keys: [] } });
    mocks.mountAnimators.mockImplementation(boom('split down'));

    const { ctx } = await bootApp();

    await vi.waitFor(() => expect(mocks.controllerStep).toHaveBeenCalled());
    expect(ctx.motion).toBe(motion);
    expect(mocks.anchorNavigator).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith('[boot] animators failed', expect.any(Error));
  });

  it('plugin do GSAP que não registra não para o boot', async () => {
    mocks.registerMotionPlugins.mockImplementation(boom('plugin down'));
    mocks.mountMotion.mockImplementation(boom('plugin down'));

    const { ctx, NativeScroll } = await bootApp();

    expect(ctx.motion).toBeInstanceOf(NativeScroll);
    expect(error).toHaveBeenCalledWith('[boot] plugins failed', expect.any(Error));
  });
});
