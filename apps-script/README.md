# Inscrições do HackaRun na planilha (Google Apps Script)

O site é estático (Cloudflare Pages) e não tem servidor. As inscrições vão para uma **planilha do Google** através de um
**Web App do Apps Script**, que é gratuito. A foto ou logo de cada equipe vai para uma pasta do **Google Drive**. O mesmo
Web App devolve a lista de **equipes confirmadas**, que aparece na página `/equipes` do site quase em tempo real.

```
site (formulário + foto) --POST--> Web App (Code.gs) --> planilha "Inscricoes"
                                                     +-> Drive: pasta "HackaRun 2026 · Fotos das equipes"
site (/equipes)          --GET ?action=teams--> só equipes com Status "confirmado" (+ id da foto)
```

## 1. Criar a planilha

1. Entre no Google Drive com a conta da organização (não use conta pessoal: ela vira a dona dos dados).
2. Crie uma planilha nova, por exemplo **HackaRun 2026 · Inscrições**.
3. Não precisa criar abas nem cabeçalho: na primeira inscrição o script cria a aba `Inscricoes` com as colunas
   `Protocolo, Data/hora, Modalidade, Equipe, Lider, E-mail, WhatsApp, Curso, Periodo, Integrantes, Qtde,
Acessibilidade, Status, Origem, Consentimento, Chave de envio, Imagem` e um menu suspenso na coluna **Status**.
4. A aba já existia de uma versão anterior? O script completa sozinho, na primeira gravação, os títulos que faltam no
   fim (**Consentimento**, **Chave de envio** e **Imagem**, colunas O, P e Q). Título que você renomeou fica como
   está.

## 2. Colar o código

1. Na planilha, abra **Extensões > Apps Script**.
2. Apague o conteúdo do `Código.gs` e cole o conteúdo de [`Code.gs`](./Code.gs).
3. Clique em **+ > Script**, dê o nome `Validation` e cole o conteúdo de [`Validation.gs`](./Validation.gs).
4. Repita com o nome `Limits` e o conteúdo de [`Limits.gs`](./Limits.gs) (prazo, capacidade e limite de envios).
5. Repita com o nome `Images` e o conteúdo de [`Images.gs`](./Images.gs) (foto ou logo das equipes no Drive).
6. (Opcional) Em **Configurações do projeto**, marque "Mostrar o arquivo de manifesto appsscript.json" e cole o
   conteúdo de [`appsscript.json`](./appsscript.json). Ele fixa o fuso `America/Araguaina` e o runtime V8.
7. Salve (Ctrl+S).
8. Autorize o Drive uma vez: com o arquivo `Images` aberto, escolha a função **`prepararFotos`** no topo do editor
   e clique em **Executar**. O Google pede permissão para o script acessar o **Google Drive** (é onde as fotos ficam)
   e a função cria a pasta das fotos (seção 7) e o segredo dos ids públicos (`ID_SEGREDO`, seção 7). O endereço da
   pasta aparece no **Registro de execução**.

> O tamanho da equipe está em `TEAM_SIZE` no `Validation.gs` (hoje 2 a 5 pessoas). Ele precisa ser igual ao
> `registration.teamSize` do arquivo `src/infrastructure/content/event.json` (o `npm test` acusa se divergir).

## 3. Publicar como Web App

1. Clique em **Implantar > Nova implantação**.
2. Em "Tipo", escolha **App da Web**.
3. **Executar como:** _Eu_ (a conta da organização). **Quem pode acessar:** _Qualquer pessoa_.
4. Clique em **Implantar** e autorize o acesso à planilha e ao Drive (o Google mostra um aviso de app não verificado:
   clique em "Avançado" e continue, o app é seu).
5. Copie a **URL do app da Web** (termina em `/exec`).
6. Teste no navegador: `URL/exec?action=health` precisa responder `{"ok":true,"open":true}` (`open: false` = as
   propriedades da seção 6 estão fechando as inscrições).

> Mudou o código? Use **Implantar > Gerenciar implantações > Editar > Nova versão**. Assim a URL continua a mesma.
> "Nova implantação" gera outra URL e o site para de enviar. Colou um `Code.gs`, `Validation.gs` ou `Images.gs` novo?
> Publique a nova versão, senão o Web App segue rodando o código antigo.
>
> **Atualizando de uma versão sem fotos:** cole os quatro arquivos, rode `prepararFotos` (passo 8 da seção 2) para
> autorizar o Drive e só então publique a nova versão. Faça isso junto com o deploy do site: o script novo só aceita o
> aviso de privacidade vigente (`CONSENT_VERSION`) e exige a foto nas inscrições de equipe.

