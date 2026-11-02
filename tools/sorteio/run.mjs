// npm run sorteio: sobe as telas do sorteio das equipes (só na máquina da organização, em http://127.0.0.1:4400)
//   npm run sorteio                  usa a cópia de teste (.local/sorteio/hackarun-teste.xlsx; npm run sorteio:preparar cria)
//   npm run sorteio -- --port 4405   outra porta
// O servidor só escuta o próprio computador (127.0.0.1). A planilha real só é usada pelo site publicado
// (hackarun.com.br/sorteio, com o login da organização).
import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';

// porta: 4400, ou outra com --port 4405 (útil quando já tem um servidor do sorteio aberto)
const portArg = process.argv.indexOf('--port');
const PORT = portArg > -1 && process.argv[portArg + 1] ? process.argv[portArg + 1] : '4400';
const file = new URL('../../.local/sorteio/hackarun-teste.xlsx', import.meta.url);
const filePath = file.pathname.replace(/^\/(\w:)/, '$1');

try {
  await access(file);
} catch {
  console.error('Ainda não existe a cópia de teste. Rode antes: npm run sorteio:preparar');
  process.exit(1);
}
const env = { ...process.env, SORTEIO: '1', SORTEIO_FILE: filePath };

console.log(`Modo: cópia de teste (${filePath})`);
console.log(`Abra http://127.0.0.1:${PORT}/sorteio`);
const child = spawn('npx', ['astro', 'dev', '--host', '127.0.0.1', '--port', PORT], {
  env,
  stdio: 'inherit',
  shell: true,
});
child.on('exit', (code) => process.exit(code ?? 0));
