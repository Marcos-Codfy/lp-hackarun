# Como contribuir

Valeu por ajudar no HackaRun! Este guia resume o fluxo de quem vai mexer no código, inclusive a partir de um fork.
Para instalar e rodar no seu PC, siga a seção [Como rodar no seu PC](README.md#como-rodar-no-seu-pc) do README. Os
detalhes de arquitetura estão em [docs/GUIA_DO_PROJETO.md](docs/GUIA_DO_PROJETO.md).

## Primeira vez

1. No GitHub, faça o **fork** do repositório e clone o seu fork:

   ```bash
   git clone https://github.com/<seu-usuario>/lp-hackarun.git
   cd lp-hackarun
   git remote add upstream https://github.com/Marcos-Codfy/lp-hackarun.git
   ```

2. Prepare o projeto com `npm run setup`: ele confere o Node (24 LTS, do `.nvmrc`), roda o `npm ci`, cria o `.env` e
   mostra os próximos passos. `npm run setup -- --qa` instala também os scripts de QA.
3. Rode `npm run dev` e abra `http://localhost:4321`. Sem endpoint no `.env`, a inscrição roda em modo simulado e não
   grava em planilha nenhuma.

Quem tem acesso de escrita ao repositório original pode pular o fork e criar a branch direto nele.

## Fluxo de cada mudança

1. Atualize a `main` do seu fork com a do original:

   ```bash
   git switch main
   git pull upstream main
   git push origin main
   ```

2. Crie uma branch: `git switch -c feat/<assunto>` (ou `fix/`, `docs/`, `refactor/`, `test/`, `chore/`).
3. Faça commits pequenos e frequentes (padrão abaixo).
4. Rode `npm run validate` (lint + testes + build) e `npm run format:check`.
5. Se a `main` do original andou enquanto você trabalhava, traga as mudanças para a sua branch:

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

   Resolva os conflitos, rode os testes de novo e envie com `git push --force-with-lease` (só na sua branch, nunca na
   `main`).

6. Envie a branch (`git push -u origin feat/<assunto>`) e abra um Pull Request para a `main` de
   `Marcos-Codfy/lp-hackarun`, preenchendo o template. A CI precisa ficar verde.
7. Peça revisão de pelo menos 1 pessoa. O merge é feito com **squash**.

## Commits: Conventional Commits

```text
<tipo>(<escopo>): <descrição no imperativo, em inglês, sem ponto final>

[corpo opcional: o porquê da mudança]

[rodapé opcional: BREAKING CHANGE: ..., Closes #12]
```

- **Tipos:** `feat`, `fix`, `perf`, `refactor`, `style`, `test`, `docs`, `build`, `ci`, `chore`, `revert`.
- **Escopos** (lista em [`commitlint.config.js`](commitlint.config.js); escopo fora dela gera aviso, tipo fora da lista
  dá erro):

| Escopo        | Onde mexe                                                                |
| ------------- | ------------------------------------------------------------------------ |
| `domain`      | `src/domain`: entidades, value objects e regras de negócio               |
| `application` | `src/application`: casos de uso, DTOs e portas                           |
| `infra`       | `src/infrastructure` e `apps-script/`: JSON, repositórios, Apps Script   |
| `ui`          | Componentes, layout, header, rodapé e estilos compartilhados             |
| `sections`    | As seções da LP e da página `/equipes`                                   |
| `experience`  | O 3D (`src/presentation/experience`): formas, shaders, câmera, qualidade |
| `motion`      | GSAP, Lenis, scroll, âncoras e animações de entrada                      |
| `a11y`        | Acessibilidade                                                           |
| `perf`        | Performance                                                              |
| `seo`         | Metadados, JSON-LD, sitemap                                              |
| `content`     | Textos e o conteúdo de `src/infrastructure/content/*.json`               |
| `docs`        | README, guia, ADRs, changelog e este arquivo                             |
| `ci`          | GitHub Actions                                                           |
| `deps`        | Dependências                                                             |
| `config`      | Configuração de ferramentas (ESLint, Prettier, Astro, TypeScript, Husky) |
| `tests`       | Testes e scripts de QA                                                   |

- Mudança que quebra compatibilidade: `!` depois do escopo (`feat(domain)!: ...`) e `BREAKING CHANGE:` no rodapé.

Exemplos:

```text
feat(sections): add day tabs to the schedule
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
- Conteúdo do evento (datas, horários, locais, públicos) segue o documento oficial da organização: não invente o que
  falta. Pontuação e regras só depois do regulamento.
- Toda regra nova de negócio vem com teste em `tests/`.
- Asset gerado por script (fonte, assets dos PDFs) não se edita à mão: rode o script e versione a saída. As
  dependências em Python estão no `requirements.txt`.

## Inscrições e Apps Script

- **Teste com uma planilha sua**, nunca com a oficial. Publique o Apps Script na sua conta
  ([apps-script/README.md](apps-script/README.md)) e coloque a URL `/exec` só no seu `.env`
  (`PUBLIC_REGISTRATION_ENDPOINT`). O `.env` fica fora do Git; não grave a URL no `event.json`.
- Mexeu em `apps-script/`? Publique uma nova versão do Web App junto com o deploy do site (passo a passo no
  [apps-script/README.md](apps-script/README.md), seção 7).
- Constantes espelhadas entre o `.gs` e o TypeScript mudam nos dois lados, e o
  `tests/infrastructure/apps-script/contract.test.ts` acusa se divergirem:
  - `CONSENT_VERSION` (aviso de privacidade) e `MIN_ELAPSED_MS` (o `MIN_FILL_MS` do `SubmitRegistration.ts`);
  - `TEAM_SIZE` (igual ao `registration.teamSize` do `event.json`);
  - `TEAM_NAME_LIMITS`, `NAME_MAX`, `STUDENT_ID_LIMITS` e `STUDENT_ID_PATTERN`, `EMAIL_MAX` e `EMAIL_PATTERN`;
  - `MAX_IMAGE_BYTES` (o teto da foto, igual ao `TEAM_IMAGE_RULES.maxBytes`).

## Checklist do PR

- [ ] `npm run validate` e `npm run format:check` passaram
- [ ] Testado no celular (360 e 390px) e no desktop (1440px), com capturas das seções alteradas
      ([scripts de QA](scripts/qa/README.md): `shots`, `overflow` e `anchorcheck`)
- [ ] Mexeu no 3D: conferido com `?quality=low` e `?quality=high`, sem erro no console
- [ ] Mexeu em header, rodapé ou equipes: conferido também em `/equipes` (vazia e com equipes)
- [ ] Mexeu na programação: as 4 abas conferidas, com teclado, e a versão sem JavaScript (dias empilhados)
- [ ] Mexeu no formulário: testado no modo simulado com 2 e com 5 integrantes, erros de campo e conflito de duplicado
- [ ] Teclado e leitor de tela ok; `prefers-reduced-motion` respeitado; "Pausar animações" para tudo
- [ ] Lighthouse mobile sem regressão (acessibilidade, boas práticas e SEO em 100)
- [ ] Mudança anotada em **[Unreleased]** no [CHANGELOG.md](CHANGELOG.md)
- [ ] Sem `console.log`, sem arquivo acima de 250 linhas, sem segredo nem URL de planilha no código
