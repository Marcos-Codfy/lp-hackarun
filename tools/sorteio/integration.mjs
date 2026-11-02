// cópia de teste do sorteio no servidor de desenvolvimento do Astro (npm run sorteio, SORTEIO=1): a API local que lê e
// grava o xlsx e o SORTEIO_LOCAL=1 que faz as telas /sorteio usarem essa API e mostrarem os botões de teste. O build de
// produção nunca passa por aqui: lá as telas falam com a função da Cloudflare (functions/_middleware.ts), atrás do
// login da organização, e nada da cópia de teste vai no pacote (tests/draw/productionGuard.test.ts confere)
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
 * @param {{ file?: string | undefined }} options  o xlsx da cópia de teste
 * @returns {import('astro').AstroIntegration}
 */
export default function sorteio(options) {
  const file = options.file ? resolve(options.file) : '';
  const config = { mode: 'local', label: file.split(/[\\/]/).slice(-2).join('/') };

  return {
    name: 'hackarun-sorteio',
    hooks: {
      'astro:config:setup': ({ command, updateConfig }) => {
        // só no `astro dev`: um build com SORTEIO=1 por engano não leva a cópia de teste para o site
        if (command !== 'dev') return;
        updateConfig({
          vite: {
            define: { 'import.meta.env.SORTEIO_LOCAL': JSON.stringify('1') },
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
