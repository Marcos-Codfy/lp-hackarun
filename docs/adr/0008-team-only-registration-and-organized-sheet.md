# ADR 0008 · Inscrição só de equipe e planilha em três abas

- **Status:** aceita
- **Data:** 2026-10-12
- **Complementa:** ADR 0004 (inscrições no Google Sheets) e ADR 0007 (fotos das equipes)

## Contexto

O documento do coordenador fechou o formato do HackaRun: o hackathon é **exclusivo para alunos da UniCatólica**,
disputado **em equipes**. O e-mail como canal oficial com as equipes é uma decisão do projeto (o documento não trata
do canal). O formulário anterior tinha duas modalidades (equipe e individual) e pedia WhatsApp, curso, período e um
campo opcional de acessibilidade (dado sensível). A planilha era uma aba só, com uma linha por inscrição e os
integrantes num texto corrido, difícil de filtrar, de conferir a foto e de juntar os e-mails para um aviso.

## Decisão

1. **Só equipe**, de 2 a 5 pessoas (`registration.teamSize` no `event.json`, igual ao `TEAM_SIZE` do
   `Validation.gs`). Cada integrante informa **nome completo, matrícula e e-mail**; o integrante 1 é o contato da
   equipe. Saíram a modalidade individual, o WhatsApp, o curso, o período e a acessibilidade.
2. **Value objects novos no domínio:** `FullName` (nome e sobrenome), `StudentId` (matrícula de 4 a 20 caracteres,
   letras, números, `.`, `-` e `/`, em maiúsculas), `Email` e `TeamMember`. O `TeamRegistration` virou
   `{ teamName, members[], teamImage }`, com `members[0]` como contato.
3. **Uma equipe por pessoa:** o servidor recusa nome de equipe, e-mail ou matrícula que já estão numa equipe não
   recusada (`duplicate_team_name`, `duplicate_email`, `duplicate_student_id`, com a posição do integrante), sem
   diferenciar caixa nem acento. Recusar uma equipe libera o nome, os e-mails e as matrículas.
4. **Planilha normalizada em três abas**, criadas e formatadas pelo `configurarPlanilha()` (idempotente, e que roda
   sozinho na primeira gravação ou quando a versão do layout muda):
   - `Equipes`: uma linha por equipe, com a miniatura da foto (`=IMAGE()`), o Status em menu
     (`pendente`/`confirmado`/`recusado`) com cor por status, e os e-mails da equipe numa célula;
   - `Integrantes`: uma linha por pessoa, com a matrícula como texto e o Status da equipe por fórmula;
   - `Resumo`: contadores ao vivo, vagas restantes e os e-mails das equipes confirmadas prontos para colar.

   Em `Equipes` e `Integrantes`: títulos fixos, filtro em todas as colunas e faixas alternadas. Os títulos e o `Resumo`
   têm proteção só de aviso.

5. **Escopos mínimos** no `appsscript.json`: só a planilha do próprio script (`spreadsheets.currentonly`) e o Drive
   (fotos). Um teste confere os escopos contra os serviços que o código chama.
6. **Contrato espelhado e testado:** os limites de nome, matrícula e e-mail, o tamanho da equipe, o tempo mínimo e o
   `CONSENT_VERSION` (`2026-10-v3`) existem nos dois lados, e `tests/infrastructure/apps-script/contract.test.ts`
   acusa se divergirem.

## Alternativas consideradas

- **Manter a modalidade individual** para formar equipes depois: a organização não pediu, e o documento fala só em
  equipes. Reabrir é possível, mas pediria regra de formação de equipe que hoje não existe.
- **Uma aba só, com uma coluna por integrante** (Nome 1, Matrícula 1...): 15 colunas quase sempre vazias, e filtrar
  uma pessoa exigiria olhar cinco colunas.
- **WhatsApp como canal:** o canal oficial é o e-mail. Telefone seria mais um dado pessoal sem finalidade.

## Consequências

- Menos dado pessoal: nada de telefone, curso ou dado sensível. A lista pública mostra só nome da equipe, foto e
  número de integrantes.
- A organização filtra pessoa, matrícula ou e-mail direto na aba `Integrantes` e manda o aviso colando a célula do
  `Resumo`.
- O formato do envio mudou: site e Apps Script sobem juntos (oito `.gs` + `appsscript.json`, nova versão da mesma
  implantação). A aba antiga `Inscricoes` deixa de ser usada.
- Os integrantes são gravados antes da linha da equipe: uma falha no meio deixa linhas órfãs em `Integrantes`, que o
  script ignora.
- O escopo `spreadsheets.currentonly` não foi verificado num Web App real antes do primeiro deploy. Se a lista pública
  der erro de permissão, a troca pelo escopo `spreadsheets` está descrita no `apps-script/README.md`.
