# ADR 0001 · Astro (SSG) + TypeScript como base

- **Status:** aceita
- **Data:** 2026-10-10

## Contexto

Landing page com muito conteúdo, foco em SEO, carregamento rápido no 4G e uma experiência 3D pesada. A sugestão
inicial era React + CSS.

## Decisão

Usar **Astro** em modo estático (SSG) com TypeScript estrito. O HTML sai pronto do build; o JavaScript entra só onde
há interação (contador, formulário, 3D, animações), e o three.js fica num chunk carregado depois do primeiro paint.

## Alternativas

- **React (Vite SPA):** a página só aparece depois do JS, o que piora LCP e SEO.
- **Next.js (export estático):** resolve SSR, mas traz runtime e hidratação desnecessários pra uma página só.
- **Vanilla + Vite:** máximo controle, mas sem componentes de template, o que dificulta pra equipe.

## Consequências

- Excelente LCP/SEO e deploy estático em qualquer CDN gratuita.
- Componentes `.astro` são parecidos com JSX, então a curva pra quem conhece React é pequena. Se precisar, o Astro
  aceita ilhas React.
- A lógica interativa é TypeScript puro (POO/MVVM), independente de framework.
