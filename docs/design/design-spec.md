# HackaRun 2026 · Especificação de design e experiência

> **Versão 2 (vigente).** Fonte de verdade visual e de interação da landing page. Antes de mexer em seção, componente
> ou 3D, leia isto. A v1 ("correta" demais: Big Shoulders, Inter, ciano #00CFFF, HUD no topo) está **obsoleta**; o que
> mudou está resumido no fim, na seção 14. A decisão está registrada na ADR 0006.

## 1. Conceito: "a página é a corrida"

O visitante não lê uma página, ele **percorre uma corrida**. Um único campo de partículas fica fixo atrás do conteúdo
durante toda a página e **vira um objeto diferente a cada seção**, contando a história do evento. O HUD mostra o
checkpoint atual e o progresso (efeito Zeigarnik: quem começa uma corrida quer chegar ao fim).

A linguagem é a de campeonatos de e-sports (Worlds/LoL, VCT/Valorant, Majors de CS) com acabamento de cinema: vazio
quase preto, neon saturado, brilho real e câmera que se move com intenção. **Mas limpo**: muito respiro, uma ideia por
tela e contraste alto.

## 2. Direção de arte

- **Referência do globo:** `design/references/particle-globe-blue.jpg`. Fitas finas de partículas formando lâminas que
  ondulam, azul ultra-saturado (#1F35FF → #1264FF), cristas ciano (#00E5FF) e picos quase brancos. Miolo escuro.
- **Fundo:** vazio `#02030B` com **aurora** (manchas em azul elétrico, violeta e um toque de ciano/magenta) que muda de
  cor por cena, vinheta nas bordas e granulação de filme a 7%.
- **Luz:** o neon só brilha porque o resto é escuro. Bloom de verdade nas partículas; no conteúdo, brilho só no que
  importa (CTA, números, nós da rota, logo).
- **Profundidade:** campo de estrelas ao fundo, bokeh desfocado na frente, partículas no meio.

## 3. Roteiro de cenas

| #   | Seção (id)     | `data-scene`                      | Objeto                                                     | Cor dominante                    | Intenção                     |
| --- | -------------- | --------------------------------- | ---------------------------------------------------------- | -------------------------------- | ---------------------------- |
| 0   | `#inicio`      | `core`                            | Globo de energia em fitas, borda acesa                     | azul elétrico, cristas ciano     | Impacto inicial, curiosidade |
| 1   | `#sobre`       | `orbit`                           | Cronômetro-giroscópio (mostrador, ponteiro, anéis em cardã) | ciano/azul, acento violeta       | Tempo: é uma corrida         |
| 2   | `#npcs`        | `enigma`                          | "?" extrudado com faixa tracejada e auréola de HUD         | violeta + magenta, aro ciano     | Mistério: onde estão os NPCs |
| 3   | `#missoes`     | `map`                             | Mapa em holograma: rota em espiral com 8 faróis            | ciano/azul, topo laranja         | A corrida em si; progresso   |
| 4   | `#programacao` | `terrain`                         | Terreno synthwave: grade, montanhas e sol em faixas        | azul, sol magenta → laranja      | Os 4 dias como "rounds"      |
| 5   | `#mentores`    | `terrain`                         | (mantém o terreno; pausa visual)                           | idem                             | Autoridade                   |
| 6   | `#final`       | `stage`                           | Palco: telão de LED, treliça, canhões de luz, plateia      | ciano/branco, feixes violeta     | A final no Capim Dourado     |
| 7   | `#premios`     | `trophy`                          | Troféu de torno em linhas, alças e estrela                 | laranja/ouro                     | Desejo                       |
| 8   | `#equipes`     | `dust`                            | Galáxia distante e calma                                   | azul-violeta suave               | Prova social (fundo calmo)   |
| 9   | `#faq`         | `dust`                            | Galáxia                                                    | idem                             | Tirar objeções               |
| 10  | `#inscricao`   | `core` + `data-scene-hold="1500"` | O globo se reconstrói, carrega 1,5 s e estoura             | azul → magenta → branco no flash | Pico emocional → CTA         |

Regras:

- O morph é **contínuo e reversível** (scroll pra cima desfaz). O índice `scenes.progress` (ex.: 3,4) mistura a cena 3
  e a 4. A troca é uma onda que varre a tela; no meio do voo as partículas escorrem em filamentos.
- A velocidade do scroll faz o conjunto "respirar" pra fora e dá um leve kick no FOV.
- No desktop, o ponteiro desloca a câmera (parallax) e repele partículas, forte no globo e quase nada nas outras formas.
- Em paisagem a forma fica ao lado do texto; em retrato fica menor e mais apagada, atrás do título e do parágrafo
  (a única área sem cards de vidro por cima).
- **Nunca travamos o scroll do usuário.** O clímax da inscrição conta tempo, não scroll (seção 9).

## 4. Paleta oficial

Do manual HackaRun 2026, em `src/presentation/styles/tokens.css`. O azul domina; violeta/magenta = mistério e
gamificação (NPCs); laranja/ouro = tempo, prazos e prêmios.

| Cor               | Hex       | Token           | Uso                                                       |
| ----------------- | --------- | --------------- | --------------------------------------------------------- |
| Vazio             | `#02030B` | `--c-void`      | Fundo da página (`--bg`)                                  |
| Azul Noturno      | `#060B24` | `--c-night`     | Superfícies elevadas                                      |
| Índigo            | `#0B1242` | `--c-indigo`    | Brilho de fundo                                           |
| Azul Elétrico     | `#1264FF` | `--c-electric`  | Energia principal, miolo dos botões, segunda cor do degradê |
| Ciano Neon        | `#00E5FF` | `--c-cyan`      | Acento (`--accent`), contornos, HUD, cristas              |
| Roxo Neon         | `#941BFF` | `--c-violet`    | Mistério (`--mystic`), NPCs                               |
| Magenta           | `#ED28E8` | `--c-magenta`   | Ponta do degradê de energia, mistério                     |
| Laranja Conquista | `#FF852F` | `--c-orange`    | Tempo e prazos (`--time`): contador, "15h"                |
| Ouro              | `#FFC24A` | `--c-gold`      | Prêmios (`--prize`) e **foco do teclado** (`--focus`)     |
| Branco Gelo       | `#F5F8FF` | `--c-ice`       | Texto (`--text`); secundário a 76% e 60%                  |

Degradês: **energia** `#00E5FF → #1264FF → #941BFF → #ED28E8` (95°), azul, mistério, prêmio e tempo. Fio de 1px das
bordas de vidro: `--grad-hairline`. Brilhos prontos: `--glow-cyan`, `--glow-violet`, `--glow-orange`. Use só os tokens
(papéis semânticos como `--accent`, `--time`, `--prize` nos componentes). Todos os pares de texto atendem WCAG AA.

## 5. Tipografia

- **Display: Orbitron** (variável, 400–900; títulos 700–900, caixa alta), também em botões e números. É larga: a
  escala usa tamanhos menores que uma condensada (`--fs-hero` até 7rem). O arquivo do site
  (`src/assets/fonts/orbitron-pt-latin-wght.woff2`) tem o **til redesenhado** em degraus (Ã Õ ã õ Ñ ñ): o til
  original parece acento grave em título grande ("NÀO"). Gerado por `scripts/fonts/patch_orbitron_tilde.py`.
- **Texto: Montserrat** (variável). Corpo de texto, formulários, legendas.
- **HUD: JetBrains Mono** (variável), `--fs-hud` (11px), caixa alta, tracking 0.22em, ciano. Rótulos
  `// 03 · MISSÕES`, coordenadas e códigos.
- Escala fluida com `clamp()` (mobile first). Só o subset latin, self-hosted; Orbitron e Montserrat com preload.

## 6. Logo, slogan e parceiros

- **Logo:** sempre a imagem oficial (`src/assets/brand/hackarun-logo.png`), nunca redesenhada. No hero ela é o H1.
  **Raios** procedurais ao redor (ramificados, orgânicos, deslocamento de ponto médio; nada de linha fixa tipo
  eletrocardiograma), com clarão no logo a cada descarga grande. Versão leve em telas de toque.
- **Slogan oficial:** "Desvende. Programe. Conquiste." Cada verbo na cor do seu papel: desvendar = violeta (mistério),
  programar = azul (energia), conquistar = ouro (prêmio). Linha de apoio: "Encontre os NPCs, decifre as pistas e
  codifique contra o relógio."
- **Parceiros:** logos oficiais brancas da Unicatólica (Realização) e do Capim Dourado (Parceria), discretas no rodapé
  do hero e grandes na faixa "Quem faz acontecer" antes do rodapé.

## 7. Linguagem visual

- **Botões:** paralelogramo (skew -12° só na casca, texto reto), degradê de energia com miolo azul/violeta (texto
  branco passa AA), brilho externo real, reflexo diagonal que atravessa de tempos em tempos e no hover, chevrons `>>`
  (grafismo do manual). Variantes: **ghost** (vidro escuro com fio degradê de 1px), **tempo** (laranja → ouro, texto
  escuro) e **mistério** (violeta → magenta). O anel de foco acompanha o paralelogramo.
- **Cards:** vidro escuro com borda degradê de 1px, cantoneiras HUD, hover com brilho e leve elevação. Listas grandes
  e coisas que se movem ficam sem `backdrop-filter` (blur sobre o canvas custa GPU).
- **Cortes angulares** (`--clip-card`, `--clip-btn`) em vez de cantos muito arredondados.
- **Detalhes de HUD:** cantoneiras finas, réguas, coordenadas de Palmas (`10°11'S 48°20'W`), códigos de seção,
  números vazados gigantes.
- **Ícones:** SVG inline, traço de 1.5px.

## 8. Header e HUD

- **Header:** barra de vidro flutuante (12px do topo), transparente no topo e com vidro + fio degradê depois de rolar;
  recolhe ao rolar pra baixo e volta em qualquer rolagem pra cima ou foco. Logo oficial, links com sublinhado degradê
  animado, botão de som (ícone de equalizador: barras paradas e riscadas quando desligado, dançando quando ligado),
  botão **Pausar animações** (mesma placa do som, com tooltip da ação do próximo clique) e CTA. Desktop: grade de 3
  colunas com a navegação no centro exato.
- **Menu mobile:** overlay de tela cheia com links grandes numerados ("checkpoints"), entrada em cascata, foco preso,
  `Esc` fecha e o resto da página fica `inert`. No rodapé do menu, o "Pausar animações" vira uma chave com texto.
- **HUD desktop:** trilho vertical fino na **borda direita**, com um tique por checkpoint (passados acesos, atual
  destacado), barra de progresso e contador de NPCs achados.
- **HUD mobile:** **pílula pequena no rodapé**, com checkpoint e progresso; some enquanto o hero está na tela.
- O acento do HUD acompanha a cena (ciano por padrão, violeta no enigma, ouro no troféu). Sem JS não há HUD (ele
  mentiria o checkpoint). O checkpoint é anunciado por `aria-live` discreto.

## 9. 3D cinematográfico

- **Pós-processamento:** bloom real (em meia resolução no tier médio), exposição com ombro suave, aberração cromática
  sutil, vinheta, grão, zoom blur nas travessias, flash e onda de choque no clímax. Cada cena tem seu "look" (força e
  raio do bloom, tinta do halo, exposição, quantidade de estrelas e bokeh).
- **Color grading por cena:** cada objeto tem fundo, corpo, crista e acento da paleta (tabela da seção 3).
- **Câmera coreografada:** enquadramento próprio por cena (hero quase parado; giroscópio visto um pouco de cima; mapa
  em travelling; terreno de grua alta; palco com push-in; troféu em órbita; galáxia por dentro da nuvem). Nas
  travessias a câmera mergulha pela casca do globo rumo ao giroscópio e, no fim, puxa pra trás até o globo final se
  revelar inteiro. "Câmera na mão" sempre: deriva lenta, nunca tremida aleatória.
- **Clímax da inscrição:** o globo carrega por 1,5 s (energia em curva, fitas puxando pro magenta, ronco crescente da
  câmera), estoura com flash branco contido (o texto do CTA não pode sumir), pulso, anel de choque e tranco curto, e
  assenta num brilho calmo. O som toca no mesmo evento do flash. Se o usuário sai, a carga descarrega.
- **Sem WebGL, `save-data` ou falha:** brilho estático em CSS no lugar do canvas; o resto da página é idêntico.

## 10. Movimento

- Smooth scroll com **Lenis**; animações com **GSAP + ScrollTrigger**; títulos com **SplitText** (máscara de baixo pra
  cima).
- Entradas: `y: 40 → 0`, `opacity 0 → 1`, `stagger 0.06`, `ease: expo.out`, `duration 0.9–1.2`.
- Missões no desktop (≥ 1024px, sem reduced motion): **trilho horizontal com pin**; no mobile, lista vertical.
- Números (vagas, pontos, dias) contam de 0 até o valor ao entrar na tela. Terminal do NPC e protocolo da inscrição
  "digitam" caractere a caractere.
- `prefers-reduced-motion`: sem Lenis, sem pin, sem morph contínuo (a cena troca inteira, render sob demanda),
  entradas viram fade simples, durações dos tokens zeradas.
- **Pausar animações** (WCAG 2.2.2): congela onde estão o 3D, os raios do logo e os loops infinitos em CSS (lista em
  `styles/motion-pause.css`); as entradas continuam acontecendo para o conteúdo nunca sumir. A escolha fica salva no
  navegador; com reduced motion o botão já aparece travado em "pausado".

## 11. Gatilhos de retenção e conversão (sempre discretos)

- **Curiosidade:** NPCs misteriosos, mentores e prêmios "a revelar" (cards bloqueados com `???`).
- **Urgência:** contador laranja para o próximo marco (largada → entrega 15h → premiação 18h).
- **Escassez:** "vagas limitadas à capacidade dos laboratórios" e contador de vagas quando a organização definir a
  capacidade.
- **Prova social:** equipes confirmadas aparecem na lista em tempo real (planilha).
- **Autoridade:** Unicatólica + Capim Dourado com logos oficiais, mentores egressos, banca.
- **Gamificação:** 3 tokens NPC escondidos na página; achar os 3 revela uma mensagem secreta no HUD.
- **Microcompromisso:** "Adicionar à agenda" (.ics) antes da inscrição.
- **Pico-fim:** o clímax com globo, flash e som é o momento mais forte da página, logo antes do formulário.

## 12. Acessibilidade (WCAG 2.2 AA)

HTML semântico com landmarks e hierarquia de títulos, skip link, foco visível em ouro, alvos de toque ≥ 44px, canvas
e aurora `aria-hidden`, contador com texto estático para leitor de tela (os dígitos que mudam são `aria-hidden`),
formulário com `label`, `aria-describedby`, `aria-invalid` e erros anunciados (`aria-live`), FAQ com `<details>`,
tokens NPC como botões de verdade, som desligado por padrão e com controle visível, botão para pausar tudo que se
mexe sozinho (2.2.2), `prefers-reduced-motion` respeitado, foco programático das seções com contorno transparente
(continua visível em cores forçadas), conteúdo completo sem JS e sem WebGL. Lighthouse mobile: acessibilidade 100
(10/10/2026).

## 13. Áudio e copy

- **Som desligado por padrão** (autoplay e WCAG 1.4.2). O botão de som do header liga o áudio e destrava o
  `AudioContext`; os arquivos só são baixados a partir daí.
- **Cue do clímax** (`public/audio/cta-globe.mp3`): zap elétrico + estalo do flash + grave com queda de pitch e
  harmônicos (o "low" aparece até em caixinha de celular). Sem o arquivo, toca uma versão sintetizada.
- **Digitação** (`public/audio/ui-typing.wav`): cliques curtos com tom variando, a cada caractere "digitado".
- Os sons são sintetizados em `scripts/audio/render_cues.py`. Para trocar, substitua os arquivos (cue < 60 KB).
- **Tom de voz:** direto, jovem, "dev pra dev", sem jargão corporativo, verbos de ação. Nada de prometer o que não está
  no regulamento: prêmios e vagas ficam "a revelar" até a organização confirmar.

## 14. Histórico: o que a v2 substituiu (obsoleto)

| Tema           | v1 (obsoleto, não use)                                       | v2 (vigente)                                                       |
| -------------- | ------------------------------------------------------------ | ------------------------------------------------------------------ |
| Fundo          | `#07152C` / `#040B18`, scanlines                             | Vazio `#02030B` + aurora por cena + grão                           |
| Acentos        | Ciano `#00CFFF`, azul `#1E7BFF`, âmbar `#FFB547`             | Paleta oficial do manual (seção 4)                                 |
| Foco           | Âmbar                                                        | Ouro `#FFC24A`                                                     |
| Tipografia     | Big Shoulders (display) + Inter (texto)                      | Orbitron com til corrigido + Montserrat; JetBrains Mono segue no HUD |
| HUD            | Barra no topo ("03/11 · MISSÕES")                            | Trilho na borda direita (desktop) e pílula no rodapé (mobile)      |
| Cenas          | `nebula`, `route`, `arena`, `screen`                          | `orbit`, `map`, `terrain`, `stage`                                 |
| Brilho         | Halo "fake" no sprite (blending aditivo)                     | Bloom real + passe de lente; halo fake só no tier baixo            |
| Logo           | Recortes provisórios do vídeo de referência                  | PNG oficial com raios procedurais                                  |
| Parceiros      | Sem logos oficiais (pendência)                               | Logos oficiais brancas no hero e na faixa antes do rodapé          |
