# Changelog

Todas as mudanças relevantes da landing page do HackaRun 2026 ficam registradas neste arquivo.

O formato segue o [Keep a Changelog 1.1.0](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adota o
[Versionamento Semântico](https://semver.org/lang/pt-BR/). Os commits seguem o
[Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/), então cada entrada tem rastro no histórico
do Git.

> "v1" e "v2" são gerações do design, não números de versão. Pela política do guia (`docs/GUIA_DO_PROJETO.md`,
> seção 18), a `1.0.0` fica reservada para o lançamento das inscrições.

## [Unreleased]

Ajustes pedidos pela organização depois da aprovação da v2, em duas rodadas. Na primeira, o site deixa de ter som, o
clímax da inscrição fica mais curto e calmo e as equipes ganham uma página própria, com a foto ou a logo de cada time.
Na segunda, o conteúdo passa a seguir o documento do coordenador do evento (duas frentes, a programação real e a
HackaRun Experience), a inscrição vira só de equipe, com uma planilha organizada, e o repositório fica pronto para
fork.

### Added

- Programação real em abas, uma por dia (11/11 Oficinas, 12/11 Abertura, 13/11 Mercado e 14/11 Final), no padrão de
  abas WAI-ARIA (`DayTabsController`: tabindex móvel, setas, Home/End e ativação automática; no dia do evento abre na
  aba de hoje). Cada bloco mostra horário, local, selo de público e a linha "Público" do documento, e cada atividade
  tem a miniementa num `<details>`, com o card "Em paralelo" e os marcadores "Hackathon", "Tema a definir" e
  "Opcional". Sem JavaScript, os 4 dias aparecem empilhados.
- Entidade `Activity`, value object `Audience` e a regra `TimeSlot.contains` (a atividade precisa caber no bloco).
  `Session` ganha local, público, nota e atividades; `EventDay` ganha rótulo curto e etapa; o evento ganha
  `maxStands`.
- Dois cards em "O evento": "Programação aberta" (aberto ao público) e "Hackathon" (só alunos da UniCatólica), e os
  números 04 dias, 07 oficinas, até 10 estandes e 01 final no Capim Dourado Shopping.
- Roteiro da HackaRun Experience na grande final, em 6 chips lidos da programação, com a premiação oficial (19h15) em
  destaque e o cosplay marcado como opcional.
- Painel "As regras saem na abertura." nas missões, com os 5 tópicos do regulamento (12/11, 19h35) e o lançamento do
  desafio às 19h55.
- FAQ com 15 perguntas em 4 grupos (Evento, Programação aberta, Hackathon e Inscrição).
- JSON-LD em `@graph`: o `Event` com um `subEvent` por bloco (local e público) e uma `FAQPage` gerada do `faq.json`. O
  `.ics` tem um evento por bloco, com o local e a lista de atividades.
- Página `/equipes` com as equipes confirmadas: um card por equipe com a foto ou a logo (a imagem inteira sobre uma
  cópia desfocada dela; iniciais quando não há foto ou ela não carrega), contador ao vivo, busca, grade de 2 a 4
  colunas, estado vazio com chamada para a inscrição e SEO próprio (canonical, Open Graph e JSON-LD com
  `CollectionPage` e `BreadcrumbList`).
- Boot leve para páginas sem 3D (`LightApp` + `PageLayout`): liga só o header, o menu, o "Pausar animações" e a lista
  de equipes, sem baixar GSAP, Lenis nem three.js.
- Inscrição em três etapas (01 Equipe, 02 Integrantes, 03 Confirmação), com um card por integrante: nome completo,
  matrícula e e-mail, de 2 a 5 pessoas, e o integrante 1 como contato da equipe. Adicionar ou remover um integrante
  move o foco e é anunciado; com 5 de 5 o botão vira "Equipe completa · 5/5".
- Value objects `FullName`, `StudentId`, `Email` e `TeamMember`.
- Aviso "Comunicação oficial por e-mail" no formulário e na tela de sucesso.
- Conflito apontado no campo certo: nome de equipe, e-mail ou matrícula que já estão em outra equipe
  (`duplicate_team_name`, `duplicate_email` e `duplicate_student_id`, com a posição do integrante). A mensagem some
  quando o valor muda e volta se o mesmo valor for digitado de novo.
- Campo obrigatório "Foto ou logo da equipe": JPEG, PNG ou WebP de até 10 MB, com o lado menor de pelo menos 200 px,
  prévia com "Trocar imagem" e arrastar e soltar. O navegador reduz para 800 px no lado maior e comprime em WebP (ou
  JPEG) até cerca de 300 KB, com teto de 400 KB; logo com fundo transparente ganha um fundo sólido que contrasta.
- Value object `TeamImage`, caso de uso `PrepareTeamImage`, porta `ImageCodec` e o adapter `CanvasImageCodec`
  (`createImageBitmap` + canvas, respeitando a orientação EXIF).
- Apps Script com oito arquivos: `Images.gs` (foto no Google Drive, na pasta da Propriedade `FOTOS_PASTA_ID`, com link
  público só de leitura), `Sheets.gs`, `Registry.gs`, `Setup.gs` e `Summary.gs`, além do manifesto `appsscript.json`.
- `configurarPlanilha()`: cria e formata as abas `Equipes` (uma linha por equipe, miniatura da foto com `=IMAGE()`,
  link com `=HYPERLINK()` e Status em menu com cor por status), `Integrantes` (uma linha por pessoa, com o Status da
  equipe por fórmula) e `Resumo` (contadores ao vivo, vagas restantes e os e-mails das equipes confirmadas prontos para
  colar), com títulos fixos, filtros, faixas alternadas e proteção de aviso. É idempotente e roda sozinho na primeira
  gravação ou quando a versão do layout muda.
- `?action=teams` devolve o id da foto das equipes confirmadas, e o site monta o endereço no CDN de imagens do Google
  (`lh3.googleusercontent.com`, 600 px).
- Link "Equipes" no header, no menu do celular e no rodapé, levando para `/equipes`.
- Em `npm run dev` sem endpoint, a inscrição simulada aplica as mesmas regras de duplicado do servidor, e as equipes
  aparecem já confirmadas em `/equipes` e na LP.
- `npm run setup` (`scripts/setup.mjs`, só com módulos do Node): confere o Node contra o `.nvmrc` e o `engines`, roda
  o `npm ci` se faltar, cria o `.env` a partir do `.env.example` e, com `--qa`, instala os scripts de QA; `--check` só
  confere. `requirements.txt` com as dependências dos scripts de assets em Python.
- README com o guia "Como rodar no seu PC" para quem faz fork (pré-requisitos, upstream, planilha de teste, fluxo de
  PR e problemas comuns), e ADRs 0007 (fotos no Drive) e 0008 (inscrição só de equipe e planilha em três abas).
- Testes da programação (regras do domínio, o conteúdo real contra o documento, as abas, o JSON-LD e o `.ics`), dos
  campos de integrante, dos conflitos do servidor, das abas e fórmulas da planilha, dos duplicados, do contrato entre
  o TypeScript e o Apps Script e dos escopos do manifesto, além do caminho da foto e da carga do clímax.
- Missões em trilho de deslizar no celular (`scroll-snap` nativo, sem JS): o card seguinte aparece pela metade, e o
  `MissionsRailController` (chunk à parte, pelo `LazyMount`) liga o contador 01/08 e deixa o trilho focável para as
  setas. A partir de 640 px volta a grade, e no desktop o trilho preso.
- Link para um dia da programação (`/#dia-11` a `/#dia-14`) abre a aba dele, também quando o hash muda com a página
  aberta.
- Testes dos cards de integrante vindos do HTML, do foco no resumo de erros, do `autocomplete` do contato, do HUD
  (formato do contador, `.is-form` e `.is-tucked`), do trilho das missões, das abas por hash, do `.ics` e da grafia
  "UniCatólica" nas páginas, no SEO e nos metadados.

### Changed

- O evento passa a ser apresentado como no documento do coordenador: o 1º HackaRun, de tecnologia, inovação e
  empreendedorismo, com uma programação aberta ao público (11 a 13/11, a partir das 19h, no Bloco II) e um hackathon
  só para alunos da UniCatólica, em equipes. Título e descrição da página, HUD do hero, faixa de "O evento" e textos
  das missões, dos mentores e dos prêmios foram reescritos.
- A grande final virou a **HackaRun Experience**: a partir das 17h de 14/11, no Capim Dourado Shopping (parceiro
  exclusivo da premiação), com a premiação oficial às 19h15.
- Marcos do contador: abertura (11/11, 19h), fim do desenvolvimento presencial (14/11, 13h) e grande final (14/11,
  17h).
- Grafia "UniCatólica" no conteúdo, no SEO e nos dados (a faixa continua "UNICATÓLICA").
- Pontuação das missões fora do ar até o regulamento (`scoring: null` no `stations.json`): as estações mostram
  "?? pts", e o painel de pontuação volta sozinho quando o bloco for publicado.
- A inscrição é só de equipe: o `TeamRegistration` virou `{ teamName, members[], teamImage }`, e o envio leva
  `members[{ name, studentId, email }]`, com `members[0]` como contato.
- A lista pública (`?action=teams`, cache `teams:v3`) devolve só id, nome, quantidade de integrantes e id da foto das
  equipes confirmadas, e os cards de `/equipes` mostram só nome, foto e número de integrantes (o curso saiu).
- Duplicados conferidos sem diferenciar caixa nem acento e ignorando equipes recusadas: recusar uma equipe libera o
  nome, os e-mails e as matrículas. O limite por e-mail usa o hash do e-mail de contato.
- A foto no Drive ganha um nome sorteado (`foto-<uuid>`), e a planilha liga linha e arquivo pela coluna "ID da foto":
  apagar essa célula tira a foto do ar.
- Consentimento na versão `2026-10-v3`: o aceite cobre os dados de cada integrante e a autorização para publicar a
  foto. O `Validation.gs` espelha a constante (um teste confere) e só aceita a versão vigente.
- Aviso de privacidade em 9 seções: nome da equipe, foto e, de cada integrante, nome, matrícula e e-mail (nada de
  telefone, curso ou dado sensível), finalidades, base legal, retenção e como pedir a remoção por e-mail.
- A seção de equipes da LP virou uma chamada para `/equipes`: contador ao vivo, até 5 fotos, "Ver as equipes" e
  "Inscrever minha equipe".
- Clímax da inscrição mais curto e suave: a carga dura 0,9 s (era 1,5 s; `DEFAULT_HOLD_MS`), o estouro virou um pulso
  em que o globo respira inteiro, o anel abre até cerca de 2,6 vezes o raio do globo (era 4,3) e o brilho que a carga
  soma tem teto (`MAX_CHARGE_BLOOM` 0,3 e `MAX_CHARGE_EXPOSURE` 0,08).
- A barra do CTA do clímax enche junto com a carga do globo, e o botão acende com a animação `charge-glow`.
- A linha de status do clímax ganhou uma placa escura para manter o contraste sobre o anel, e as duas partes empilham
  abaixo de 640 px.
- Header com logo, navegação, "Pausar animações" e "Participar"; no celular, logo, pausar e menu.
- Textos da rodada 2: "Final no Capim Dourado Shopping" (no lugar de "Final no telão"), "UNICATÓLICA" na faixa (no
  lugar de "Palmas–TO"), "Da sala de aula ao palco." no título de "O evento" e a chamada nova dos prêmios.
- O envio da inscrição espera até 30 s (eram 15 s), porque a foto vai na mesma requisição.
- `contain-intrinsic-size` medido de novo nas seções de programação, mentores, final, prêmios e FAQ.
- Rodapé sem o card do repositório; no desktop o link de privacidade fecha a coluna da navegação.
- `BaseLayout` montado sobre partes compartilhadas com a página de equipes (`DocumentHead` e `Backdrop`), sem mudar o
  HTML da LP.
- `.prettierignore` ignora só a pasta `design/` da raiz, então `docs/design/*.md` voltou a ser formatado.
- `apps-script/README.md` reescrito como passo a passo (planilha, os oito arquivos e o manifesto, Propriedades,
  autorização, Web App, nova versão, rotina da organização e clasp opcional).
- README sem as seções "Bastidores" e "Desafios que resolvi", com "Roteiro visual: uma cena 3D por seção" no lugar de
  "A corrida em 8 cenas" e o crédito da identidade visual atualizado. Guia, design spec, ADRs 0004 e 0007, manifesto da
  stack, asset brief e CONTRIBUTING atualizados.
- O aceite fala do regulamento como ele é: a equipe sabe que ele é apresentado na abertura (12/11, às 19h35) e se
  compromete a segui-lo (era "Li e aceito o regulamento"). A versão segue `2026-10-v3`, que ainda não foi publicada.
- Canal oficial: confirmação e avisos chegam só por e-mail; o regulamento e os resultados saem no evento (aviso de
  privacidade e aviso do formulário).
- Inscrições em breve: o lobby mostra o aviso com "Adicionar à agenda" e só uma amostra curta e apagada do formulário
  (era o formulário inteiro, cerca de 2.800 px no celular).
- Envio com mais de um erro leva o foco ao resumo, que para logo abaixo do header (antes o foco ia para o 1º campo e
  o título do resumo ficava escondido).
- HUD: o contador diz "01 de 11 · Largada" (com barra lia como data) e, no celular, a pílula sai da frente do
  formulário e recolhe rolando para baixo, como o header.
- Rodapé com o subtítulo do evento ("Tecnologia, inovação e empreendedorismo"), as logos da realização e da parceria
  lado a lado desde o celular e a legenda do Capim Dourado como parceiro exclusivo da premiação.
- Menu do celular com o ritmo vertical pela altura da tela: em 375x667 o "Quero participar" cabe sem rolar.
- Textos conferidos com o documento: o prêmio principal vai para a equipe vencedora anunciada na premiação, a mentoria
  sem "ou por vídeo", o card do hackathon com o desenvolvimento final de 14/11 (8h às 13h) e a descrição de
  `/equipes` e do `package.json`.
- `.ics`: atividade opcional ganha "(opcional)", e o bloco sem hora de fim avisa que o término está a confirmar.
- Apps Script: o passo a passo do Resumo e o README mandam apagar o arquivo no Drive (e esvaziar a lixeira) num
  pedido de remoção ou numa imagem imprópria; `SETUP_VERSION` 4 refaz o Resumo; a lista pública lê o segredo dos ids
  uma vez por chamada (era uma leitura das Propriedades por equipe).
- Números de performance e de testes do README e do guia medidos de novo (Lighthouse 98, LCP 2,2 s, JS inicial
  68,4 KB).
- `scripts/qa/overflow.mjs` trata o que rola na horizontal (o trilho das missões) como quem corta.

### Removed

- A modalidade individual e os campos WhatsApp, curso, período e acessibilidade (dado sensível), do formulário à
  planilha, com o `ContactFields` (`PersonName` e `Phone`) e o `ModeSwitch`. A aba antiga `Inscricoes` deixa de ser
  usada.
- Os números e promessas que dependem do regulamento: "100 pts por estação", a divisão 60/20/10/10, a entrega até as
  15h, as "rotas rotativas" e "pontos no ranking / rota liberada". Os valores antigos ficam no histórico do Git.
- Os 4 pilares de "O evento" (`PillarCard`) e a linha do tempo antiga da programação (`DayRound` e `SessionItem`).
- Todo o áudio: o botão de som do header, o `AudioEngine`, o cue do globo (arquivo e versão sintetizada), o som de
  digitação, as portas `AudioCue` e `TickSound`, os eventos `sound:changed` e `ui:type`, a pasta `public/audio/` e o
  `scripts/audio/render_cues.py` (que pedia `numpy` e `lameenc`).
- O flash branco do passe cinematográfico e o tremor de câmera do clímax.
- O botão "Adicionar à agenda" da programação. O `.ics` continua no aviso de inscrições em breve, no lobby e na tela de
  sucesso.
- O aviso "Corra contra o relógio, não pelos corredores" da seção de NPCs: a regra vai ser passada no dia.
- O link do repositório no rodapé.
- A lista e a busca de equipes dentro da LP (`TeamRoster`), que foram para `/equipes`.
- O `TimelineAnimator`, que ficou sem alvo com a programação nova.

### Fixed

- A etapa Integrantes vinha vazia na prévia "em breve": os cards do mínimo da equipe já saem no HTML, e a View adota
  esses cards (e o que foi digitado neles) em vez de clonar outros.
- O integrante 1 (contato) tem `autocomplete="name"` e `"email"` de novo (WCAG 1.3.5).
- "Confirmar inscrição" e "Adicionar à agenda" quebravam em duas linhas em 360 e 390 px; a 404 vazava pela direita no
  celular; "Trocar imagem" aparecia como "TROCARIMAGEM"; sobrava um espaço antes do ponto no aviso de sucesso; o 1 e
  o 7 do "17H" da final se encostavam; "03 Programação" encostava no "04 Final" no rodapé em 360 px.
- Costuras entre as seções no desktop: o véu lateral, a base do hero e os refletores da final esmaecem na borda.
- Painel do dia da programação é uma `<section>` (`role="tabpanel"` não vale num `<article>`).
- O logo do header é o LCP fora da home e carrega sem lazy, com `fetchpriority` alta.
- "UniCatólica" também no rodapé, no menu, no SEO de `/equipes`, no `package.json` e nos metadados dos PDFs.

### Security

- Menos dado pessoal: a inscrição não pede telefone, curso nem dado sensível, e a lista pública não tem curso, nome de
  pessoa nem e-mail.
- Escopos mínimos no `appsscript.json`: só a planilha do próprio script (`spreadsheets.currentonly`) e o Drive, com um
  teste que confere os escopos contra os serviços que o código chama.
- As únicas fórmulas da planilha são as do script (`IMAGE`, `HYPERLINK`, a busca do Status e o `Resumo`); texto
  digitado que começa com `= + - @` continua virando texto puro.
- CSP: `img-src` libera só `https://lh3.googleusercontent.com` além da própria origem e de `data:`. Saíram o
  `media-src` e o cache de `/audio/*`, sem mudar a política na prática (`default-src 'self'` cobre).
- O servidor confere a foto pelos primeiros bytes (JPEG, PNG ou WebP), exige que o tipo declarado bata e recusa acima
  de 400 KB; o arquivo nunca leva um nome digitado no formulário nem o protocolo.
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
- JSON embutido na página escapado (`<` vira `\u003c`): texto do conteúdo nunca fecha o `<script>` antes da hora.
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
