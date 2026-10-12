# ADR 0004 · Inscrições no Google Sheets via Apps Script

- **Status:** aceita
- **Data:** 2026-10-10

## Contexto

As inscrições devem ser feitas no próprio site, sem custo, e os dados devem ficar numa planilha do Google Drive da
organização.

## Decisão

Um **Google Apps Script publicado como Web App** recebe o `POST` do formulário e grava na planilha. Uma rota `GET`
devolve só as equipes com Status `confirmado` (nome, curso e quantidade), que o site mostra ao vivo.

- O cliente envia `Content-Type: text/plain` (requisição simples, sem preflight CORS, que o Apps Script não responde).
- Validação no domínio (navegador) **e** no script (servidor).
- Anti-spam: honeypot + tempo mínimo de preenchimento. `LockService` evita gravações concorrentes.
- Retry com backoff no cliente pra falhas de rede e limite de cota; cache de 60s na lista de equipes.

## Alternativas

- **Google Forms embutido:** não segue o visual e não permite validação/UX próprias.
- **Formspree/Getform:** cotas baixas no plano grátis e dados fora do Drive.
- **Cloudflare Worker + D1:** possível e gratuito, mas a organização perderia a planilha como painel.

## Consequências

- Custo zero e a planilha já é o painel da organização.
- Cotas do Apps Script (execuções simultâneas por conta) são suficientes pro volume de um hackathon. Picos são
  absorvidos pelo retry.
- A URL do Web App é pública por natureza; a proteção está nas validações e no anti-spam.

> **Atualização (2026-10-12):** a inscrição de equipe leva a foto ou logo, que o script grava no Google Drive, e a
> rota `GET` passou a devolver também o id da foto das equipes confirmadas (ADR 0007).

> **Atualização (2026-10-12, rodada 3):** a inscrição passou a ser **só de equipe** e a planilha ganhou três abas
> (`Equipes`, `Integrantes` e `Resumo`), montadas pelo próprio script. A rota `GET` devolve só nome, quantidade de
> integrantes e id da foto das equipes confirmadas (o curso saiu). Decisão e motivos na ADR 0008.
