# HackaRun 2026 · Especificação de design e experiência

> **Versão 2 (vigente).** Fonte de verdade visual e de interação da landing page. Antes de mexer em seção, componente
> ou 3D, leia isto. A v1 ("correta" demais: Big Shoulders, Inter, ciano #00CFFF, HUD no topo) está **obsoleta**; o que
> mudou está resumido no fim, na seção 17. A decisão está registrada na ADR 0006.
>
> **Ajustes de 12/10/2026**, pedidos pela organização em cima da v2 aprovada, sem mudar a linguagem visual:
>
> - **Rodada 2:** o site não tem mais som, o clímax da inscrição ficou mais curto e calmo (seção 9) e as equipes
>   ganharam a página `/equipes` (seção 14).
> - **Rodada 3:** o conteúdo segue o documento do coordenador do evento. "O evento" mostra as duas frentes (programação
>   aberta e hackathon), a programação virou abas por dia (seção 15), a grande final virou a **HackaRun Experience**
>   e a inscrição é só de equipe, em etapas (seção 16).
> - **Rodada 4:** o formulário saiu da LP para a página `/inscricao`, com uma sub-navegação compartilhada com
>   `/equipes` (seção 16, ADR 0009). O fim da LP ficou só com o clímax e o CTA, e o globo final ficou bem mais calmo:
>   gira devagar, respira e solta um pulso suave (seção 9).
> - **Rodada 5:** o topo do hero ganhou o selo da UniCatólica com os cursos de Engenharia de Software e Inteligência
>   Artificial (seção 6), e a LAES entrou como Organização na faixa "Quem faz acontecer", entre a Realização e a
>   Parceria.

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

| #   | Seção (id)     | `data-scene`                     | Objeto                                                      | Cor dominante                | Intenção                        |
| --- | -------------- | -------------------------------- | ----------------------------------------------------------- | ---------------------------- | ------------------------------- |
| 0   | `#inicio`      | `core`                           | Globo de energia em fitas, borda acesa                      | azul elétrico, cristas ciano | Impacto inicial, curiosidade    |
| 1   | `#sobre`       | `orbit`                          | Cronômetro-giroscópio (mostrador, ponteiro, anéis em cardã) | ciano/azul, acento violeta   | Tempo: é uma corrida            |
| 2   | `#npcs`        | `enigma`                         | "?" extrudado com faixa tracejada e auréola de HUD          | violeta + magenta, aro ciano | Mistério: onde estão os NPCs    |
| 3   | `#missoes`     | `map`                            | Mapa em holograma: rota em espiral com 8 faróis             | ciano/azul, topo laranja     | A corrida em si; progresso      |
| 4   | `#programacao` | `terrain`                        | Terreno synthwave: grade, montanhas e sol em faixas         | azul, sol magenta → laranja  | Os 4 dias, um por aba           |
| 5   | `#mentores`    | `terrain`                        | (mantém o terreno; pausa visual)                            | idem                         | Autoridade                      |
| 6   | `#final`       | `stage`                          | Palco: telão de LED, treliça, canhões de luz, plateia       | ciano/branco, feixes violeta | HackaRun Experience no shopping |
| 7   | `#premios`     | `trophy`                         | Troféu de torno em linhas, alças e estrela                  | laranja/ouro                 | Desejo                          |
| 8   | `#equipes`     | `dust`                           | Galáxia distante e calma                                    | azul-violeta suave           | Prova social: leva a `/equipes` |
| 9   | `#faq`         | `dust`                           | Galáxia                                                     | idem                         | Tirar objeções                  |
| 10  | `#inscricao`   | `core` + `data-scene-hold="900"` | O globo volta calmo, carrega 0,9 s e solta um pulso suave   | azul elétrico, pulso ciano   | Pico emocional → `/inscricao`   |

Regras:

- O morph é **contínuo e reversível** (scroll pra cima desfaz). O índice `scenes.progress` (ex.: 3,4) mistura a cena 3
  e a 4. A troca é uma onda que varre a tela; no meio do voo as partículas escorrem em filamentos.
- A velocidade do scroll faz o conjunto "respirar" pra fora e dá um leve kick no FOV.
- No desktop, o ponteiro desloca a câmera (parallax) e repele partículas, forte no globo do hero, bem menos no globo
  final e quase nada nas outras formas.
- Em paisagem a forma fica ao lado do texto; em retrato fica menor e mais apagada, atrás do título e do parágrafo
  (a única área sem cards de vidro por cima).
- **Nunca travamos o scroll do usuário.** O clímax da inscrição conta tempo, não scroll (seção 9).
- As páginas `/inscricao` e `/equipes` não têm 3D: no lugar do objeto fica um halo de HUD estático em CSS (a metade de
  baixo do mostrador some num degradê), e a aurora continua.

## 4. Paleta oficial

Do manual HackaRun 2026, em `src/presentation/styles/tokens.css`. O azul domina; violeta/magenta = mistério e
gamificação (NPCs); laranja/ouro = tempo, prazos e prêmios.

| Cor               | Hex       | Token          | Uso                                                            |
| ----------------- | --------- | -------------- | -------------------------------------------------------------- |
| Vazio             | `#02030B` | `--c-void`     | Fundo da página (`--bg`)                                       |
| Azul Noturno      | `#060B24` | `--c-night`    | Superfícies elevadas                                           |
| Índigo            | `#0B1242` | `--c-indigo`   | Brilho de fundo                                                |
| Azul Elétrico     | `#1264FF` | `--c-electric` | Energia principal, miolo dos botões, segunda cor do degradê    |
| Ciano Neon        | `#00E5FF` | `--c-cyan`     | Acento (`--accent`), contornos, HUD, cristas                   |
| Roxo Neon         | `#941BFF` | `--c-violet`   | Mistério (`--mystic`), NPCs                                    |
| Magenta           | `#ED28E8` | `--c-magenta`  | Ponta do degradê de energia, mistério                          |
| Laranja Conquista | `#FF852F` | `--c-orange`   | Tempo e prazos (`--time`): contador, horários, "Só equipes"    |
| Ouro              | `#FFC24A` | `--c-gold`     | Prêmios (`--prize`), a final e **foco do teclado** (`--focus`) |
| Branco Gelo       | `#F5F8FF` | `--c-ice`      | Texto (`--text`); secundário a 76% e 60%                       |

Texto miúdo sobre o escuro usa as tintas claras da mesma família, porque o neon puro vibra em letra pequena:
`--ink-cyan` (`#8FF3FF`), `--ink-violet` (`#D2A8FF`) e `--ink-gold` (`#FFD88A`). O violeta puro (`#941BFF`) fica em
cerca de 3,8:1 em letra pequena; o `--ink-violet` passa com folga, inclusive sobre o globo.

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
- **Selo de cursos (topo do hero):** no lugar de uma linha de HUD, acima do logo, a logo branca da UniCatólica, um
  fio vertical (ciano → violeta) e os dois cursos empilhados em JetBrains Mono, caixa alta e tracking largo:
  "ENGENHARIA DE SOFTWARE" em `--ink-cyan` e "INTELIGÊNCIA ARTIFICIAL" em `--ink-violet` (energia × mistério).
  Centralizado, com as réguas de HUD dos dois lados a partir de 480 px (a da esquerda ciano, a da direita violeta).
  A logo tem 2,5rem de altura no celular, 2,75rem a partir de 480 px e 3,25rem a partir de 1024 px, nunca desfocada;
  o texto vai de 0,6875rem a 0,875rem. Atrás dele, um véu escuro oval e sem borda (a mesma ideia do halo do logo)
  separa as letras do aro do globo. "1ª edição" não aparece no hero: fica em "O evento", no FAQ e no rodapé.
- **Parceiros:** logos oficiais brancas da UniCatólica (Realização), da LAES (Organização) e do Capim Dourado
  (Parceria, parceiro exclusivo da premiação). Na primeira tela, a UniCatólica aparece só no selo de cursos e o
  Capim Dourado no crédito discreto do rodapé do hero ("Parceria", a ~60% de opacidade, acende no hover). Grandes,
  as três ficam na faixa "Quem faz acontecer", antes do rodapé, nessa ordem e com o rótulo do papel em HUD: ciano
  na Realização, violeta na Organização, ouro na Parceria. Abaixo de 1024 px a faixa fica em 2 + 1 (UniCatólica e
  LAES lado a lado, Capim Dourado embaixo, na largura toda); a partir daí, três colunas iguais com fios verticais.
  Cada logo tem uma altura ótica própria (a LAES, sólida e quadrada, é a menor) e é centralizada pelo desenho, não
  pela borda transparente do PNG; as legendas começam na mesma linha.

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
  animado (o **Equipes** leva para a página `/equipes`), botão **Pausar animações** (placa com ícone e tooltip da ação
  do próximo clique) e o CTA, que leva para `/inscricao` com o rótulo do momento ("Participar" em breve, "Inscrever"
  com as inscrições abertas, "Equipes" depois de encerradas). Em `/inscricao` o CTA aparece só com contorno (é a
  página atual), e entre 640 e 1023 px ele some com o menu aberto. Desktop: grade de 3 colunas com a navegação no
  centro exato. Celular: logo, pausar e o botão do menu. Fora da LP, os links das seções voltam para a LP (`/#secao`)
  e o item da página atual fica marcado (`aria-current="page"`).
- **Sub-navegação** (`/inscricao` e `/equipes`): logo abaixo do header, com a mesma largura e o mesmo recuo da barra.
  À esquerda, "← Voltar ao evento" (placa com seta, rótulo em HUD); à direita, a chave [Inscrição | Equipes inscritas]
  em paralelogramos, com o item atual aceso. Abaixo de 480 px os rótulos encurtam ("Voltar", "Equipes"), sem mudar o
  nome acessível. "Voltar ao evento" devolve a pessoa ao ponto da LP de onde saiu.
- **Menu mobile:** overlay de tela cheia com links grandes numerados ("checkpoints"), entrada em cascata, foco preso,
  `Esc` fecha e o resto da página fica `inert`. No rodapé do menu, o "Pausar animações" vira uma chave com texto.
- **HUD desktop:** trilho vertical fino na **borda direita**, com um tique por checkpoint (passados acesos, atual
  destacado), barra de progresso e contador de NPCs achados.
- **HUD mobile:** **pílula pequena no rodapé**, com checkpoint e progresso; some enquanto o hero, os CTAs do clímax ou
  o rodapé estão na tela.
- O acento do HUD acompanha a cena (ciano por padrão, violeta no enigma, ouro no troféu). Sem JS não há HUD (ele
  mentiria o checkpoint). O checkpoint é anunciado por `aria-live` discreto.

## 9. 3D cinematográfico

- **Pós-processamento:** bloom real (em meia resolução no tier médio), exposição com ombro suave, aberração cromática
  sutil, vinheta, grão, zoom blur nas travessias e uma onda de choque discreta no clímax (tinta ciano e um pouco de
  refração, sem flash). Cada cena tem seu "look" (força e raio do bloom, tinta do halo, exposição, quantidade de
  estrelas e bokeh).
- **Color grading por cena:** cada objeto tem fundo, corpo, crista e acento da paleta (tabela da seção 3).
- **Câmera coreografada:** enquadramento próprio por cena (hero quase parado; giroscópio visto um pouco de cima; mapa
  em travelling; terreno de grua alta; palco com push-in; troféu em órbita; galáxia por dentro da nuvem). Nas
  travessias a câmera mergulha pela casca do globo rumo ao giroscópio e, no fim, puxa pra trás até o globo final se
  revelar inteiro. "Câmera na mão" sempre: deriva lenta, nunca tremida aleatória.
- **Clímax da inscrição:** calmo, composto e legível atrás do título e do CTA; nada de explosão nem de partículas
  agitadas. O globo final gira devagar (metade do giro do hero), as fitas fluem a 0,4× e ele só **respira** (o raio
  cresce cerca de 1,6% e o brilho cerca de 10%, num ciclo de 3,6 s). A chegada vindo do FAQ é uma onda limpa, sem
  redemoinho. A carga de 0,9 s só soma **luz** (calor e bloom com teto) e contrai o globo de leve; a câmera quase não
  se aproxima. No fim da carga vem um **pulso suave**: a luz sobe em 0,45 s e apaga em cerca de 2,3 s, o globo se
  afasta 5% do raio e volta, e um anel nasce logo fora da borda e abre até cerca de 1,6 vez o raio, sem cruzar o
  título, o contador nem o CTA. Sem flash branco e sem tremor de câmera. O fio de energia sob o botão principal enche
  no mesmo tempo da carga e o botão acende junto com o pulso. A linha de status fica numa placa escura (contraste
  sobre o globo aceso) e, no celular, quebra em duas linhas. Se o usuário sai, a carga descarrega.
- **Sem WebGL, `save-data` ou falha:** brilho estático em CSS no lugar do canvas; o resto da página é idêntico.

## 10. Movimento

- Smooth scroll com **Lenis**; animações com **GSAP + ScrollTrigger**; títulos divididos em linhas pelo `LineSplit` próprio
  (máscara de baixo pra cima).
- Entradas: `y: 40 → 0`, `opacity 0 → 1`, `stagger 0.06`, `ease: expo.out`, `duration 0.9–1.2`.
- Selo de cursos do hero: entra uma vez, em CSS, em cerca de 1,4 s. A logo sobe com fade, o fio e as réguas se
  desenham e cada curso entra numa varredura da esquerda para a direita. Sem loop, então não entra na lista do
  "Pausar animações"; com reduced motion, aparece pronto.
- Missões no desktop (≥ 1024px, sem reduced motion): **trilho horizontal com pin**; no mobile, lista vertical.
- Números (dias, oficinas, estandes) contam de 0 até o valor ao entrar na tela. Terminal do NPC e protocolo da inscrição
  "digitam" caractere a caractere, em silêncio.
- `prefers-reduced-motion`: sem Lenis, sem pin, sem morph contínuo (a cena troca inteira, render sob demanda),
  entradas viram fade simples, durações dos tokens zeradas.
- **Pausar animações** (WCAG 2.2.2): congela onde estão o 3D, os raios do logo e os loops infinitos em CSS (lista em
  `styles/motion-pause.css`); as entradas continuam acontecendo para o conteúdo nunca sumir. A escolha fica salva no
  navegador; com reduced motion o botão já aparece travado em "pausado".

## 11. Gatilhos de retenção e conversão (sempre discretos)

- **Curiosidade:** NPCs misteriosos, mentores e prêmios "a revelar" (cards bloqueados com `???`), pontos das estações
  como "?? pts" e o painel "As regras saem na abertura." com os medidores vazios até o regulamento (12/11, 19h35).
- **Urgência:** contador laranja para o próximo marco (abertura em 11/11 às 19h → fim do desenvolvimento em 14/11 às
  13h → HackaRun Experience em 14/11 às 17h).
- **Escassez:** "vagas limitadas à capacidade dos laboratórios" e contador de vagas quando a organização definir a
  capacidade.
- **Prova social:** na LP, o contador de equipes confirmadas e uma vitrine com até 5 fotos levam para a página
  `/equipes`, onde cada equipe confirmada aparece com a foto ou a logo, em tempo real (planilha).
- **Autoridade:** UniCatólica, LAES e Capim Dourado com logos oficiais, o selo dos cursos no topo do hero, mentores
  egressos e banca.
- **Gamificação:** 3 tokens NPC escondidos na página; achar os 3 revela uma mensagem secreta no HUD.
- **Microcompromisso:** "Adicionar à agenda" (.ics) em `/inscricao`: no rodapé do formulário, no aviso de inscrições
  em breve e na tela de sucesso. Na programação o botão saiu, a pedido da organização. No fim da LP, a lista curta
  "Tenha em mãos" diz o que a equipe precisa antes de clicar.
- **Pico-fim:** o globo carregando e o CTA acendendo junto com o pulso é o momento mais forte da página; o clique leva
  direto para a página de inscrição.

## 12. Acessibilidade (WCAG 2.2 AA)

HTML semântico com landmarks e hierarquia de títulos, skip link, foco visível em ouro, alvos de toque ≥ 44px, canvas
e aurora `aria-hidden`, contador com texto estático para leitor de tela (os dígitos que mudam são `aria-hidden`),
formulário com `label`, `aria-describedby`, `aria-invalid` e erros anunciados (`aria-live`), cada integrante num
`fieldset` com `legend`, foco e anúncio ao adicionar ou remover um integrante, campo da foto com prévia, troca,
arrastar e soltar e status anunciado, programação em abas no padrão WAI-ARIA (tabindex móvel, setas, Home/End,
ativação automática; sem JS, os 4 dias empilhados), FAQ com `<details>`, tokens NPC como botões de verdade, botão
para pausar tudo que se mexe sozinho (2.2.2), `prefers-reduced-motion` respeitado, foco programático das seções com
contorno transparente (continua visível em cores forçadas), conteúdo completo sem JS e sem WebGL. O site não toca
som nenhum. No hero, o selo de cursos é lido uma vez só: o alt "UniCatólica", ", cursos:" e a lista com os dois
cursos. Em `/inscricao` e `/equipes`: sub-navegação com `aria-current="page"` e nome acessível inteiro mesmo com
o rótulo curto; o link da página atual sobe para o topo e leva o foco ao conteúdo. Em `/inscricao`: indicador de
etapas com `aria-current="step"` e ", com campos a ajustar" para leitor de tela, resumo de erros agrupado por bloco e
clique que não se perde quando um erro aparece acima do botão. Em `/equipes`: busca com `label`, contagem anunciada
em região live e alt "Foto ou logo da equipe X" em cada card. Lighthouse mobile (build de produção, 12/10/2026):
acessibilidade 100 na LP, em `/equipes` e em `/inscricao` com as inscrições abertas.

## 13. Copy

- **Sem áudio:** a página não tem som, nem botão de som. A organização pediu para tirar, e o impacto fica com a luz e
  o movimento.
- **Tom de voz:** direto, jovem, "dev pra dev", sem jargão corporativo, verbos de ação. Nada de prometer o que não está
  no regulamento: prêmios e vagas ficam "a revelar" até a organização confirmar. Nada de frase de efeito forçada: o
  título diz uma coisa concreta (ex.: "Da sala de aula ao _palco_.").
- **Local da final:** sempre "Capim Dourado Shopping" (na faixa: "Final no Capim Dourado Shopping"; na grande final:
  "A final é no Capim Dourado Shopping."). O telão é detalhe do palco, não o lugar. O título da grande final usa o
  tamanho menor do cabeçalho e uma largura máxima para nunca partir o nome do shopping.
- **Faixa do "O evento":** a instituição aparece como "UNICATÓLICA", em caixa alta e com acento.
- **Regras do dia a dia** (por exemplo, andar entre as estações) não entram na página: a organização passa no dia.
- **Fonte dos fatos:** datas, horários, locais, públicos e miniementas vêm do documento do coordenador, sem inventar o
  que falta. A premiação oficial é às **19h15** (nada de "18h"), a HackaRun Experience começa às **17h** e o prazo de
  entrega é o do regulamento. Pontuação e regras só depois do regulamento: até lá, "?? pts" e "As regras saem na
  abertura.".
- **Duas frentes sempre claras:** todo bloco diz para quem é, com um selo de público: "Aberto ao público" (ciano),
  "Hackathon" ou "Só alunos da UniCatólica" (violeta), "Só equipes e mentores" (laranja) e "Final com público" (ouro).
- **Grafia:** "UniCatólica" no texto, no SEO e nos dados; caixa alta só na faixa ("UNICATÓLICA").
- **Créditos:** sempre nesta ordem: Realização · UniCatólica, Organização · LAES e Parceria · Capim Dourado
  Shopping. A sigla LAES vem com o nome por extenso na legenda e no alt: "Liga Acadêmica de Engenharia de Software
  e Inteligência Artificial".
- **Canal oficial:** a comunicação do hackathon é por e-mail, nunca por WhatsApp. O formulário e a tela de sucesso
  dizem isso.

## 14. Página de equipes (`/equipes`)

- **Papel:** a vitrine das equipes confirmadas, separada da LP. Na LP, a seção `#equipes` vira uma chamada: contador
  ao vivo, uma fileira com até 5 fotos (quatro vagas tracejadas quando ainda não há equipe) e "+N", "Ver as equipes" e
  o CTA de inscrição com o rótulo do momento ("Quero participar" em breve, "Inscrever minha equipe" aberta).
- **Estrutura:** a sub-navegação (seção 8) no lugar da antiga trilha "HackaRun 2026 › Equipes", H1 "Equipes
  _inscritas_" com o código de HUD `EQ`, contador ao vivo e busca (aparece quando há equipes), grade de cards e uma
  nota de que a equipe aparece depois da confirmação e de como pedir a troca ou a retirada da foto.
- **Grade:** 2 colunas no celular, 3 a partir de 640 px e 4 a partir de 1024 px.
- **Card:** a foto ou logo aparece inteira (`object-fit: contain`) sobre uma cópia desfocada e escurecida dela mesma,
  então logo não corta e foto não ganha tarja preta. Sem imagem, ou se ela não carregar, o card mostra as iniciais do
  nome. Por baixo: o nome da equipe e a quantidade de integrantes (em pontos e em texto).
- **Estado vazio:** a grade de vagas (`LineupSlots`) com o CTA de inscrição, que leva para `/inscricao`.
- **Fundo:** a mesma aurora da LP, sem 3D. No desktop entra um halo de HUD estático em CSS, sem cobrir a busca nem o
  título.
- **Foto na inscrição:** o campo mostra a prévia com "Trocar imagem". Logo com fundo transparente ganha um fundo
  sólido que contrasta com o traço, para não sumir no card escuro.

## 15. Programação (`#programacao`)

- **Estrutura:** título "4 dias de programação." e um seletor de dias: 11/11 QUA Oficinas, 12/11 QUI Abertura, 13/11
  SEX Mercado e 14/11 SÁB Final. As abas ficam numa fileira no celular e numa coluna fixa (`sticky`) ao lado do
  conteúdo no desktop. No dia do evento, a aba de hoje (fuso de Palmas) já abre selecionada.
- **Bloco:** cada bloco mostra a faixa de horário, o local, o selo de público e a linha "Público" do documento. Cada
  atividade tem horário, título e uma linha; miniementa e detalhes ficam num `<details>`. Atividade paralela vai num
  card "Em paralelo", e os marcadores "Hackathon", "Tema a definir" e "Opcional" usam o mesmo selo.
- **14/11:** dois blocos. Desenvolvimento final das 8h às 13h, só equipes e mentores, em tom ouro-laranja; HackaRun
  Experience a partir das 17h, em ouro.
- **Sem JS:** a barra de abas não aparece e os 4 dias ficam empilhados como uma linha do tempo legível.
- **Movimento:** a entrada do painel e a abertura dos detalhes rodam uma vez e respeitam o reduced motion. Nada de loop
  infinito novo.
- **Ao redor:** "O evento" tem dois cards de frente (Programação aberta, "Aberto ao público"; Hackathon, "Só alunos da
  UniCatólica"), lado a lado no tablet e empilhados na coluna do texto no desktop. A grande final tem o carimbo
  "14.11 17H", a linha "A partir das 17h · premiação oficial às 19h15" e o roteiro da noite em 6 chips lidos da
  programação, com o chip da premiação aceso e o cosplay marcado como opcional.

## 16. Inscrição (`/inscricao`)

A inscrição tem uma página própria, leve (sem 3D), no mesmo visual de `/equipes` (ADR 0009). Todo CTA de inscrição do
site leva para ela; no fim da LP fica só o clímax (seção 9) com a lista curta "Tenha em mãos" e o botão.

- **Topo:** header, sub-navegação (seção 8), o código de HUD `IN` com "Inscrição de equipe", o H1 "Inscreva sua
  _equipe_", uma linha sobre quem pode participar e o cartão de status: "Em breve", "Abertas", "Encerrando" ou
  "Encerradas", com o contador e o tamanho da equipe. Atrás do cartão, o mesmo halo de HUD de `/equipes`.
- **Desktop (64rem ou mais):** formulário à esquerda, num painel de vidro com cantoneiras e o fio degradê no topo; à
  direita, o painel "O que você precisa ter em mãos" (4 itens com ícone: 2 a 5 alunos da UniCatólica; nome completo,
  matrícula e e-mail de cada um; foto ou logo; e-mail é o canal oficial; e 3 avisos curtos) e o cartão "Etapas da
  inscrição", que fica preso no alto enquanto a pessoa preenche.
- **Celular e tablet:** tudo numa coluna e enxuto, para o formulário começar cedo. O status vira um chip de uma linha,
  "O que ter em mãos (4)" fica recolhido num `<details>` e as etapas ficam em linha (abaixo de 40rem, sem o título do
  cartão e sem a barra "Lobby online · Esquadrão").
- **Etapas:** três, numeradas: **01 Equipe** (nome e foto ou logo), **02 Integrantes** e **03 Confirmação**
  (consentimento e envio). O cartão das etapas mostra "N de 3 prontas" e uma barra de energia; etapa pronta ganha um
  check, a atual fica acesa e etapa com erro fica com o número em vermelho. Cada etapa é um link que rola até ela. O
  envio continua um só.
- **Integrantes em cards:** cada card pede nome completo, matrícula e e-mail. O "Integrante 1 · contato da equipe" tem
  um selo e nunca pode ser removido. "Adicionar integrante" leva o foco para o card novo; com 5 de 5, o botão
  desativa e vira "Equipe completa · 5/5". A barra do esquadrão ("Lobby online", "Esquadrão N/5") cabe numa linha em
  360 px.
- **Rascunho:** no cartão das etapas, "Rascunho salvo nesta aba" e "Limpar rascunho". Quem sai para a LP e volta
  encontra o que digitou, com a foto. O aceite sempre volta desmarcado.
- **Aviso "Comunicação oficial por e-mail"** junto dos e-mails e, curto, na tela de sucesso, com o e-mail do contato.
- **Erros no campo certo:** e-mail ou matrícula repetidos na equipe apontam o integrante ("já está no integrante N"), e
  nome de equipe, e-mail ou matrícula que já estão em outra equipe aparecem no campo que o servidor apontou. O resumo
  agrupa por bloco ("Integrante 2: nome, matrícula e e-mail").
- **Sucesso:** o protocolo, o aviso do e-mail, "Sua equipe aparece em Equipes depois da confirmação", "Adicionar à
  agenda" e "Voltar ao evento". O painel lateral some.
- **Em breve:** o aviso com "Adicionar à agenda" e uma amostra curta e apagada do formulário, que some num degradê.
- **Celular:** o aviso do e-mail empilha, e o botão da foto encurta para "Trocar" abaixo de 400 px (o leitor de tela
  continua ouvindo "Trocar imagem").

## 17. Histórico: o que a v2 substituiu (obsoleto)

| Tema       | v1 (obsoleto, não use)                           | v2 (vigente)                                                         |
| ---------- | ------------------------------------------------ | -------------------------------------------------------------------- |
| Fundo      | `#07152C` / `#040B18`, scanlines                 | Vazio `#02030B` + aurora por cena + grão                             |
| Acentos    | Ciano `#00CFFF`, azul `#1E7BFF`, âmbar `#FFB547` | Paleta oficial do manual (seção 4)                                   |
| Foco       | Âmbar                                            | Ouro `#FFC24A`                                                       |
| Tipografia | Big Shoulders (display) + Inter (texto)          | Orbitron com til corrigido + Montserrat; JetBrains Mono segue no HUD |
| HUD        | Barra no topo ("03/11 · MISSÕES")                | Trilho na borda direita (desktop) e pílula no rodapé (mobile)        |
| Cenas      | `nebula`, `route`, `arena`, `screen`             | `orbit`, `map`, `terrain`, `stage`                                   |
| Brilho     | Halo "fake" no sprite (blending aditivo)         | Bloom real + passe de lente; halo fake só no tier baixo              |
| Logo       | Recortes provisórios do vídeo de referência      | PNG oficial com raios procedurais                                    |
| Parceiros  | Sem logos oficiais (pendência)                   | Logos oficiais brancas no hero e na faixa antes do rodapé            |
