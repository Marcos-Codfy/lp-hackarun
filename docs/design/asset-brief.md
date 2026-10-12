# Briefing de assets visuais

> Situação na v2 (ADR 0006). O hero deixou de ser uma cena 2.5D com fotos dos prédios: agora é o logo oficial com
> raios procedurais sobre o 3D de partículas. Por isso as ilustrações dos prédios saíram da lista. O site não tem som
> (saiu a pedido da organização em 12/10/2026), então este briefing não pede áudio.

## Entregues e em uso

| Asset                       | Arquivo no projeto                              | Observação                                                                   |
| --------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------- |
| Logo HackaRun (oficial)     | `src/assets/brand/hackarun-logo.png`            | PNG transparente 2156×749; os raios em volta são feitos por código           |
| Logo UniCatólica (branca)   | `src/assets/brand/unicatolica-white.png`        | Versão oficial monocromática                                                 |
| Logo Capim Dourado (branca) | `src/assets/brand/capim-dourado-white.png`      | Versão oficial monocromática                                                 |
| Imagem de compartilhamento  | `public/og-image.jpg`                           | 1200×630 (Open Graph e Twitter Card)                                         |
| Fonte de títulos            | `src/assets/fonts/orbitron-pt-latin-wght.woff2` | Orbitron com o til redesenhado (`scripts/fonts/patch_orbitron_tilde.py`)     |
| Fotos e logos das equipes   | Fora do repositório (Google Drive)              | Cada equipe envia na inscrição; só aparecem depois da confirmação (ADR 0007) |

Logos oficiais vêm do marketing da UniCatólica e do shopping. **Logo redesenhado, vetorizado de novo ou recriado por
ferramenta de geração de imagem não pode ser usado.**

## Ainda desejáveis (opcionais)

| #   | Asset                 | Formato                      | Para quê                                                 |
| --- | --------------------- | ---------------------------- | -------------------------------------------------------- |
| 1   | Logos em SVG          | SVG (os três logos)          | Nitidez em qualquer tamanho e arquivos menores que o PNG |
| 2   | Fotos reais do evento | JPG/WebP, 2400 px de largura | Edições futuras (galeria, prova social)                  |

## Regras para qualquer asset novo

- Logos e recortes com fundo transparente; nada de **texto embutido** (texto queimado não é acessível nem
  indexável).
- Paleta oficial (`docs/design/design-spec.md`, seção 4); nada de cores fora do manual.
- Imagens em `src/assets/` (o Astro otimiza e gera WebP no build) e logos em `src/assets/brand/`.
- Asset gerado por script (a fonte e os assets dos PDFs) não se edita à mão: rode o script e versione a saída. As
  dependências em Python estão no `requirements.txt` da raiz.
- Referências visuais (não vão pro site) ficam em `design/references/`.
