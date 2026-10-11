// navegador do QA: Brave/Chrome instalado (GPU de verdade) ou, sem nenhum, o Chromium do Playwright
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const LOCAL = process.env.LOCALAPPDATA ?? '';

const INSTALLED = {
  win32: [
    'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',
    join(LOCAL, 'BraveSoftware/Brave-Browser/Application/brave.exe'),
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    join(LOCAL, 'Google/Chrome/Application/chrome.exe'),
  ],
  darwin: [
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ],
  linux: ['/usr/bin/brave-browser', '/usr/bin/google-chrome', '/usr/bin/chromium'],
};

// headless sem essas flags cai no SwiftShader (GPU por software) e o 3D sempre escolhe o tier "low"
const GPU_ARGS = [
  '--enable-gpu',
  '--ignore-gpu-blocklist',
  ...(process.platform === 'win32' ? ['--use-angle=d3d11'] : []),
];

export const MOBILE = {
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3,
};
export const DESKTOP = { viewport: { width: 1440, height: 900 } };

// Mbit/s; "slow4g" é o mesmo perfil do Lighthouse mobile
const NETWORKS = {
  '4g': { latency: 150, down: 9, up: 1.5 },
  slow4g: { latency: 150, down: 1.6, up: 0.75 },
};

// BRAVE_PATH > CHROME_PATH > caminho padrão de instalação > undefined (Chromium do Playwright)
export function browserPath() {
  const fromEnv = process.env.BRAVE_PATH || process.env.CHROME_PATH;
  if (fromEnv) return fromEnv;
  return (INSTALLED[process.platform] ?? []).find((path) => existsSync(path));
}

export function launch({ gpu = true } = {}) {
  const executablePath = browserPath();
  return chromium.launch({
    headless: true,
    args: gpu ? GPU_ARGS : [],
    ...(executablePath ? { executablePath } : {}),
  });
}

// rede e CPU via CDP (só Chromium); cpu 4 = celular médio no padrão do Lighthouse
export async function throttle(context, page, { network, cpu = 1 }) {
  const cdp = await context.newCDPSession(page);
  const profile = NETWORKS[network];
  if (profile) {
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: profile.latency,
      downloadThroughput: (profile.down * 1024 * 1024) / 8,
      uploadThroughput: (profile.up * 1024 * 1024) / 8,
    });
  }
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  return cdp;
}

// o 3D desenhou o 1º frame quando o <html> ganha is-experience-ready; sem WebGL nunca chega (false)
export function waitForExperience(page, timeout = 30000) {
  return page
    .waitForFunction(() => document.documentElement.classList.contains('is-experience-ready'), null, {
      timeout,
    })
    .then(
      () => true,
      () => false,
    );
}

// erros e avisos do console e exceções da página, pra imprimir no fim
export function collectConsole(page) {
  const logs = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') logs.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', (error) => logs.push(`[pageerror] ${error.message}`));
  return logs;
}
