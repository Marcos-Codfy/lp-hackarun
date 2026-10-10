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
- Classes pequenas (POO e SOLID). Arquivo passou de 300 linhas? Quebre em partes.
- Respeite as camadas: domínio não importa nada de fora; aplicação só depende do domínio.
- Use os aliases (`@domain/*`, `@application/*`, ...) e `import type` para tipos.
- CSS só com os tokens de `src/presentation/styles/tokens.css`, mobile first.
- Toda regra nova de negócio vem com teste em `tests/`.

## Checklist do PR

- [ ] `npm run validate` passou
- [ ] Testado no celular (360px) e no desktop
- [ ] Teclado e leitor de tela ok; `prefers-reduced-motion` respeitado
- [ ] Sem `console.log`, sem arquivo gigante, sem segredo no código