## 4. Ligar o site na planilha

Escolha **uma** das opções:

- **Cloudflare Pages (recomendado):** no projeto, abra **Settings > Environment variables** e crie
  `PUBLIC_REGISTRATION_ENDPOINT` com a URL do passo 3. Faça um novo deploy (as variáveis entram no build).
- **No código:** coloque a URL em `registration.endpoint` no `src/infrastructure/content/event.json` e faça commit.

Sem URL, o site mostra "As inscrições abrem em breve" com o formulário desativado. Em `npm run dev` sem URL, o envio é
simulado na memória para testar a tela (e-mail começando com `falha` simula erro de rede e `duplicado` simula inscrição
repetida). As equipes inscritas na simulação aparecem em `/equipes` já confirmadas, com a foto, enquanto a aba do
navegador estiver aberta.

## 5. Confirmar uma equipe

1. Confira os dados na aba `Inscricoes`.
2. Confira a foto: a coluna **Imagem** guarda o id do arquivo no Drive. Abra
   `https://drive.google.com/file/d/<id>/view`. Na pasta das fotos o arquivo tem um nome sorteado
   (`foto-<código aleatório>.webp`), nunca o protocolo: ache pela coluna **Imagem**.
3. Na coluna **Status**, troque `pendente` por `confirmado`.
4. Em até 1 minuto a equipe aparece na página **/equipes** do site, com a foto (o script limpa o cache na hora da
   edição, mas o navegador de quem já está com o site aberto só busca de novo quando a lista volta para a tela).

O site mostra **apenas** o nome da equipe, o curso do líder, a quantidade de integrantes e a foto ou logo. Nomes,
e-mails e telefones nunca saem da planilha. Inscrições individuais (sem nome de equipe) não aparecem na lista. Equipe
sem foto (coluna **Imagem** vazia) aparece com as iniciais do nome.

### Moderação das fotos

- **Tirar uma foto do ar:** apague a célula **Imagem** da equipe. O site passa a mostrar as iniciais na hora (editar a
  coluna também limpa o cache). Pedido de exclusão (LGPD)? Apague também o arquivo no Drive e esvazie a lixeira.
- **Trocar a foto:** suba o arquivo novo na pasta das fotos, compartilhe como **Qualquer pessoa com o link · Leitor**,
  copie o id do link (`.../file/d/<id>/view`) e cole na célula **Imagem**. Use só JPG, PNG ou WebP.
- **Recusar a inscrição:** o Status `recusado` já tira a equipe (e a foto) da lista. Apague o arquivo se não for usar.
- O site só aceita na célula um id do Drive (letras, números, `_` e `-`): qualquer outra coisa vira as iniciais.

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

## 7. Fotos das equipes (Google Drive)

Na inscrição de equipe a foto ou logo é **obrigatória**. O navegador já redimensiona (até 800 px no lado maior, WebP ou
JPEG de até ~300 KB) e manda junto com o formulário. O `Images.gs` grava na pasta das fotos, definida por uma
Propriedade do script:

| Propriedade      | O que faz                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------- |
| `FOTOS_PASTA_ID` | Id da pasta das fotos. Sem ela, o script cria `HackaRun 2026 · Fotos das equipes` uma vez e guarda o id |
| `ID_SEGREDO`     | Criada sozinha. Segredo do id público de cada equipe na lista do site. Não apague nem compartilhe       |

- **Usar uma pasta que já existe:** abra a pasta no Drive, copie o id da URL (`.../folders/<id>`) e crie a propriedade
  `FOTOS_PASTA_ID` em **Configurações do projeto > Propriedades do script**. A conta que publica o Web App precisa
  poder editar a pasta.
- **Nome do arquivo:** sorteado (`foto-<código aleatório>.webp`). Nunca o protocolo, que identifica a inscrição
  (troca de foto e pedidos da LGPD) e não pode vazar pelo link público, e nunca algo digitado no formulário. A coluna
  **Imagem** liga a linha ao arquivo.
- **Id público da equipe (`ID_SEGREDO`):** a lista do site mostra um id por equipe (`team-3f9a0c12bd`) que sai do
  protocolo misturado com esse segredo. Sem ele, dava para testar todos os protocolos possíveis e descobrir o de cada
  equipe. Apagar ou trocar a propriedade só muda os ids da lista (nada se perde), mas não faça isso à toa.
