# ADR 0006 · Redesign cinematográfico (v2) com a identidade oficial

- **Status:** aceita
- **Data:** 2026-10-10
- **Complementa:** ADR 0005 (partículas procedurais em vez de vídeo)

## Contexto

A v1 da landing page estava tecnicamente correta, mas o retorno do cliente foi que ela ficou "correta demais": sem o
impacto visual esperado de um evento com estética de e-sports. Três pontos concretos:

- **Identidade:** a página usava fontes e cores próprias (Big Shoulders, Inter, ciano #00CFFF) e recortes provisórios
  do logo. Chegou o manual oficial do HackaRun 2026 (logo, paleta, Orbitron + Montserrat) e as logos oficiais dos
  parceiros, e tudo precisava seguir o manual.
- **Tipografia:** na Orbitron original, o til de "NÃO" e "MISSÕES" parece acento grave em título grande ("NÀO").
  Trocar de fonte não era opção, porque a Orbitron está no manual.
- **Impacto:** as formas da v1 (nebulosa, rota, arena, telão) liam como "partículas genéricas", e o brilho era um halo
  falso no sprite. Faltavam objetos reconhecíveis, luz de verdade e câmera com intenção.

## Decisão

1. **Identidade oficial em tudo:** logo PNG oficial (nunca redesenhado, com raios procedurais por código em volta),
   paleta do manual nos tokens (`styles/tokens.css`), Orbitron nos títulos, Montserrat no texto, JetBrains Mono no HUD
   e logos brancas oficiais da Unicatólica e do Capim Dourado.
2. **Correção do til da Orbitron:** o script `scripts/fonts/patch_orbitron_tilde.py` (fontTools) redesenha o til em
   degraus, no estilo geométrico da fonte, nos pesos 400 a 900, e gera o woff2 servido pelo site. A fonte original
   continua vindo do Fontsource; o patch é reproduzível.
3. **Pós-processamento real:** `EffectComposer` com `UnrealBloomPass` em resolução própria e um passe de lente próprio
   (exposição com ombro suave, aberração cromática, vinheta, grão, zoom blur, flash e onda de choque), com "look" por
   cena. Campo de estrelas e bokeh dão profundidade; a aurora em CSS muda de cor por cena.
4. **Objetos novos, um por seção:** cronômetro-giroscópio, "?" extrudado, mapa de missões em holograma, terreno
   synthwave, palco com telão, troféu e galáxia, além do globo. Cada objeto tem uma `ShapeStrategy` em TypeScript e o
   seu próprio arquivo GLSL (`shaders/shapes/<cena>.glsl`, o globo em `core.glsl`), com a deformação viva e o "calor"
   que puxa a cor.
5. **Câmera coreografada:** enquadramento por cena, voos entre cenas (atravessar a casca do globo, pull-back final) e
   câmera na mão. O clímax da inscrição sincroniza flash, tremor e som no mesmo evento.
6. **Loop de QA visual:** cada mudança visual é conferida em capturas reais (Playwright dirigindo o Brave instalado,
   com GPU) em várias larguras e tiers, comparadas com as referências em `design/references/`, e medida no Lighthouse.

## Alternativas consideradas

- **Trocar a Orbitron por outra geométrica com til correto:** quebraria o manual da marca.
- **Escrever "NAO"/"MISSOES" sem til nos títulos:** erro de português no site oficial de uma universidade.
- **Modelos 3D (glTF) para os objetos:** peso de download, pipeline de arte que a equipe não tem e menos controle sobre
  o morph entre formas. As partículas procedurais seguem a ADR 0005.

## Consequências

- O visual chega ao nível pedido, e qualquer peça nova segue o manual pelos tokens.
- **Performance virou trabalho contínuo:** pós-processamento, mais objetos e shaders maiores pesam no celular. A
  resposta foi carregar o 3D tarde (chunk depois do `load`, com o navegador ocioso), gerar as formas fora da thread
  principal, compilar shaders em paralelo antes do primeiro frame, fatiar o boot em tarefas curtas, adiar o render das
  seções longe do topo (`content-visibility`) e rebaixar efeitos por FPS (bloom inteiro → meia resolução → nenhum,
  depois DPR, depois tier). A meta de performance do Lighthouse mobile segue em otimização.
- Constantes do desenho de cada objeto ficam espelhadas entre o `.ts` e o `.glsl`, com comentário dos dois lados;
  adicionar uma cena exige tocar alguns `Record<SceneKey, ...>` (o TypeScript aponta todos). Passo a passo no guia,
  seção 7.7.
- A fonte corrigida é um asset gerado: atualizar a Orbitron do Fontsource exige rodar o script de novo.
- As referências visuais e as capturas de QA viram parte do processo de revisão de qualquer PR visual.

## Atualização (2026-10-12)

A pedido da organização, depois da aprovação da v2, o site deixou de ter som e o clímax ficou mais calmo. O resto
desta decisão continua valendo.

- **Itens 3 e 5:** o passe de lente não tem mais flash branco, e o clímax não sincroniza flash, tremor nem som. A
  carga dura 0,9 s (era 1,5 s) e termina num pulso suave: o globo respira inteiro, o anel é menor e o brilho que a
  carga soma tem teto (`MAX_CHARGE_BLOOM` e `MAX_CHARGE_EXPOSURE`, no `PostDirector`). A câmera na mão ficou só com a
  deriva lenta.
- **Áudio:** saíram o botão de som, o cue do globo, o som de digitação e o script que os sintetizava. Detalhes no
  `CHANGELOG.md` (`[Unreleased]`) e no guia, seção 7.5.
