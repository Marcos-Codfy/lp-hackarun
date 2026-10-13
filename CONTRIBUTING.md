# Como contribuir

Valeu por ajudar no HackaRun! Este guia resume o fluxo de quem vai mexer no código. Quem é da equipe segue o
[Fluxo de trabalho da equipe](#fluxo-de-trabalho-da-equipe) logo abaixo; quem é de fora contribui por
[fork](#contribuição-de-fora-da-equipe-fork). Para instalar e rodar no seu PC, siga a seção
[Como rodar no seu PC](README.md#como-rodar-no-seu-pc) do README. Os detalhes de arquitetura estão em
[docs/GUIA_DO_PROJETO.md](docs/GUIA_DO_PROJETO.md), e a configuração da Cloudflare, na seção 16 dele.

## Fluxo de trabalho da equipe

O repositório fica na organização **`hackarun-unicatolica`** do GitHub:
https://github.com/hackarun-unicatolica/lp-hackarun. O site oficial é **https://hackarun.pages.dev** (Cloudflare
Pages). Ele se atualiza sozinho a cada merge na `main`, e todo Pull Request ganha uma prévia própria. Ninguém dá push
direto na `main`: tudo entra por PR, com a CI verde e a aprovação de um dos **donos do código**
([`.github/CODEOWNERS`](.github/CODEOWNERS)):

| Pessoa         | GitHub          | Papel                                                                    |
| -------------- | --------------- | ------------------------------------------------------------------------ |
| Marcos         | `@Marcos-Codfy` | Dono do repositório e dono do código; pode fazer o merge direto          |
| Emilly         | `@Emyrreis`     | Administradora e dona do código; pode fazer o merge direto               |
| Amanda         | `@Manddyyysss`  | Dona do código: revisa e aprova os PRs                                   |
| Demais colegas | (cada um)       | Colaboradores: criam branches e abrem PRs, que passam pela revisão acima |

"Merge direto" é a passagem de administrador do GitHub: Marcos e Emilly conseguem fazer o merge de um PR sem esperar
a aprovação de outra pessoa. Mesmo assim, a mudança entra por PR.

### Primeira vez

1. Mande o seu **nome de usuário do GitHub** para o Marcos (dono do repositório) ou para a Emilly (administradora).
   Um dos dois adiciona você como colaborador do repositório na organização `hackarun-unicatolica`; aceite o convite
   pelo aviso do GitHub (o sino de notificações) ou pelo link que chega no seu e-mail.
2. **Clone o repositório original, sem fork.** PR que vem de fork não ganha a prévia da Cloudflare.

   ```bash
   git clone https://github.com/hackarun-unicatolica/lp-hackarun.git
   cd lp-hackarun
   npm run setup
   npm run dev
   ```

   O `npm run setup` confere o Node (24 LTS, do `.nvmrc`), roda o `npm ci` e cria o `.env`. Abra
   `http://localhost:4321`; sem endpoint no `.env`, a inscrição em `/inscricao` roda em modo simulado e não grava em
   planilha nenhuma.

### Cada mudança, do começo ao fim

1. **Atualize a `main`:** `git switch main` e `git pull`.
2. **Crie uma branch** com o tipo na frente e um assunto curto, em minúsculas e com hífen:

   ```bash
   git switch -c feat/faq-novas-perguntas
   ```

   Use `feat/` (funcionalidade), `fix/` (correção) ou `docs/` (documentação); `refactor/`, `test/` e `chore/` também
   valem. O nome vira o endereço fixo da prévia: `feat/faq-novas-perguntas` fica em
   `feat-faq-novas-perguntas.hackarun.pages.dev`.

3. **Faça commits pequenos** em Conventional Commits, com um dos escopos permitidos
   ([Commits](#commits-conventional-commits), mais abaixo). Exemplo: `feat(content): add three faq questions`.
4. **Confira antes de enviar:** `npm run validate` (lint, testes e build) e `npm run format:check`.
5. **Envie a branch:** `git push -u origin feat/faq-novas-perguntas`.
6. **Abra o Pull Request** para a `main` (o GitHub mostra o botão **Compare & pull request**). O título também segue
   Conventional Commits, porque é ele que vira o commit na `main`. Preencha o template.
7. **Espere a CI e a prévia.** A CI ("Lint, format, test e build") precisa ficar verde. Em 1 a 2 minutos o bot da
   Cloudflare comenta no PR o link da prévia (`https://<hash>.hackarun.pages.dev`). Abra no desktop e no celular e
   confira o que mudou. Na prévia a inscrição é simulada: o aviso "Prévia de revisão" aparece em `/inscricao` e nada é
   gravado na planilha.
8. **Revisão.** Um dos donos do código (Marcos, Emilly ou Amanda) revisa e aprova. Quem abriu o PR não aprova o
   próprio: PR da Amanda precisa do Marcos ou da Emilly. Marcos e Emilly podem fazer o merge direto (a passagem de
   administrador, acima). A aprovação de outro colega ajuda na revisão, mas não libera o merge. Pediram ajuste? Faça
   novos commits na mesma branch e dê push: a CI e a prévia rodam de novo. Commit novo (ou Update branch) depois da
   aprovação derruba a aprovação: peça para o dono do código aprovar de novo.
9. **Merge com "Squash and merge".** Cada PR vira um commit só na `main`, com o título do PR em Conventional Commits.
   O histórico fica limpo (sem os "ajuste" e "wip" do meio do caminho), cada linha do `CHANGELOG.md` aponta para um
   commit e desfazer um PR inteiro é reverter um commit. Por isso o repositório aceita só esse tipo de merge.
10. **Pronto.** A produção publica sozinha em cerca de 1 a 2 minutos em https://hackarun.pages.dev. Apague a branch
    pelo botão **Delete branch** do PR.

A `main` andou enquanto o seu PR estava aberto? Use o botão **Update branch** do PR ou, no terminal,
`git fetch origin`, `git rebase origin/main` e `git push --force-with-lease` (só na sua branch, nunca na `main`).

### Deu problema em produção? Como voltar

- **Na hora, pela Cloudflare** (quem tem acesso à conta): Workers & Pages → `hackarun` → **Deployments** → no último
  deploy de produção bom, menu **⋯** → **Rollback to this deployment**. O site volta na mesma hora.
- **Pelo GitHub** (qualquer pessoa da equipe): no PR que causou o problema, botão **Revert**. Ele abre um PR que
  desfaz a mudança; com a CI verde e a aprovação, o merge publica a correção em 1 a 2 minutos.
- Voltou pela Cloudflare? Faça também o revert no GitHub: senão o próximo merge publica o problema de novo.

### O que não fazer

- **Push direto na `main`.** O GitHub bloqueia para os colaboradores; tudo entra por PR.
- **Commitar o `.env`.** Ele fica fora do Git (`.gitignore`); nunca force com `git add -f`.
- **Colocar a URL do Apps Script (`/exec`) no repositório:** nem no `event.json`, nem em teste, nem em print ou
  descrição de PR. Ela só existe nas variáveis da Cloudflare e no `.env` de quem testa com a própria planilha.
- **Na Cloudflare, clicar em Upgrade, Workers Paid ou Pages Pro, ou cadastrar cartão ou outra forma de pagamento.** O
  plano Free cobre tudo o que o site precisa.
- **Criar `functions/`, `_worker.js` ou `wrangler.toml`.** O site é 100% estático. `functions/` e `_worker.js` ligam
  código no servidor da Cloudflare (cota diária de Workers); o `wrangler.toml` passa a mandar na configuração do
  projeto e o painel deixa de editar as variáveis de Production e Preview.
- **Fazer fork para trabalho da equipe.** O PR de fork não ganha prévia.

## Contribuição de fora da equipe (fork)

Não é da equipe? Contribua a partir de um fork. O PR de fork não ganha a prévia da Cloudflare, então capriche nas
capturas de tela no PR; um dos donos do código revisa.

### Primeira vez

1. No GitHub, faça o **fork** do repositório e clone o seu fork:

   ```bash
   git clone https://github.com/<seu-usuario>/lp-hackarun.git
   cd lp-hackarun
   git remote add upstream https://github.com/hackarun-unicatolica/lp-hackarun.git
   ```

2. Prepare o projeto com `npm run setup`: ele confere o Node (24 LTS, do `.nvmrc`), roda o `npm ci`, cria o `.env` e
   mostra os próximos passos. `npm run setup -- --qa` instala também os scripts de QA.
3. Rode `npm run dev` e abra `http://localhost:4321` (a inscrição fica em `/inscricao`). Sem endpoint no `.env`, ela
   roda em modo simulado e não grava em planilha nenhuma.

Quem tem acesso de escrita ao repositório original segue o [fluxo da equipe](#fluxo-de-trabalho-da-equipe).

### Fluxo de cada mudança

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
   `hackarun-unicatolica/lp-hackarun`, preenchendo o template. A CI precisa ficar verde.
7. Um dos donos do código revisa e aprova. O merge é feito com **Squash and merge**.

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
| `sections`    | As seções da LP e das páginas `/inscricao` e `/equipes`                  |
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
- Nas prévias dos PRs a inscrição é sempre simulada (`PUBLIC_REGISTRATION_SIMULATED=true` no ambiente Preview da
  Cloudflare): dá para testar o formulário inteiro sem gravar nada. Com endpoint configurado, o endpoint ganha e a
  flag é ignorada; no build de produção sem endpoint, a flag quebra o build de propósito.
- Constantes espelhadas entre o `.gs` e o TypeScript mudam nos dois lados, e o
  `tests/infrastructure/apps-script/contract.test.ts` acusa se divergirem:
  - `CONSENT_VERSION` (aviso de privacidade) e `MIN_ELAPSED_MS` (o `MIN_FILL_MS` do `SubmitRegistration.ts`);
  - `TEAM_SIZE` (igual ao `registration.teamSize` do `event.json`);
  - `TEAM_NAME_LIMITS`, `NAME_MAX`, `STUDENT_ID_LIMITS` e `STUDENT_ID_PATTERN`, `EMAIL_MAX` e `EMAIL_PATTERN`;
  - `MAX_IMAGE_BYTES` (o teto da foto, igual ao `TEAM_IMAGE_RULES.maxBytes`).

## Checklist do PR

- [ ] `npm run validate` e `npm run format:check` passaram
- [ ] Prévia da Cloudflare conferida no desktop e no celular (o link está no comentário do bot no PR)
- [ ] Testado no celular (360 e 390px) e no desktop (1440px), com capturas das seções alteradas
      ([scripts de QA](scripts/qa/README.md): `shots`, `overflow` e `anchorcheck`)
- [ ] Mexeu no 3D: conferido com `?quality=low` e `?quality=high`, sem erro no console
- [ ] Mexeu em header, sub-navegação, rodapé ou equipes: conferido também em `/inscricao` e em `/equipes` (vazia e com
      equipes)
- [ ] Mexeu na navegação entre as páginas: o "Voltar ao evento" e o voltar do navegador devolvem a LP no mesmo ponto
- [ ] Mexeu na programação: as 4 abas conferidas, com teclado, e a versão sem JavaScript (dias empilhados)
- [ ] Mexeu no formulário: testado no modo simulado com 2 e com 5 integrantes, erros de campo, conflito de duplicado e
      o rascunho (preencher metade, ir à LP e voltar)
- [ ] Teclado e leitor de tela ok; `prefers-reduced-motion` respeitado; "Pausar animações" para tudo
- [ ] Lighthouse mobile sem regressão (acessibilidade, boas práticas e SEO em 100)
- [ ] Mudança anotada em **[Unreleased]** no [CHANGELOG.md](CHANGELOG.md)
- [ ] Sem `console.log`, sem arquivo acima de 250 linhas, sem segredo nem URL de planilha no código
