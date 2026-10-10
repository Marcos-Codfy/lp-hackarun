# ADR 0005 · Partículas 3D procedurais em vez de vídeo na hero

- **Status:** aceita
- **Data:** 2026-10-10

## Contexto

Havia um vídeo de 10s (1280×720, 2,4 MB) candidato a fundo da hero. O objetivo é causar impacto ("uau") com
estética de e-sports e scroll 3D, sem sacrificar o carregamento no celular.

## Decisão

Usar um **sistema de partículas em WebGL** (Three.js + shaders) que persiste na página inteira e se transforma a cada
seção. As formas são geradas por código, sem baixar modelos.

Motivos para não usar o vídeo na hero:

- 2,4 MB atrasam o LCP no 4G; em 720p ele fica borrado em telas grandes.
- O vídeo é quase estático (a animação é sutil), então o custo não compensa.
- O corte 16:9 perde o logo no celular em pé.
- Tem texto gerado por IA com erros ("PRALICAÇÃO", "PDPESINO", "SGOCRIDO") e logos que não são os oficiais.
- Texto queimado no vídeo não é acessível nem indexável.

## Consequências

- 0 KB de mídia pro efeito principal, nitidez em qualquer resolução e interação com o mouse e o scroll.
- Precisa de fallback (CSS) sem WebGL e de qualidade adaptativa em aparelhos fracos.
- O vídeo continua ótimo para Instagram, stories e o telão do evento. Está em `design/references/`.
