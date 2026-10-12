# Scripts de QA

Captura visual, métricas de carregamento, tarefas longas, âncoras e scroll horizontal da landing page, com
**Playwright** dirigindo um navegador de verdade e **Lighthouse**. A pasta tem o próprio `package.json`: o `npm ci` do
projeto continua leve, e só quem vai fazer QA instala estas dependências.

## Instalação

```bash
cd scripts/qa
npm install
# só se a máquina não tiver Brave nem Chrome:
npx playwright install chromium
```

Rode sempre contra o **build de produção** (o `npm run dev` não tem os mesmos chunks, CSS inline nem cache):

```bash
# na raiz do projeto
npm run build && npm run preview   # http://localhost:4321/
```

As saídas (capturas, traces, relatórios) vão para `scripts/qa/out/`, que fica fora do Git.

## Navegador

Os scripts procuram o navegador nesta ordem:

1. `BRAVE_PATH` (variável de ambiente);
2. `CHROME_PATH` (a mesma que o Lighthouse usa);
3. Brave ou Chrome no caminho padrão de instalação do sistema (Windows, macOS ou Linux);
4. o Chromium baixado pelo Playwright (`npx playwright install chromium`).

```bash
# bash
BRAVE_PATH="/caminho/do/brave" node shots.mjs http://localhost:4321/ 1440 900
# PowerShell
$env:BRAVE_PATH = 'C:\caminho\do\brave.exe'; node shots.mjs http://localhost:4321/ 1440 900
```

Preferimos o navegador instalado porque ele usa a **GPU de verdade** (`--enable-gpu`, `--ignore-gpu-blocklist` e,
no Windows, `--use-angle=d3d11`). Sem GPU o headless cai na renderização por software e o 3D sempre escolhe o tier
`low`, então a captura e as métricas não representam o site real.

## Scripts

| Script                   | O que mede ou faz                                                       | Atalho                        |
| ------------------------ | ----------------------------------------------------------------------- | ----------------------------- |
| `shots.mjs`              | Capturas do topo e de cada seção, depois que o 3D desenhou              | `npm run shots -- <url>`      |
| `vitals.mjs`             | LCP, CLS, `load`, tempo até o 3D e bytes, em 4G simulado e sem limite   | `npm run vitals -- <url>`     |
| `longtasks.mjs`          | Tarefas longas no carregamento (celular, CPU 4x, 4G lento), com mediana | `npm run longtasks -- <url>`  |
| `trace.mjs`              | Trace do Chrome até o 1º paint, download dos arquivos e passos `boot:*` | `npm run trace -- <url>`      |
| `anchorcheck.mjs`        | Links do header e CTAs param o destino logo abaixo do header            | `npm run anchors -- <url>`    |
| `overflow.mjs`           | Elementos que passam da largura da tela (scroll horizontal no celular)  | `npm run overflow -- <url>`   |
| `lighthouse.mjs`         | Lighthouse mobile (ou desktop) várias vezes, com resumo e mediana       | `npm run lighthouse -- <url>` |
| `lighthouse-summary.mjs` | Resume relatórios JSON do Lighthouse que você já tem                    | `npm run lighthouse:summary`  |

Todos aceitam a URL como primeiro argumento, então dá para apontar para o preview local, para a URL de preview do PR
na Cloudflare ou para produção. Parâmetros do site também valem na URL: `?quality=low` ou `?quality=high` força o
tier do 3D e `?now=2026-11-14T16:00:00-03:00` desloca o relógio.

### shots.mjs

```bash
node shots.mjs <url> [largura] [altura] [pasta] ["seletor[@deslocamento],..."] [--mobile]
node shots.mjs http://localhost:4321/ 390 844 out/m390 "#sobre,#missoes@0.5,#inscricao" --mobile
```

- Espera a classe `is-experience-ready` no `<html>` (o 3D desenhou o 1º frame) e salva `00-top.png`.
- Para cada seletor, rola até ele e captura. `@0.5` desloca meia tela depois do topo do elemento (bom para seções
  com pin, como as missões).
- `--mobile` liga `isMobile`, toque e DPR 2. Larguras do checklist: 360 e 390 (com `--mobile`), 768, 1024,
  1366 ou 1440 e 1920.
- `--step-wait=1600` (ms entre rolar e capturar) e `--ready-timeout=30000` (espera pelo 3D).
- No fim lista erros e avisos do console. Sem pasta, grava em `out/shots-<largura>/`.

