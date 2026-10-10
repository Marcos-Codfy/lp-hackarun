# HackaRun 2026 — Especificação de design e experiência

> **Versão 2 (vigente).** A v1 ficou "correta" demais. A v2 é cinematográfica: vazio quase preto, neon saturado,
> brilho real (bloom), câmera coreografada e a identidade oficial (logo, Orbitron + Montserrat, paleta do manual).
> Onde a v2 e o texto antigo abaixo divergirem, vale a v2.

## v2 · Direção de arte

- **Referência do globo:** `design/references/particle-globe-blue.jpg`. Fitas finas de partículas formando lâminas que
  ondulam, azul ultra-saturado (#1F35FF → #1264FF), cristas ciano (#00E5FF) e picos quase brancos. Miolo escuro.
  Fundo quase preto.
- **Fundo:** vazio `#02030B` com aurora (manchas desfocadas em azul elétrico, violeta e um toque de ciano/magenta)
  que muda de cor por cena + granulação de filme a 7%.
- **Paleta oficial (manual):** Azul Noturno #060B24 · Azul Elétrico #1264FF · Ciano Neon #00E5FF ·
  Roxo Neon #941BFF · Magenta #ED28E8 · Laranja Conquista #FF852F · Branco Gelo #F5F8FF (+ ouro #FFC24A).
  O azul domina; violeta/magenta = mistério e gamificação (NPCs); laranja/ouro = tempo, prazos e prêmios.
- **Cor por cena:** core azul/ciano · nebula violeta/magenta/azul · enigma violeta + ciano · route ciano/azul ·
  arena azul com horizonte magenta · screen ciano/branco · trophy laranja/ouro · dust azul-violeta suave.
- **Tipografia:** Orbitron (títulos, botões, números; caixa alta, 700–900) · Montserrat (texto) · JetBrains Mono (HUD).
- **Logo:** sempre a imagem oficial (`src/assets/brand/hackarun-logo.png`), nunca redesenhada. Raios animados por
  código ao redor dela (ramificados, orgânicos; nada de linha fixa tipo eletrocardiograma).
- **Slogan oficial:** "Desvende. Programe. Conquiste."
- **Botões:** paralelogramo (skew -12°), degradê de energia, brilho externo real, reflexo que atravessa, ícone `>>`
  (grafismo do manual). Ghost com borda degradê de 1px sobre vidro.
- **Header:** barra de vidro flutuante (blur), logo oficial, links com sublinhado degradê animado, botão de som com
  barras de equalizador, CTA. Mobile: overlay de tela cheia com links grandes numerados e entrada em cascata.
- **Cards:** vidro escuro com borda degradê de 1px, cantoneiras HUD, hover com brilho e leve elevação.
- **3D cinematográfico:** bloom real, vinheta, aberração cromática sutil, campo de estrelas ao fundo, bokeh na frente,
  câmera coreografada (atravessa o globo rumo à nebulosa, grua sobre a arena, órbita no troféu), carga final com
  tremor + flash branco sincronizado com o som.
- **Parceiros:** logos oficiais da Unicatólica e do Capim Dourado na hero (discretos) e numa faixa grande antes do rodapé.


> Fonte de verdade visual e de interação da landing page. Antes de mexer em seção, componente ou 3D, leia isto.

## 1. Conceito: "a página é a corrida"

O visitante não lê uma página, ele **percorre uma corrida**. Um único objeto 3D de partículas (o "núcleo" de energia) fica
fixo atrás do conteúdo durante toda a página e **se transforma conforme o scroll**, contando a história do evento.
O HUD no topo mostra o checkpoint atual ("03/11 · MISSÕES") e uma barra de progresso. Isso usa o efeito Zeigarnik:
quem começa uma corrida quer chegar ao fim.

Referências de linguagem: sites de campeonatos de e-sports (Worlds/LoL, VCT/Valorant, Majors de CS), com tipografia
condensada enorme, cortes angulares, linhas de HUD e contadores. **Mas limpo**: muito respiro, uma ideia por tela e
contraste alto.

## 2. Roteiro de cenas (scroll → forma das partículas)

| # | Seção (id)        | `data-scene` | Forma das partículas                                                | Intenção / gatilho                          |
|---|-------------------|--------------|---------------------------------------------------------------------|---------------------------------------------|
| 0 | `#inicio`         | `core`       | Globo de energia (casca com ruído, brilho na borda, como as referências) | Impacto inicial, curiosidade                |
| 1 | `#sobre`          | `nebula`     | O globo explode numa nuvem/galáxia em espiral                       | "Não é só um hackathon"                     |
| 2 | `#npcs`           | `enigma`     | Um **"?"** gigante formado por partículas                           | Mistério: onde estão os NPCs                |
| 3 | `#missoes`        | `route`      | Raio/rota irregular com 8 nós brilhantes (as estações)              | A corrida em si; progresso                  |
| 4 | `#programacao`    | `arena`      | Piso de grade ondulado em perspectiva (arena)                       | Os 4 dias como "rounds"                     |
| 5 | `#mentores`       | `arena`      | (mantém a arena; pausa visual)                                      | Autoridade (mentores, banca)                |
| 6 | `#final`          | `screen`     | **Telão gigante** (moldura retangular + palco + feixes)             | A final no Capim Dourado                    |
| 7 | `#premios`        | `trophy`     | **Troféu** (perfil de torno)                                        | Desejo                                      |
| 8 | `#equipes`        | `dust`       | Poeira esparsa e lenta (não atrapalha leitura)                      | Prova social                                |
| 9 | `#faq`            | `dust`       | Poeira                                                              | Tirar objeções                              |
| 10| `#inscricao`      | `core` + `data-scene-hold="1500"` | O globo se **reconstrói**, fica no centro e "carrega" por 1,5s | Pico emocional → CTA (regra do pico-fim) |

Regras:
- O morph é **contínuo e reversível** (scroll pra cima desfaz). O índice contínuo `scenes.progress` (ex.: 3.4) mistura a cena 3 e a 4.
- A velocidade do scroll gera uma "rajada" (dispersão leve) nas partículas.
- O ponteiro (desktop) desloca levemente a câmera (parallax) e repele partículas perto do cursor no `core`.
- A cena `#inscricao` fica **presa (pin)** enquanto o globo carrega por 1,5s **em tempo** (não em scroll). Depois emite
  `experience:charged`: toca o áudio (se o som estiver ligado) e o formulário/CTA aparece com brilho. **Nunca travamos o
  scroll do usuário.**

## 3. Paleta

| Token           | Hex       | Uso                                                                       |
|-----------------|-----------|---------------------------------------------------------------------------|
| `--c-deep`      | `#07152C` | Fundo base do ambiente                                                    |
| `--c-abyss`     | `#040B18` | Fundo mais profundo (bordas, vinheta)                                     |
| `--c-navy`      | `#0B2450` | Superfícies e brilho de fundo                                             |
| `--c-cyan`      | `#00CFFF` | Energia, contornos, foco de interação, partículas                         |
| `--c-royal`     | `#1E7BFF` | Azul do "RUN" do logo, segunda cor do degradê                             |
| `--c-white`     | `#FFFFFF` | Títulos e conteúdo principal                                              |
| `--c-amber`     | `#FFB547` | **Só** tempo, prazos, alertas e foco do teclado (contador, "15h", "últimas vagas") |

Degradê de energia: `#00CFFF → #1E7BFF` (100°). Textos secundários: branco a 72%. Todos os pares atendem WCAG AA.

## 4. Tipografia

- **Display:** Big Shoulders (variável, 800–900, caixa alta, condensada). Títulos, números do contador, botões.
- **Texto:** Inter (variável). Corpo de texto e formulários.
- **HUD:** JetBrains Mono (variável), 11px, caixa alta, tracking 0.18em, ciano. Rótulos `// 03 — MISSÕES`, coordenadas, códigos.
- Escala fluida com `clamp()` (mobile first). Título do hero até 11rem no desktop.

## 5. Linguagem visual

- **Cortes angulares** (`--clip-card`, `--clip-btn`) em cards e botões, nunca cantos arredondados grandes.
- **Linhas de HUD**: cantoneiras finas em ciano a 45%, réguas, coordenadas de Palmas (`10°11'S 48°20'W`), códigos de seção.
- **Superfícies de vidro escuro**: `--surface` com `backdrop-filter: blur(10px)` e borda `--surface-line`.
- **Brilho só onde importa**: CTA, números, nós da rota. O resto fica sóbrio.
- **Grão/scanlines**: textura sutil de 2–3% de opacidade no fundo (CSS, sem imagem).
- Ícones: SVG inline, traço de 1.5px.

## 6. Movimento

- Smooth scroll com **Lenis**; animações com **GSAP + ScrollTrigger**; títulos com **SplitText** (máscara de baixo pra cima).
- Entradas: `y: 40 → 0`, `opacity 0 → 1`, `stagger 0.06`, `ease: expo.out`, `duration 0.9–1.2`.
- Missões no desktop (≥ 1024px): **scroll horizontal com pin**; no mobile, lista vertical com cards em sequência.
- Números (vagas, pontos, dias) contam de 0 até o valor ao entrar na tela.
- `prefers-reduced-motion`: sem Lenis, sem pin, sem morph contínuo (globo estático suave), entradas viram fade simples.

## 7. Gatilhos de retenção e conversão (sempre discretos)

- **Curiosidade:** NPCs misteriosos, mentores e prêmios "a revelar" (cards bloqueados com `???`).
- **Urgência:** contador âmbar para o próximo marco (largada → entrega 15h → premiação 18h).
- **Escassez:** "vagas limitadas à capacidade dos laboratórios" e contador de vagas quando a organização definir a capacidade.
- **Prova social:** equipes confirmadas aparecem na lista em tempo real (planilha).
- **Autoridade:** Unicatólica + Capim Dourado, mentores egressos, banca.
- **Gamificação:** 3 "tokens NPC" escondidos na página; achar os 3 revela uma mensagem secreta no HUD.
- **Microcompromisso:** "Adicionar à agenda" (.ics) antes da inscrição.
- **Pico-fim:** o final com globo, som e CTA é o momento mais forte da página.

## 8. Acessibilidade (WCAG 2.2 AA)

HTML semântico com landmarks e hierarquia de títulos, skip link, foco visível (âmbar), alvos de toque ≥ 44px, canvas
`aria-hidden`, contador com texto estático para leitor de tela (os dígitos que mudam são `aria-hidden`), formulário com
`label`, `aria-describedby`, `aria-invalid` e erros anunciados (`aria-live`), FAQ com `<details>`, som desligado por
padrão e com controle visível, `prefers-reduced-motion` respeitado, conteúdo legível sem JS e sem WebGL.

## 9. Performance (orçamento)

| Métrica                      | Meta                           |
|------------------------------|--------------------------------|
| LCP (4G, celular médio)      | < 2,5s                         |
| CLS                          | < 0,05                         |
| INP                          | < 200ms                        |
| JS inicial (gzip)            | < 70 KB (three.js fica num chunk lazy) |
| Fontes                       | 3 arquivos woff2 latin, ~125 KB, 2 com preload |
| Partículas                   | low 9k · medium 22k · high 42k |

- O texto do hero é o LCP, renderizado em HTML estático; o 3D entra depois com fade.
- Qualidade adaptativa: tier inicial pelo dispositivo, rebaixa sozinho se o FPS cair (< 45 por 2s). DPR máximo de 1.5 no celular.
- Pausa o render quando a aba some (`visibilitychange`) e quando o canvas está coberto por conteúdo opaco.
- `save-data`/2G: sem 3D, só o fallback em CSS.

## 10. Áudio

Som **desligado por padrão** (política de autoplay e WCAG 1.4.2). O botão `SOM` no header liga o áudio e desbloqueia o
`AudioContext`. Com o som ligado, ao completar a carga do globo final, toca o *cue* (`/public/audio/cta-globe.mp3`; se o
arquivo não existir, toca um som sintetizado via Web Audio). Para trocar o som, substitua o arquivo, mantendo < 60 KB.

## 11. Copy (tom de voz)

Direto, jovem, "dev pra dev", sem jargão corporativo. Verbos de ação. Ex.: "Encontre os NPCs. Decifre as pistas.
Codifique contra o relógio." Nada de prometer o que não está no regulamento: prêmios e vagas ficam "a revelar" até a
organização confirmar.
