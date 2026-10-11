# Como contribuir

Valeu por ajudar no HackaRun! Este guia resume o fluxo. Os detalhes de arquitetura estão em
[docs/GUIA_DO_PROJETO.md](docs/GUIA_DO_PROJETO.md).

## Fluxo

1. Atualize a `main`: `git switch main && git pull`.
2. Crie uma branch: `feat/<assunto>`, `fix/<assunto>`, `docs/<assunto>`, `refactor/<assunto>`.
3. Faça commits pequenos e frequentes (padrão abaixo).
4. Rode `npm run validate` (lint + testes + build).
5. Abra um Pull Request para a `main` preenchendo o template. A CI precisa ficar verde.
6. Peça revisão de pelo menos 1 pessoa. O merge é feito com **squash**.

## Commits: Conventional Commits

```text
<tipo>(<escopo>): <descrição no imperativo, em inglês, sem ponto final>

[corpo opcional: o porquê da mudança]

[rodapé opcional: BREAKING CHANGE: ..., Closes #12]
```

- **Tipos:** `feat`, `fix`, `perf`, `refactor`, `style`, `test`, `docs`, `build`, `ci`, `chore`, `revert`.
- **Escopos:** `domain`, `application`, `infra`, `ui`, `sections`, `experience`, `motion`, `a11y`, `perf`, `seo`,
  `content`, `docs`, `ci`, `deps`, `config`, `tests`.
- Mudança que quebra compatibilidade: `!` depois do escopo (`feat(domain)!: ...`) e `BREAKING CHANGE:` no rodapé.

Exemplos:

```text
feat(sections): add grand final section with spotlight beams
fix(motion): keep header offset when jumping to anchors
docs(content): update mentors list
perf(experience): lower particle count on low-end devices
```

O Husky valida a mensagem (commitlint) e roda ESLint e Prettier nos arquivos do commit (lint-staged). Não use
`--no-verify`.

## Padrões de código

- Código e nomes em inglês. Textos da interface e comentários em português.
- Comentário curto, só quando ajuda; nada de explicar o óbvio.
- Classes pequenas (POO e SOLID). Alvo de até 150 linhas por arquivo, teto de 250: passou, quebre em partes (o ESLint
  avisa acima de 200 e dá erro acima de 250 linhas de código, `<style>` dos `.astro` incluído).
- Respeite as camadas: domínio não importa nada de fora; aplicação só depende do domínio; apresentação usa as portas
  da aplicação e nunca importa infraestrutura (o adapter é ligado em `src/composition`); `shared` não importa camada
  nenhuma. O ESLint bloqueia.
- Use os aliases (`@domain/*`, `@application/*`, ...) e `import type` para tipos.
- CSS só com os tokens de `src/presentation/styles/tokens.css` (paleta oficial), mobile first (media queries
  `min-width`). Foco nunca com `outline: none`: use `outline: 2px solid transparent` (aparece em cores forçadas).
- Loop de animação infinito em CSS entra na lista de `src/presentation/styles/motion-pause.css`, senão o botão
  "Pausar animações" não para ele.
- 3D: uma `ShapeStrategy` e um `.glsl` por objeto; passo a passo em
  [docs/GUIA_DO_PROJETO.md](docs/GUIA_DO_PROJETO.md#77-como-adicionar-uma-cena).
- Toda regra nova de negócio vem com teste em `tests/`.
- Asset gerado por script (sons, fonte, assets dos PDFs) não se edita à mão: rode o script e versione a saída.

## Checklist do PR

- [ ] `npm run validate` e `npm run format:check` passaram
- [ ] Testado no celular (360 e 390px) e no desktop (1440px), com capturas das seções alteradas
      ([scripts de QA](scripts/qa/README.md): `shots`, `overflow` e `anchorcheck`)
- [ ] Mexeu no 3D: conferido com `?quality=low` e `?quality=high`, sem erro no console
- [ ] Teclado e leitor de tela ok; `prefers-reduced-motion` respeitado; "Pausar animações" para tudo
- [ ] Lighthouse mobile sem regressão (acessibilidade, boas práticas e SEO em 100)
- [ ] Sem `console.log`, sem arquivo acima de 250 linhas, sem segredo no código
