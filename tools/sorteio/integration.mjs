// liga o sorteio das equipes ao servidor de desenvolvimento do Astro, e só a ele: as duas páginas (/sorteio e
// /sorteio/nomes) e a API local entram aqui, por uma integração que o astro.config.mjs só carrega com SORTEIO=1
// (npm run sorteio). O build de produção nunca passa por aqui, então o site público não tem o sorteio, nem uma rota
// para adivinhar, nem um byte dele no pacote (tests/draw/productionGuard.test.ts confere)
import { resolve } from 'node:path';
import { handleDrawAction } from './xlsx-handler.mjs';

const API = '/__sorteio';

function readBody(request) {
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      try {
        resolveBody(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

function sendJson(response, status, body) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(body));
}

/**
 * @param {{ mode: 'local' | 'sheet', file?: string | undefined, endpoint?: string | undefined }} options
 *   local = a cópia do xlsx de teste; sheet = o Apps Script da planilha real (a senha é digitada na tela)
 * @returns {import('astro').AstroIntegration}
 */
export default function sorteio(options) {
  const file = options.file ? resolve(options.file) : '';
  const config =
    options.mode === 'local'
      ? { mode: 'local', label: file.split(/[\\/]/).slice(-2).join('/') }
      : { mode: 'sheet', label: 'planilha do HackaRun no Drive', endpoint: options.endpoint };

  return {
    name: 'hackarun-sorteio',
    hooks: {
      'astro:config:setup': ({ injectRoute, updateConfig }) => {
        injectRoute({ pattern: '/sorteio', entrypoint: './src/presentation/draw/pages/index.astro' });
        injectRoute({ pattern: '/sorteio/nomes', entrypoint: './src/presentation/draw/pages/nomes.astro' });
        updateConfig({
          vite: {
            plugins: [
              {
                name: 'hackarun-sorteio-api',
                apply: 'serve',
                configureServer(server) {
                  server.middlewares.use(`${API}/config`, (_request, response) =>
                    sendJson(response, 200, config),
                  );
                  server.middlewares.use(`${API}/api`, async (request, response) => {
                    if (request.method !== 'POST')
                      return sendJson(response, 405, { ok: false, error: 'method' });
                    // só a cópia local passa por aqui; a planilha real é falada direto com o Apps Script
                    if (config.mode !== 'local')
                      return sendJson(response, 404, { ok: false, error: 'not-local' });
                    try {
                      sendJson(response, 200, await handleDrawAction(file, await readBody(request)));
                    } catch {
                      sendJson(response, 400, { ok: false, error: 'bad-request' });
                    }
                  });
                },
              },
            ],
          },
        });
      },
    },
  };
}
