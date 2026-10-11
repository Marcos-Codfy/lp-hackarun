# Briefing de assets visuais e sonoros

> Situação na v2 (ADR 0006). O hero deixou de ser uma cena 2.5D com fotos dos prédios: agora é o logo oficial com
> raios procedurais sobre o 3D de partículas. Por isso as ilustrações dos prédios saíram da lista.

## Entregues e em uso

| Asset                    | Arquivo no projeto                            | Observação                                                       |
| ------------------------ | --------------------------------------------- | ---------------------------------------------------------------- |
| Logo HackaRun (oficial)  | `src/assets/brand/hackarun-logo.png`          | PNG transparente 2156×749; os raios em volta são feitos por código |
| Logo Unicatólica (branca) | `src/assets/brand/unicatolica-white.png`     | Versão oficial monocromática                                     |
| Logo Capim Dourado (branca) | `src/assets/brand/capim-dourado-white.png` | Versão oficial monocromática                                     |
| Imagem de compartilhamento | `public/og-image.jpg`                       | 1200×630 (Open Graph e Twitter Card)                             |
| Som do clímax            | `public/audio/cta-globe.mp3`                  | Sintetizado (`scripts/audio/render_cues.py`), ~22 KB             |
| Cliques de digitação     | `public/audio/ui-typing.wav`                  | Sprite sintetizado com 6 cliques, ~24 KB                         |
| Fonte de títulos         | `src/assets/fonts/orbitron-pt-latin-wght.woff2` | Orbitron com o til redesenhado (`scripts/fonts/patch_orbitron_tilde.py`) |

Logos oficiais vêm do marketing da Unicatólica e do shopping. **Logo recriado por IA não pode ser usado.**

## Ainda desejáveis (opcionais)

| #   | Asset                   | Formato                       | Para quê                                                    |
| --- | ----------------------- | ----------------------------- | ----------------------------------------------------------- |
| 1   | Logos em SVG            | SVG (os três logos)           | Nitidez em qualquer tamanho e arquivos menores que o PNG    |
| 2   | Sons oficiais           | MP3 até 60 KB (cue, 1,5–2 s)  | Substituir o cue sintetizado, se a organização preferir     |
| 3   | Fotos reais do evento   | JPG/WebP, 2400 px de largura  | Edições futuras (galeria, prova social)                     |

## Regras para qualquer asset novo

- Logos e recortes com fundo transparente; nada de **texto embutido** (texto queimado não é acessível nem
  indexável).
- Paleta oficial (`docs/design/design-spec.md`, seção 4); nada de cores fora do manual.
- Imagens em `src/assets/` (o Astro otimiza e gera WebP no build) e logos em `src/assets/brand/`.
- Som: mono, até 60 KB, sem amostras de terceiros sem licença. Coloque em `public/audio/` com o mesmo nome do atual.
- Referências visuais (não vão pro site) ficam em `design/references/`.
