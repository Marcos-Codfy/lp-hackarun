# Inscrições do HackaRun na planilha (Google Apps Script)

O site é estático (Cloudflare Pages) e não tem servidor. As inscrições vão para uma **planilha do Google** através de um
**Web App do Apps Script**, que é gratuito. O mesmo Web App devolve a lista de **equipes confirmadas**, que aparece no
site quase em tempo real.

```
site (formulário) --POST--> Web App (Code.gs) --> planilha "Inscricoes"
site (lista)      --GET ?action=teams--> só equipes com Status "confirmado"
```

## 1. Criar a planilha

1. Entre no Google Drive com a conta da organização (não use conta pessoal: ela vira a dona dos dados).
2. Crie uma planilha nova, por exemplo **HackaRun 2026 · Inscrições**.
3. Não precisa criar abas nem cabeçalho: na primeira inscrição o script cria a aba `Inscricoes` com as colunas
   `Protocolo, Data/hora, Modalidade, Equipe, Lider, E-mail, WhatsApp, Curso, Periodo, Integrantes, Qtde,
Acessibilidade, Status, Origem, Consentimento, Chave de envio` e um menu suspenso na coluna **Status**.
4. A aba já existia de uma versão anterior? Escreva `Consentimento` no cabeçalho da coluna **O** (a primeira vazia).
   A coluna **Chave de envio** (P) o script completa sozinho na primeira gravação.

## 2. Colar o código

1. Na planilha, abra **Extensões > Apps Script**.
2. Apague o conteúdo do `Código.gs` e cole o conteúdo de [`Code.gs`](./Code.gs).
3. Clique em **+ > Script**, dê o nome `Validation` e cole o conteúdo de [`Validation.gs`](./Validation.gs).
4. Repita com o nome `Limits` e o conteúdo de [`Limits.gs`](./Limits.gs) (prazo, capacidade e limite de envios).
5. (Opcional) Em **Configurações do projeto**, marque "Mostrar o arquivo de manifesto appsscript.json" e cole o
   conteúdo de [`appsscript.json`](./appsscript.json). Ele fixa o fuso `America/Araguaina` e o runtime V8.
6. Salve (Ctrl+S).

> O tamanho da equipe está em `TEAM_SIZE` no `Validation.gs` (hoje 2 a 5 pessoas). Ele precisa ser igual ao
> `registration.teamSize` do arquivo `src/infrastructure/content/event.json` (o `npm test` acusa se divergir).

## 3. Publicar como Web App

1. Clique em **Implantar > Nova implantação**.
2. Em "Tipo", escolha **App da Web**.
3. **Executar como:** _Eu_ (a conta da organização). **Quem pode acessar:** _Qualquer pessoa_.
4. Clique em **Implantar** e autorize o acesso à planilha (o Google mostra um aviso de app não verificado: clique em
   "Avançado" e continue, o app é seu).
5. Copie a **URL do app da Web** (termina em `/exec`).
6. Teste no navegador: `URL/exec?action=health` precisa responder `{"ok":true,"open":true}` (`open: false` = as
   propriedades da seção 6 estão fechando as inscrições).

> Mudou o código? Use **Implantar > Gerenciar implantações > Editar > Nova versão**. Assim a URL continua a mesma.
> "Nova implantação" gera outra URL e o site para de enviar. Colou um `Code.gs` ou `Validation.gs` novo? Publique a
> nova versão, senão o Web App segue rodando o código antigo.

## 4. Ligar o site na planilha

Escolha **uma** das opções:

- **Cloudflare Pages (recomendado):** no projeto, abra **Settings > Environment variables** e crie
  `PUBLIC_REGISTRATION_ENDPOINT` com a URL do passo 3. Faça um novo deploy (as variáveis entram no build).
- **No código:** coloque a URL em `registration.endpoint` no `src/infrastructure/content/event.json` e faça commit.

Sem URL, o site mostra "As inscrições abrem em breve" com o formulário desativado. Em `npm run dev` sem URL, o envio é
simulado na memória para testar a tela (e-mail começando com `falha` simula erro de rede e `duplicado` simula inscrição
repetida).

## 5. Confirmar uma equipe

1. Confira os dados na aba `Inscricoes`.
2. Na coluna **Status**, troque `pendente` por `confirmado`.
3. Em até 1 minuto a equipe aparece na seção **Equipes** do site (o script limpa o cache na hora da edição, mas o
   navegador de quem já está com o site aberto só busca de novo quando a seção volta para a tela).

O site mostra **apenas** o nome da equipe, o curso do líder e a quantidade de integrantes. Nomes, e-mails e telefones
nunca saem da planilha. Inscrições individuais (sem nome de equipe) não aparecem na lista.

## 6. Prazo e capacidade (Propriedades do script)

O site fecha o formulário no build, mas qualquer um pode chamar a URL do Web App direto. Por isso o script confere
prazo e capacidade **a cada envio** e responde `{"ok":false,"error":"closed"}` quando não dá mais.

Em **Configurações do projeto > Propriedades do script**, crie as que precisar:

