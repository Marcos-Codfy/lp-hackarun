// prepara o projeto num PC novo (fork ou clone): confere o Node, instala as dependências, cria o .env e,
// com --qa, instala os scripts de QA. Só usa módulos do próprio Node, então roda antes do npm ci.
// uso: npm run setup               (ou: node scripts/setup.mjs)
//      npm run setup -- --qa       também instala scripts/qa (Playwright + Lighthouse)
//      npm run setup -- --check    só confere, sem instalar nem criar nada
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const QA_DIR = join(ROOT, 'scripts', 'qa');

const HELP = `Prepara o HackaRun para rodar neste PC.

  npm run setup               confere o Node, roda npm ci (se faltar) e cria o .env
  npm run setup -- --qa       também instala os scripts de QA (scripts/qa)
  npm run setup -- --check    só confere, sem instalar nem criar nada
`;

const print = (line = '') => process.stdout.write(`${line}\n`);
const ok = (text) => print(`  ok    ${text}`);
const warn = (text) => print(`  aviso ${text}`);
const todo = (text) => print(`  falta ${text}`);

// "v24.1.0", "24" ou ">=22.18.0" -> [24, 1, 0]
function parseVersion(text) {
  const match = String(text).match(/(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)];
}

function isAtLeast(version, minimum) {
  for (let i = 0; i < 3; i += 1) {
    if (version[i] !== minimum[i]) return version[i] > minimum[i];
  }
  return true;
}

function readText(path) {
  return existsSync(path) ? readFileSync(path, 'utf8').trim() : '';
}

function readJson(path) {
  try {
    return JSON.parse(readText(path) || '{}');
  } catch {
    return {};
  }
}

// o npm guarda em node_modules/.package-lock.json o que instalou; versão diferente do package-lock.json
// (depois de um git pull, por exemplo) pede um npm ci. Pacote opcional de outra plataforma não conta
function lockIsStale(marker) {
  const wanted = readJson(join(ROOT, 'package-lock.json')).packages ?? {};
  const installed = readJson(marker).packages ?? {};
  return Object.entries(wanted).some(([path, info]) => {
    if (path === '') return false;
    const got = installed[path];
    if (!got) return !info.optional && !info.devOptional;
    return got.version !== info.version;
  });
}

// pelo `npm run`, o npm_execpath aponta pro npm-cli.js e o próprio Node roda ele (nada de shell);
// rodando o script direto, chama o npm do PATH (no Windows ele é um .cmd e precisa de shell)
function npm(args, cwd) {
  const cli = process.env.npm_execpath ?? '';
  const result = /npm-cli\.c?js$/.test(cli)
    ? spawnSync(process.execPath, [cli, ...args], { cwd, stdio: 'inherit' })
    : spawnSync(`npm ${args.join(' ')}`, { cwd, stdio: 'inherit', shell: true });
  return result.status === 0;
}

function checkNode() {
  const current = parseVersion(process.versions.node);
  const engines = readJson(join(ROOT, 'package.json')).engines?.node ?? '';
  const minimum = parseVersion(engines);
  const recommended = parseVersion(readText(join(ROOT, '.nvmrc')));
  if (minimum && !isAtLeast(current, minimum)) {
    todo(`Node ${process.versions.node} é antigo demais (o projeto pede ${engines}).`);
    print(
      '        Instale o Node 24 LTS (nvm install 24 e depois nvm use 24, ou https://nodejs.org) e rode de novo.',
    );
    return false;
  }
  if (recommended && current[0] !== recommended[0]) {
    warn(`Node ${process.versions.node}: funciona, mas a CI usa o ${recommended[0]} (.nvmrc). Prefira ele.`);
  } else {
    ok(`Node ${process.versions.node}`);
  }
  return true;
}

function installDependencies(check) {
  const marker = join(ROOT, 'node_modules', '.package-lock.json');
  if (existsSync(marker)) {
    if (lockIsStale(marker))
      warn('o package-lock.json mudou depois da última instalação: rode npm ci de novo.');
    else ok('dependências instaladas (node_modules)');
    return true;
  }
  if (check) {
    todo('dependências: rode npm ci (ou npm run setup sem --check).');
    return false;
  }
  print('  ...   instalando as dependências (npm ci)');
  if (npm(['ci'], ROOT)) return true;
  todo('o npm ci falhou. Veja o erro acima e a seção "Problemas comuns" do README.');
  return false;
}

function createEnv(check) {
  const env = join(ROOT, '.env');
  if (existsSync(env)) {
    ok('.env já existe (não mexi)');
    return true;
  }
  if (check) {
    todo('.env: copie o .env.example para .env.');
    return false;
  }
  copyFileSync(join(ROOT, '.env.example'), env);
  ok('.env criado a partir do .env.example (sem endpoint: a inscrição roda simulada no npm run dev)');
  return true;
}

async function installQa(check) {
  if (!existsSync(join(QA_DIR, 'node_modules'))) {
    if (check) {
      todo('scripts de QA: rode npm run setup -- --qa');
      return false;
    }
    print('  ...   instalando os scripts de QA (Playwright + Lighthouse)');
    // sem package-lock: a pasta de QA não versiona lock, então a instalação não deixa arquivo novo no Git
    if (!npm(['install', '--no-package-lock'], QA_DIR)) {
      todo('o npm install de scripts/qa falhou.');
      return false;
    }
  }
  ok('scripts de QA instalados (scripts/qa)');
  try {
    const { browserPath } = await import(pathToFileURL(join(QA_DIR, 'lib', 'browser.mjs')).href);
    const path = browserPath();
    if (path) ok(`navegador do QA: ${path}`);
    else warn('sem Brave nem Chrome: dentro de scripts/qa, rode npx playwright install chromium');
  } catch {
    warn('não consegui procurar o navegador do QA; confira scripts/qa/README.md');
  }
  return true;
}

function nextSteps(qa) {
  print();
  print('Próximos passos:');
  print('  npm run dev        http://localhost:4321 (inscrição simulada, nada vai para planilha nenhuma)');
  print('  npm test           testes (Vitest)');
  print('  npm run validate   lint + testes + build, o mesmo que a CI roda');
  print();
  print('Opcional:');
  if (!qa) print('  npm run setup -- --qa                       scripts de QA (Playwright + Lighthouse)');
  print('  python -m pip install -r requirements.txt   scripts de assets em Python (fonte e PDFs)');
  print('  apps-script/README.md                       ligar o formulário a uma planilha de teste sua');
  print();
  print('Guia completo: README.md, seção "Como rodar no seu PC".');
}

async function main() {
  const { values } = parseArgs({
    options: { qa: { type: 'boolean' }, check: { type: 'boolean' }, help: { type: 'boolean', short: 'h' } },
  });
  if (values.help) {
    print(HELP);
    return 0;
  }
  const check = Boolean(values.check);
  print(check ? 'HackaRun · conferindo o ambiente' : 'HackaRun · preparando o ambiente');
  if (!checkNode()) return 1;
  const results = [installDependencies(check), createEnv(check)];
  if (values.qa) results.push(await installQa(check));
  if (results.includes(false)) return 1;
  if (!check) nextSteps(Boolean(values.qa));
  return 0;
}

process.exitCode = await main();
