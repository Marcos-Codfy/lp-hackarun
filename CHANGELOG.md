# Changelog

Todas as mudanças relevantes da landing page do HackaRun 2026 ficam registradas neste arquivo.

O formato segue o [Keep a Changelog 1.1.0](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adota o
[Versionamento Semântico](https://semver.org/lang/pt-BR/). Os commits seguem o
[Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/), então cada entrada tem rastro no histórico
do Git.

> "v1" e "v2" são gerações do design, não números de versão. Pela política do guia (`docs/GUIA_DO_PROJETO.md`,
> seção 18), a `1.0.0` fica reservada para o lançamento das inscrições.

## [Unreleased]

Ajustes pedidos pela organização depois da aprovação da v2: o site deixa de ter som, o clímax da inscrição fica mais
curto e calmo, e as equipes ganham uma página própria com a foto ou a logo de cada time.

### Added

- Página `/equipes` com as equipes confirmadas: um card por equipe com a foto ou a logo (a imagem inteira sobre uma
  cópia desfocada dela; iniciais quando não há foto ou ela não carrega), contador ao vivo, busca, grade de 2 a 4
  colunas, estado vazio com chamada para a inscrição e SEO próprio (canonical, Open Graph e JSON-LD com
  `CollectionPage` e `BreadcrumbList`).
- Boot leve para páginas sem 3D (`LightApp` + `PageLayout`): liga só o header, o menu, o "Pausar animações" e a lista
  de equipes, sem baixar GSAP, Lenis nem three.js.
- Campo obrigatório "Foto ou logo da equipe" na inscrição de equipe: JPEG, PNG ou WebP de até 10 MB, com o lado menor
  de pelo menos 200 px, prévia com "Trocar imagem" e arrastar e soltar. O navegador reduz para 800 px no lado maior e
  comprime em WebP (ou JPEG) até cerca de 300 KB, com teto de 400 KB; logo com fundo transparente ganha um fundo
  sólido que contrasta.
- Value object `TeamImage`, caso de uso `PrepareTeamImage`, porta `ImageCodec` e o adapter `CanvasImageCodec`
  (`createImageBitmap` + canvas, respeitando a orientação EXIF).
- `apps-script/Images.gs`: grava a foto no Google Drive com o protocolo como nome, na pasta da Propriedade
  `FOTOS_PASTA_ID` (criada uma vez se faltar), com link público só de leitura; função `prepararFotos()` para autorizar
  o Drive e coluna **Imagem** na planilha.
- `?action=teams` devolve o id da foto das equipes confirmadas, e o site monta o endereço no CDN de imagens do Google
  (`lh3.googleusercontent.com`, 600 px).
- Link "Equipes" no header, no menu do celular e no rodapé, levando para `/equipes`.
- Em `npm run dev` sem endpoint, as equipes da inscrição simulada aparecem já confirmadas em `/equipes` e na LP.
- Testes do caminho da foto (domínio, caso de uso, campo, galeria e o `Images.gs` real com dublês do Drive) e da carga
  do clímax (`SceneHoldWatcher`, `ChargeController`, `ChargeRevealView` e `PostDirector`).
- ADR 0007: fotos das equipes no Drive, servidas pelo CDN do Google e publicadas só depois da confirmação.

### Changed

- A seção de equipes da LP virou uma chamada para `/equipes`: contador ao vivo, até 5 fotos, "Ver as equipes" e
  "Inscrever minha equipe".
- Clímax da inscrição mais curto e suave: a carga dura 0,9 s (era 1,5 s; `DEFAULT_HOLD_MS`), o estouro virou um pulso
  em que o globo respira inteiro, o anel abre até cerca de 2,6 vezes o raio do globo (era 4,3) e o brilho que a carga
  soma tem teto (`MAX_CHARGE_BLOOM` 0,3 e `MAX_CHARGE_EXPOSURE` 0,08).
- A barra do CTA do clímax enche junto com a carga do globo (antes já estava cheia quando a pessoa chegava), e o botão
  acende com a animação `charge-glow`.
- A linha de status do clímax ganhou uma placa escura para manter o contraste sobre o anel, e as duas partes empilham
  abaixo de 640 px.
- Header com logo, navegação, "Pausar animações" e "Participar"; no celular, logo, pausar e menu.
- Textos: "Final no telão" virou "Final no Capim Dourado Shopping" (faixa, números de "O evento" e título da grande
  final, agora num tamanho que não parte o nome do shopping), "Palmas–TO" virou "UNICATÓLICA" na faixa, o título de
  "O evento" virou "Da sala de aula ao palco." e a chamada dos prêmios foi reescrita.
- Consentimento na versão `2026-10-v2`: na inscrição de equipe inclui a autorização para publicar a foto e a declaração
  de que todos que aparecem nela concordaram. O `Validation.gs` espelha a constante (um teste confere) e só aceita a
  versão vigente.
- Aviso de privacidade com a seção "Foto ou logo da equipe" (finalidade, base legal, link público do Drive, retenção e
  pedido de retirada) e sem a preferência de som.
- O envio da inscrição espera até 30 s (eram 15 s), porque a foto vai na mesma requisição.
- Rodapé sem o card do repositório; no desktop o link de privacidade fecha a coluna da navegação.
- `BaseLayout` montado sobre partes compartilhadas com a página de equipes (`DocumentHead` e `Backdrop`), sem mudar o
  HTML da LP.
- README, guia, design spec e ADRs atualizados.

### Removed

- Todo o áudio: o botão de som do header, o `AudioEngine`, o cue do globo (arquivo e versão sintetizada), o som de
  digitação, as portas `AudioCue` e `TickSound`, os eventos `sound:changed` e `ui:type`, a pasta `public/audio/` e o
  `scripts/audio/render_cues.py` (que pedia `numpy` e `lameenc`).
- O flash branco do passe cinematográfico e o tremor de câmera do clímax.
- O botão "Adicionar à agenda" da programação. O `.ics` continua no aviso de inscrições em breve, no lobby e na tela de
  sucesso.
- O aviso "Corra contra o relógio, não pelos corredores" da seção de NPCs: a regra vai ser passada no dia.
- O link do repositório no rodapé.
- A lista e a busca de equipes dentro da LP (`TeamRoster`), que foram para `/equipes`.

### Security

- CSP: `img-src` libera só `https://lh3.googleusercontent.com` além da própria origem e de `data:`. Saíram o
  `media-src` e o cache de `/audio/*`, sem mudar a política na prática (`default-src 'self'` cobre).
- O servidor confere a foto pelos primeiros bytes (JPEG, PNG ou WebP), exige que o tipo declarado bata e recusa acima
  de 400 KB; o arquivo nunca leva um nome digitado no formulário.
- O id da foto só sai na lista pública para equipe confirmada e só com o formato de id do Drive, e a entidade `Team`
  só aceita URL `https` ou `data:image` no `src`.
- O reenvio da inscrição não cria uma segunda foto: o upload acontece depois das checagens de duplicado e de
  idempotência, e se a planilha falhar depois dele o arquivo vai para a lixeira.

## [0.3.0] - 2026-10-11

V2 cinematográfica (codinome **Overdrive**), aprovada e publicada no GitHub. Redesign completo com a identidade oficial, inscrição e
privacidade reforçadas, acessibilidade e um trabalho de performance que levou o Lighthouse mobile de 66 para 95.

### Added

- Identidade oficial do evento (ADR 0006): logo com raios procedurais em canvas 2D, Orbitron e Montserrat, paleta
  neon sobre preto com aurora animada, botões inclinados com brilho, header de vidro flutuante e menu de tela cheia
  no celular.
- Orbitron com o til redesenhado em degraus (`scripts/fonts/patch_orbitron_tilde.py`): o original parecia acento
  grave em título grande ("NÀO").
- Faixa de parceiros "Quem faz acontecer" e rodapé novos.
- Pós-processamento no 3D (bloom, grão, vinheta e aberração cromática), camadas de estrelas e bokeh, câmera
  coreografada e color grading por cena.
- Oito objetos de cena, cada um com animação e brilho próprios no shader: globo de fitas, cronômetro-giroscópio, "?"
  extrudado, mapa de missões em holograma, terreno synthwave, palco de show, troféu e galáxia.
- Clímax da inscrição: o globo carrega e estoura em flash e anel de choque antes de revelar o CTA.
- Som de digitação na interface (terminal dos NPCs e protocolo da inscrição).
- Aviso de privacidade (LGPD) em `/privacidade`, linkado no consentimento e no rodapé.
- Consentimento versionado (`CONSENT_VERSION`): versão do aviso e data do aceite gravadas na planilha.
- Apps Script com prazo e capacidade conferidos a cada envio (`CLOSES_AT`, `CAPACITY`, `INSCRICOES_FECHADAS`) e rota
  `?action=health`.
- Envio idempotente: uma chave por sessão do formulário, e o reenvio recebe o mesmo protocolo.
- O formulário reavalia prazo e vagas ao montar e troca o aviso de inscrições encerradas no lugar.
- Botão "Pausar animações" (WCAG 2.2.2) no header e no menu do celular: congela o 3D, os raios do logo e os loops em
  CSS, com a preferência salva no navegador.
- Testes do Apps Script rodando o código real no Node (sandbox `vm` com dublês dos serviços do Google).
- Scripts de QA em `scripts/qa/` (capturas, âncoras, overflow, Web Vitals, tarefas longas, trace e Lighthouse), no
  Brave ou Chrome instalado e com GPU real.
- ADR 0006, design spec v2 e PDFs da documentação com as fontes e os logos da marca.
- README de apresentação em português (`README.md`) e inglês (`README.en.md`), e este `CHANGELOG.md`.

### Changed

- Cenas renomeadas pelos objetos novos (`core`, `orbit`, `enigma`, `map`, `terrain`, `stage`, `trophy`, `dust`), com
  um arquivo GLSL por objeto.
- Seções redesenhadas no visual v2, com CSS mobile first (`min-width`) e só tokens de design (`--c-*`, `--ink-*`,
  `--control-*`).
- Terminal dos NPCs dividido em `TerminalBar` e `TerminalScreen`.
- `PreferenceStore`, `AudioCue` e `TickSound` viraram portas da aplicação; o ESLint bloqueia `presentation`
  importando `infrastructure` e `shared` importando qualquer camada.
- Tamanho de arquivo no ESLint: aviso acima de 200 e erro acima de 250 linhas de código, inclusive nos `.astro`.
- `TeamName` passou a devolver `Result`, e a config do cliente sai de um builder compartilhado.
- Limite global do Apps Script de 40 para 120 envios por minuto, somado a um limite por e-mail (10 tentativas a cada
  10 min).
- Erro de servidor na inscrição passou a ser retentado, e o navegador espera os 3 s mínimos de preenchimento em vez
  de ter o envio recusado.
- README, guia, design spec e ADRs reescritos para a v2.

### Removed

- Pacotes de fonte da v1 sem uso (`@fontsource-variable/big-shoulders` e `@fontsource-variable/inter`).
- `AnchorNavController`, duplicado do `AnchorNavigator` (`motion/core`).

### Fixed

- Um callback com erro não derruba mais o `Ticker`, o `EventBus` nem o `Observable`.
- Se o GSAP ou o Lenis falharem ao montar, a página segue no scroll nativo; um frame 3D com erro cai no brilho em CSS.
- Texto do formulário com contraste total durante a carga do globo.
- Foco e checkbox de consentimento visíveis em cores forçadas (alto contraste do Windows).
- Scroll horizontal na área de inscrição no celular.

### Performance

- Lighthouse mobile (mediana de 3 execuções, build de produção): Performance de 66 para **95**, TBT de 1.600 ms para
  18 ms e LCP de 2,9 s para 2,6 s; Acessibilidade, Boas práticas e SEO em 100.
- O hero (LCP) pinta antes de qualquer JavaScript pesado; o chunk do three.js espera o `load` e o navegador ocioso.
- `BootQueue`: o boot roda em passos curtos que cedem a thread (`scheduler.yield`), e o setup de cada seção só
  acontece quando ela se aproxima da tela; o SplitText do GSAP deu lugar a um `LineSplit` próprio.
- Formas 3D geradas num Web Worker (com fallback fatiado na thread principal); consultas à GPU, compilação dos
  programas e primeiro frame divididos em tarefas curtas, com compilação paralela na troca de qualidade.
- Feixes do palco sem indexação dinâmica no vertex shader (compilação lenta no ANGLE em GPU integrada).
- `content-visibility: auto` nas seções longe do topo, com `contain-intrinsic-size` medido em 390 e 1440 px; o scroll
  por âncora confere o destino ao chegar e corrige uma vez se uma seção mudou de altura no caminho.

### Security

- CSP estrita em `public/_headers` (`script-src 'self'`, sem script inline, `frame-ancestors 'none'`).
- JSON embutido na página escapado (`<` vira `<`): texto do conteúdo nunca fecha o `<script>` antes da hora.
- Sem JavaScript, o formulário envia por POST: dados pessoais nunca vão na URL.
- O limite por e-mail guarda só o hash do e-mail no `CacheService`, nunca o texto.
- Valor inválido de prazo ou capacidade nas Propriedades do script fecha as inscrições em vez de deixá-las abertas.

## [0.2.0] - 2026-10-10

Primeira versão completa do site (v1 do design).

### Added

- Experiência 3D: um único campo de partículas WebGL faz morph entre formas procedurais conforme o scroll, com
  transição escalonada por partícula, ordem espacial coerente entre as formas e velocidade do scroll suavizada.
- Qualidade adaptativa do 3D por dispositivo e por FPS.
- Views e view-models MVVM: contador, som, HUD, caça aos NPCs, equipes e formulário de inscrição.
- Inscrição em Google Sheets via Apps Script, com retentativa, honeypot, consentimento LGPD e proteção contra fórmula
  injetada na planilha.
- Lista de equipes confirmadas ao vivo, lida da planilha, com reserva estática.
- Seções da landing (hero, o evento, NPCs, missões, programação, mentores, grande final, prêmios, equipes, FAQ e
  inscrição), componentes de layout e animadores GSAP.
- Testes unitários de domínio, casos de uso, gateways e view-models (Vitest).
- README, guia de handoff, ADRs 0001 a 0005, asset brief e gerador dos PDFs de documentação.
- CI no GitHub Actions (lint, formatação, testes e build), templates de issue e de pull request e `CONTRIBUTING.md`.
- Logos oficiais do HackaRun e dos parceiros, imagem de compartilhamento (1200×630) e sons sintetizados
  (`scripts/audio/render_cues.py`).

## [0.1.0] - 2026-10-10

Fundação do projeto.

### Added

- Projeto Astro 7 com TypeScript no modo mais estrito, ESLint com regras de dependência entre camadas, Prettier,
  Vitest, Husky, lint-staged e commitlint.
- Núcleo em Clean Architecture + DDD: entidades, value objects, aggregate do evento, política de inscrição e portas
  de repositório no domínio; casos de uso, DTOs e portas na aplicação.
- Infraestrutura com repositórios de JSON estático, mappers do conteúdo para o domínio, exportador `.ics` e relógios.
- Conteúdo oficial do HackaRun 2026 (programação de 11 a 14 de novembro) em `src/infrastructure/content/`.
- Design spec, tokens de cor e tipografia, `BaseLayout` com fontes self-hosted (subset latin) e SEO com schema.org
  `Event`.
- Bootstrap do cliente (`App`), contratos de eventos e o esqueleto das seções com a sequência de cenas do scroll.
- Agenda `/hackarun-2026.ics` gerada no build.

[Unreleased]: https://github.com/Marcos-Codfy/lp-hackarun/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/Marcos-Codfy/lp-hackarun/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Marcos-Codfy/lp-hackarun/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Marcos-Codfy/lp-hackarun/releases/tag/v0.1.0