| Propriedade           | Exemplo                     | O que faz                                                                   |
| --------------------- | --------------------------- | --------------------------------------------------------------------------- |
| `CLOSES_AT`           | `2026-11-08T23:59:00-03:00` | Prazo final. Data ISO **com hora e fuso** (`-03:00` é o horário de Palmas)  |
| `CAPACITY`            | `30`                        | Máximo de equipes. Conta as linhas `Equipe` que não estão `recusado`        |
| `INSCRICOES_FECHADAS` | `sim`                       | Fecha na hora, sem mexer no site. Para reabrir, apague ou troque para `nao` |

- Lotou a `CAPACITY`, fecha pra todo mundo (equipe e individual), igual ao site. Recusar uma equipe na coluna
  **Status** libera a vaga.
- Valor torto (`CLOSES_AT=8 de novembro`, `CAPACITY=trinta`) **fecha** as inscrições e grava o erro no log de
  execuções: melhor errar pro lado seguro. Depois de mexer, confira `URL/exec?action=health`.
- Mantenha `CLOSES_AT` e `CAPACITY` iguais a `registration.closesAt` e `registration.capacity` do `event.json`.

## Proteções que o script já faz

- **Primeiro filtro:** campo isca (honeypot) e tempo mínimo de 3s no formulário. Os dois vêm do navegador, então
  só barram robô bobo; os limites abaixo continuam valendo para quem chama a URL direto.
- Validação completa no servidor (nome, e-mail, WhatsApp, curso, tamanho da equipe, e-mails repetidos e
  consentimento).
- **Limite por e-mail:** no máximo 10 tentativas a cada 10 min por e-mail do líder (guardado como hash no cache,
  nunca em texto). Cobre os reenvios automáticos do site e segura quem fica testando se um e-mail já está inscrito.
- **Limite global:** 120 envios por minuto. Como o e-mail esbarra no próprio limite antes, um script repetindo o
  mesmo e-mail não consegue travar a fila de todo mundo.
- `LockService` em volta da gravação: duas inscrições ao mesmo tempo não se atropelam.
- Bloqueio de inscrição repetida pelo e-mail do líder.
- Cada formulário manda uma chave de envio (UUID): reenvio com a mesma chave e o mesmo e-mail (automático ou pelo
  "Tentar de novo") recebe o mesmo protocolo, mesmo depois de o cache expirar. Erro interno responde `server`, que o
  site trata como passageiro.
- Proteção contra fórmulas injetadas na planilha (`=`, `+`, `-`, `@`).
- Prazo e capacidade conferidos a cada envio (seção 6).

Os testes rodam o `Code.gs`, o `Validation.gs` e o `Limits.gs` de verdade no Node, com dublês dos serviços do
Google: `npx vitest run tests/infrastructure/apps-script`.

### Próximo passo recomendado: Cloudflare Turnstile

Um robô que gera e-mails diferentes ainda consegue gastar o limite global. O passo seguinte é o
[Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) (gratuito, sem quebra-cabeça de imagem):

1. A organização cria o widget no painel da Cloudflare e recebe a **site key** (pública) e a **secret key**.
2. O site mostra o widget no formulário e manda o token junto com a inscrição.
3. O `doPost` valida o token com `UrlFetchApp` em `https://challenges.cloudflare.com/turnstile/v0/siteverify`,
   usando a secret key guardada numa Propriedade do script (nunca no código).
4. O `public/_headers` precisa liberar `https://challenges.cloudflare.com` em `script-src` e `frame-src`.

Fica pendente até a organização gerar as chaves.

## Cotas do plano gratuito (conta Google comum)

| Recurso                         | Limite aproximado                                         |
| ------------------------------- | --------------------------------------------------------- |
| Tempo por execução              | 6 min (cada inscrição leva menos de 1s)                   |
| Execuções simultâneas           | 30 (o lock coloca o resto na fila)                        |
| Gatilhos (o `onEdit` do Status) | 90 min por dia no total; cada edição leva milissegundos   |
| Planilha                        | 10 milhões de células (sobra para milhares de inscrições) |

Contas Google Workspace (institucionais) têm limites maiores. Se o site receber o erro de "muita gente se inscrevendo",
ele mesmo tenta de novo com espera crescente. A lista de equipes fica em cache por 60s para economizar cota.

## LGPD

- O aviso de privacidade fica em `/privacidade` (`src/pages/privacidade.astro`), linkado no checkbox de
  consentimento e no rodapé. Mudou o texto do aviso? Suba `CONSENT_VERSION` em
  `src/application/use-cases/SubmitRegistration.ts`.
- Cada linha guarda a prova do aceite na coluna **Consentimento**: versão do aviso + data/hora do aceite. Sem isso o
  script recusa a inscrição.
- A planilha guarda dados pessoais: compartilhe **só** com quem organiza e nunca deixe "qualquer pessoa com o link".
  O Google atua como operador (hospeda a planilha e roda o script).
- A coluna **Acessibilidade** é dado sensível: use só para garantir a acessibilidade da pessoa no evento.
- Use os dados só para o HackaRun (contato, credenciamento, certificados). O site público mostra apenas nome da
  equipe, curso e quantidade de integrantes.
- **Retenção:** até 6 meses depois do evento. Depois disso, apague a planilha (ou anonimize o que precisar guardar
  para estatística).
- Pedidos de acesso, correção, exclusão ou revogação do consentimento chegam pelo contato do encarregado (a definir
  pela organização e publicado no aviso): localize pelo e-mail ou pelo protocolo e atenda em até 15 dias.