- **Compartilhamento:** cada arquivo fica como **Qualquer pessoa com o link · Leitor**, porque o site mostra a foto pelo
  endereço público do Google (`lh3.googleusercontent.com`). O id só aparece no site depois da confirmação. Nunca
  compartilhe a **planilha** assim: só as fotos.
- **Conta institucional que bloqueia link público:** a inscrição entra do mesmo jeito, o bloqueio vai para o
  **Registro de execução** e o site mostra as iniciais. Peça ao administrador do Google Workspace para liberar
  compartilhamento externo nessa pasta, ou compartilhe os arquivos à mão depois.
- **Drive fora do ar ou cota estourada:** a inscrição também entra, com a coluna **Imagem** vazia e o erro no log. A
  organização pede a foto pelo contato e cola o id depois (seção 5).
- **Reenvio:** a foto só sobe depois das checagens de reenvio e de e-mail repetido, então o "Tentar de novo" do site e
  os reenvios automáticos nunca criam um segundo arquivo. Se a planilha falhar depois do upload, a foto vai para a
  lixeira e o reenvio grava outra.
- **Fila do lock:** o upload roda dentro do lock, depois das checagens de reenvio, de e-mail repetido, do limite de
  envios e da capacidade (assim nenhum desses casos sobe arquivo à toa). O link público é ligado logo depois de soltar
  o lock, para a próxima inscrição não esperar essa ida a mais ao Drive.

## Proteções que o script já faz

- **Primeiro filtro:** campo isca (honeypot) e tempo mínimo de 3s no formulário. Os dois vêm do navegador, então
  só barram robô bobo; os limites abaixo continuam valendo para quem chama a URL direto.
- Validação completa no servidor (nome, e-mail, WhatsApp, curso, tamanho da equipe, e-mails repetidos e
  consentimento na versão vigente do aviso).
- **Foto:** base64 que decodifica, até 400 KB, só JPEG, PNG ou WebP conferidos pelos primeiros bytes do arquivo (e o
  tipo declarado precisa bater com eles). Arquivo fora disso recusa a inscrição antes de tocar no Drive.
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

Os testes rodam o `Code.gs`, o `Validation.gs`, o `Limits.gs` e o `Images.gs` de verdade no Node, com dublês dos
serviços do Google (planilha, cache, lock, propriedades e Drive): `npx vitest run tests/infrastructure/apps-script`.

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
| Drive (conta gratuita)          | 15 GB; cada foto tem até 400 KB (100 equipes ≈ 30 MB)     |

Contas Google Workspace (institucionais) têm limites maiores. Se o site receber o erro de "muita gente se inscrevendo",
ele mesmo tenta de novo com espera crescente. A lista de equipes fica em cache por 60s para economizar cota.

## LGPD

- O aviso de privacidade fica em `/privacidade` (`src/pages/privacidade.astro`), linkado no checkbox de
  consentimento e no rodapé. Mudou o texto do aviso? Suba `CONSENT_VERSION` em
  `src/application/use-cases/SubmitRegistration.ts` **e** no `Validation.gs` (um teste confere que são iguais) e
  publique o script junto com o site: o servidor recusa aceite de versão antiga.
- Cada linha guarda a prova do aceite na coluna **Consentimento**: versão do aviso + data/hora do aceite. Sem isso o
  script recusa a inscrição.
- A planilha guarda dados pessoais: compartilhe **só** com quem organiza e nunca deixe "qualquer pessoa com o link".
  O Google atua como operador (hospeda a planilha e roda o script).
- A coluna **Acessibilidade** é dado sensível: use só para garantir a acessibilidade da pessoa no evento.
- Use os dados só para o HackaRun (contato, credenciamento, certificados). O site público mostra apenas nome da
  equipe, curso, quantidade de integrantes e a foto ou logo.
- **Foto da equipe:** é dado pessoal (imagem das pessoas). O aceite da versão `2026-10-v2` inclui a autorização de
  publicar a imagem e a declaração do líder de que todos que aparecem nela concordaram. Pedido de retirada: seção 5.
- **Retenção:** até 6 meses depois do evento. Depois disso, apague a planilha e a pasta das fotos (ou anonimize o que
  precisar guardar para estatística).
- Pedidos de acesso, correção, exclusão ou revogação do consentimento chegam pelo contato do encarregado (a definir
  pela organização e publicado no aviso): localize pelo e-mail ou pelo protocolo e atenda em até 15 dias.