### vitals.mjs

```bash
node vitals.mjs <url> [--mobile]
```

Duas linhas: `4g` (9 Mbit/s, 150 ms; no celular também CPU 4x mais lenta) e `wifi` (sem limite, referência). Mostra
LCP, CLS, `load`, quando o 3D ficou pronto e quanto foi transferido.

### longtasks.mjs

```bash
node longtasks.mjs <url> [--cpu=4] [--runs=3]
```

Celular (390 px, DPR 3) em 4G lento (o perfil do Lighthouse mobile) com a CPU mais lenta. Cada rodada imprime FCP,
LCP, `domInteractive` e as tarefas longas `[início, duração]`; no fim, a mediana e a soma do que passou de 50 ms
(parecido com o TBT, mas medido até `load` + 2,5 s). Conte e compare tarefas entre versões em vez de olhar só o tempo
absoluto.

### trace.mjs

```bash
node trace.mjs <url> [--out=arquivo.json] [--cpu=4]
```

Grava um trace do Chrome (mesmo perfil do `longtasks`) e imprime:

- o tempo da thread principal por tipo de evento até o FCP (eventos aninhados aparecem em mais de uma linha: compare
  entre rodadas, não some a coluna);
- quando cada arquivo terminou de chegar;
- os passos da `BootQueue` (`boot:<nome>`, início e duração).

Abra o `.json` no painel **Performance** do DevTools para ver a linha do tempo completa.

### anchorcheck.mjs

```bash
node anchorcheck.mjs <url> [--tolerance=4]
```

Clica nos links do header (desktop) e, no celular, no link do FAQ do rodapé, e confere se o topo da seção de destino
para na folga do header (`scroll-padding-top` do `<html>`, ou o `data-anchor-offset` do próprio alvo: o palco do
clímax, `#inscricao`, para no topo), com tolerância em px. Os CTAs de inscrição (header no desktop, hero no celular)
têm de abrir `/inscricao` com a origem no endereço (`?origem=header`, `?origem=hero`). Também testa a volta de
`/equipes` para a LP (`/#programacao`), o "Voltar ao evento" de quem chegou direto em `/equipes` ou `/inscricao` (cai
no clímax, `/#inscricao`) e um endereço com âncora aberto direto (`/#faq`): no desktop o pin das missões abre espaço
depois do pulo do navegador. As seções com render adiado (`content-visibility`) são as que mais erram o alvo. Sai com
código 1 se alguma âncora errar, então serve em script de CI.

### overflow.mjs

```bash
node overflow.mjs <url> [--width=360] [--width=390]
```

Lista até 25 elementos que passam da borda da tela em cada largura (ignora quem está dentro de um pai com
`overflow: hidden/clip` e quem está fora da tela de propósito, como o honeypot do formulário). Mostra também se a
página rola na horizontal. Sai com código 1 se achar algo.

### lighthouse.mjs e lighthouse-summary.mjs

```bash
node lighthouse.mjs <url> [--runs=3] [--desktop]
node lighthouse-summary.mjs out/lighthouse/mobile-1.json out/lighthouse/mobile-2.json
```

O `lighthouse.mjs` roda o Lighthouse instalado nesta pasta com o mesmo navegador dos outros scripts (passa o
`CHROME_PATH`), salva cada rodada em `out/lighthouse/` e chama o resumo: nota de performance, TBT, LCP, FCP, Speed
Index, CLS, tarefas longas por script, bootup e divisão da thread principal. Com mais de um relatório imprime a
mediana; as medições oscilam bastante, então compare medianas de 3 ou mais rodadas.

O CLI do Lighthouse também funciona direto, se preferir:

```bash
CHROME_PATH="/caminho/do/brave" npx lighthouse http://localhost:4321/ --form-factor=mobile --quiet \
  --chrome-flags="--headless=new --enable-gpu" --output=html --output-path=out/lighthouse-mobile.html
```

## Escrevendo um script novo

- Use `lib/browser.mjs` (`launch`, `MOBILE`, `DESKTOP`, `throttle`, `waitForExperience`, `collectConsole`) e
  `lib/cli.mjs` (`readArgs`, `outDir`, `print`, `median`).
- A URL é sempre o primeiro argumento; opções em `--nome=valor`.
- Imprima com `print` (o ESLint do projeto também passa por esta pasta e avisa sobre `console.log`).
- Saída de arquivos em `outDir('<nome>')`, nunca em caminho fixo da sua máquina.
