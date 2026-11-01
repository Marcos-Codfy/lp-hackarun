// npm run sorteio: sobe as telas do sorteio das equipes (só na máquina da organização, em http://127.0.0.1:4400)
//   npm run sorteio                  usa a cópia de teste (.local/sorteio/hackarun-teste.xlsx; npm run sorteio:preparar cria)
//   npm run sorteio -- --planilha    usa a planilha real, pelo Apps Script (pede a senha do sorteio na tela)
// O servidor só escuta o próprio computador (127.0.0.1) e as telas não existem no build do site público.
import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';

const PORT = '4400';
const real = process.argv.includes('--planilha');
const file = new URL('../../.local/sorteio/hackarun-teste.xlsx', import.meta.url);
const filePath = file.pathname.replace(/^\/(\w:)/, '$1');

const env = { ...process.env, SORTEIO: '1' };
if (real) {
  const endpoint = process.env.SORTEIO_ENDPOINT || process.env.PUBLIC_REGISTRATION_ENDPOINT;
  if (!endpoint) {
    console.error(
      'Defina SORTEIO_ENDPOINT (ou PUBLIC_REGISTRATION_ENDPOINT) com o endereço do Apps Script da planilha.',
    );
    process.exit(1);
  }
  env.SORTEIO_MODE = 'sheet';
  env.SORTEIO_ENDPOINT = endpoint;
} else {
  try {
    await access(file);
  } catch {
    console.error('Ainda não existe a cópia de teste. Rode antes: npm run sorteio:preparar');
    process.exit(1);
  }
  env.SORTEIO_MODE = 'local';
  env.SORTEIO_FILE = filePath;
}

console.log(real ? 'Modo: PLANILHA REAL (Apps Script)' : `Modo: cópia de teste (${filePath})`);
console.log(`Abra http://127.0.0.1:${PORT}/sorteio`);
const child = spawn('npx', ['astro', 'dev', '--host', '127.0.0.1', '--port', PORT], {
  env,
  stdio: 'inherit',
  shell: true,
});
child.on('exit', (code) => process.exit(code ?? 0));
