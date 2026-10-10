# Briefing de assets visuais (hero e final)

A hero é uma cena em camadas (2.5D): cada camada se move numa profundidade diferente com o scroll e o mouse.
Por isso cada elemento precisa vir **separado, com fundo transparente e sem texto embutido**.
Use fotos reais dos prédios como referência ao gerar (a ideia é que sejam reconhecíveis).

## Arquivos

| # | Arquivo | Conteúdo | Formato / tamanho |
| --- | --- | --- | --- |
| 1 | `hero-sky.jpg` | Céu noturno azul elétrico com nuvens volumosas e brilho ciano no horizonte. Sem prédios, sem texto | JPG 2560×1440 (e uma versão vertical 1440×2560) |
| 2 | `building-unicatolica.png` | Fachada real da Unicatólica (Palmas–TO) à noite, vista 3/4 pela esquerda, iluminação azul/ciano, palmeiras na base. Sem pessoas | PNG transparente, ~2400 px de largura |
| 3 | `building-capim-dourado.png` | Fachada real do Capim Dourado Shopping à noite, vista 3/4 pela direita, cúpula iluminada, mesma luz azul/ciano. Sem pessoas | PNG transparente, ~2400 px de largura |
| 4 | `hackarun-logo.png` (ou `.svg`) | Logo HACKARUN (HACKA branco + RUN azul) com a placa escura, **sem** os raios (os raios são animados por código) | PNG transparente 3000 px de largura, ou SVG |
| 5 | `logo-unicatolica.svg` | Logo oficial da Unicatólica, versão branca/monocromática | SVG (ou PNG transparente 1000 px) |
| 6 | `logo-capim-dourado.svg` | Logo oficial do Capim Dourado Shopping, versão branca/monocromática | SVG (ou PNG transparente 1000 px) |
| 7 | `cta-globe.mp3` | Som do globo final (energia carregando + impacto), 1,5 a 2 s | MP3 até 60 KB |

Os logos 5 e 6 devem ser os **oficiais** (peça ao marketing da Unicatólica e do shopping). Logo recriado por IA não
pode ser usado.

## Prompts prontos (Claude Design ou outro gerador)

**1 · Céu**
> Céu noturno cinematográfico em estilo de arte de e-sports, tons de azul profundo (#07152C) a azul elétrico (#1E7BFF), nuvens volumosas iluminadas por brilho ciano (#00CFFF) no horizonte, partículas de energia sutis, sem prédios, sem pessoas, sem texto. Proporção 16:9, alta resolução.

**2 · Unicatólica**
> Ilustração cinematográfica semi-realista da fachada do Centro Universitário Católica do Tocantins (Unicatólica), em Palmas–TO, fiel à foto de referência, à noite, vista em 3/4 pela esquerda, iluminação azul e ciano neon refletindo nas paredes de vidro, palmeiras na base, atmosfera de arena de e-sports. Sem pessoas, sem texto adicional. Fundo transparente.

**3 · Capim Dourado Shopping**
> Ilustração cinematográfica semi-realista da fachada do Capim Dourado Shopping, em Palmas–TO, fiel à foto de referência, à noite, vista em 3/4 pela direita, cúpula iluminada, iluminação azul e ciano neon, mesma luz e estilo da ilustração da Unicatólica. Sem pessoas, sem texto adicional. Fundo transparente.

**4 · Logo**
> Recorte o logo HACKARUN da arte original em camada própria, fundo transparente, sem raios e sem o subtítulo, mantendo a placa escura e o contorno.

## Onde colocar

Salve os arquivos em `src/assets/hero/` (imagens otimizadas automaticamente pelo Astro em AVIF/WebP) e os logos
oficiais em `src/assets/brand/`. Até lá, o site usa recortes provisórios do vídeo de referência.
