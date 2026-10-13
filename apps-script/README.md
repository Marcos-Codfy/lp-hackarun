# Inscrições do HackaRun na planilha (Google Apps Script)

O site é estático (Cloudflare Pages) e não tem servidor. As inscrições das equipes vão para uma **planilha do Google**
através de um **Web App do Apps Script**, que é gratuito. A foto ou logo de cada equipe vai para uma pasta do
**Google Drive**. O mesmo Web App devolve a lista de **equipes confirmadas**, que aparece na página `/equipes` do site
quase em tempo real.

```
site (formulário + foto) --POST--> Web App --> aba "Equipes"      (1 linha por equipe, com a foto e os integrantes)
                                           +-> aba "Integrantes"  (1 linha por pessoa: nome, matrícula, e-mail)
                                           +-> Drive: pasta das fotos (FOTOS_PASTA_ID)
site (/equipes)          --GET ?action=teams--> só equipes com Status "confirmado": nome, nº de integrantes e foto
```

A inscrição é **só de equipe** (de 2 a 5 pessoas, todas alunas da UniCatólica). Cada integrante informa nome
completo, matrícula e e-mail; o integrante 1 é o **contato da equipe**. A comunicação oficial do HackaRun é **por
e-mail** (não usamos WhatsApp).

## 1. Criar (ou abrir) a planilha

1. Entre no Google Drive com a **conta da organização** (não use conta pessoal: ela vira a dona dos dados).
2. Crie uma planilha nova, por exemplo **HackaRun 2026 · Inscrições** (ou abra a que já existe).
3. Não crie abas nem títulos: o script monta tudo (seção 4). Se a planilha for nova, a primeira aba vazia
   (`Página1` ou `Sheet1`) vira a aba **Equipes**. Uma aba que já tem dados nunca é renomeada nem apagada.

## 2. Colar o código

1. Na planilha, abra **Extensões > Apps Script**. O projeto aberto fica ligado a esta planilha.
2. Dê um nome ao projeto (topo da tela), por exemplo **HackaRun 2026 · Inscrições**.
3. Apague o conteúdo do `Código.gs` e cole o conteúdo de [`Code.gs`](./Code.gs). Se quiser, renomeie o arquivo
   para `Code` (o nome não muda nada, só ajuda a achar).
4. Para cada arquivo abaixo, clique em **+ > Script**, digite o nome (sem o `.gs`) e cole o conteúdo:

   | Nome do arquivo | O que faz                                                                        |
   | --------------- | -------------------------------------------------------------------------------- |
   | `Validation`    | Regras do servidor (iguais às do site), consentimento e proteção contra fórmula  |
   | `Limits`        | Prazo, capacidade e limite de envios                                             |
   | `Images`        | Foto ou logo da equipe no Drive                                                  |
   | `Sheets`        | Colunas das abas e a gravação de cada inscrição                                  |
   | `Registry`      | Quem já está inscrito: nome de equipe, e-mails e matrículas repetidos            |
   | `Setup`         | `configurarPlanilha()`: cria e formata as abas (filtros, cores, menus, proteção) |
   | `Summary`       | Aba **Resumo**: contadores ao vivo e o passo a passo da organização              |

5. Mostre o manifesto: **Configurações do projeto** (ícone de engrenagem) > marque **Mostrar arquivo de manifesto
   "appsscript.json" no editor**. Volte ao **Editor**, abra o `appsscript.json` e troque todo o conteúdo pelo de
   [`appsscript.json`](./appsscript.json). Ele fixa o fuso `America/Araguaina`, o runtime V8, o log de erros e os
   **escopos mínimos**: só esta planilha (`spreadsheets.currentonly`) e o Drive (`drive`, para as fotos).
6. Salve (Ctrl+S). O editor não pode mostrar erro em vermelho.

> O tamanho da equipe está em `TEAM_SIZE` no `Validation.gs` (hoje 2 a 5 pessoas). Ele precisa ser igual ao
> `registration.teamSize` do `src/infrastructure/content/event.json` (o `npm test` acusa se divergir).

## 3. Propriedades do script

Em **Configurações do projeto > Propriedades do script > Adicionar propriedade do script**, crie as que precisar
(nome à esquerda, valor à direita) e clique em **Salvar propriedades do script**:

| Propriedade           | Exemplo                     | O que faz                                                                         |
| --------------------- | --------------------------- | --------------------------------------------------------------------------------- |
| `FOTOS_PASTA_ID`      | `1AbC...xyz`                | Pasta do Drive das fotos. Id = o final da URL da pasta (`.../folders/<id>`)       |
| `CLOSES_AT`           | `2026-11-08T23:59:00-03:00` | Prazo final. Data ISO **com hora e fuso** (`-03:00` é o horário de Palmas)        |
| `CAPACITY`            | `30`                        | Máximo de equipes. Conta as que não estão `recusado`                              |
| `INSCRICOES_FECHADAS` | `sim`                       | Fecha na hora, sem mexer no site. Para reabrir, apague ou troque para `nao`       |
| `ID_SEGREDO`          | (criada sozinha)            | Segredo dos ids públicos das equipes. Não apague nem compartilhe                  |
| `PLANILHA_VERSAO`     | (criada sozinha)            | Versão do layout já aplicado. Apagar faz a próxima inscrição refazer a formatação |

- **Sem `FOTOS_PASTA_ID`**, o script cria a pasta `HackaRun 2026 · Fotos das equipes` no Drive de quem publica e
  guarda o id sozinho. A conta que publica o Web App precisa poder **editar** a pasta escolhida.
- Valor torto (`CLOSES_AT=8 de novembro`, `CAPACITY=trinta`) **fecha** as inscrições e grava o erro no log: melhor
  errar pro lado seguro. Mantenha `CLOSES_AT` e `CAPACITY` iguais ao `registration` do `event.json`.

## 4. Montar a planilha e autorizar

1. No editor, abra o arquivo `Setup`, escolha a função **`configurarPlanilha`** no seletor do topo e clique em
   **Executar**.
2. O Google pede autorização. Escolha a conta da organização. Vai aparecer **"O Google não verificou este app"**:
   clique em **Avançado > Acessar HackaRun... (não seguro)** e depois em **Permitir**. O app é seu; o aviso aparece
   para todo script que não passou pela verificação do Google. As permissões pedidas são só **esta planilha** e o
   **Google Drive** (para as fotos).
3. No **Registro de execução** aparecem as abas criadas e o endereço da pasta das fotos. Na planilha agora existem:
   - **Equipes**: Protocolo, Data/hora, Equipe, Integrantes (qtd), **Foto** (miniatura dentro da célula, pela
     fórmula `=IMAGE()`), **Status** (menu `pendente` / `confirmado` / `recusado`), **Integrantes** (a equipe
     inteira numa célula, uma pessoa por linha: `1. Nome completo · Matrícula · E-mail (contato)`, na ordem da
     inscrição), E-mail de contato, E-mails da equipe (separados por `; `), Link da foto (abre no Drive), ID da
     foto, Origem, Consentimento, Chave de envio.
   - **Integrantes**: Protocolo, Equipe, Nº, Nome completo, Matrícula, E-mail, Contato (`sim`/`não`) e **Status da
     equipe** (fórmula que busca o Status na aba Equipes).
   - **Resumo**: equipes inscritas, confirmadas, pendentes, recusadas, total de integrantes, vagas restantes (com
     `CAPACITY`) e os e-mails das equipes confirmadas numa célula só, prontos para colar.
4. Já vem tudo formatado: títulos fixos com fundo escuro, coluna da equipe congelada, filtro em todas as colunas,
   faixas alternadas, cor por status (pendente âmbar, confirmado verde, recusado vermelho, linha recusada apagada),
   data no formato `dd/MM/aaaa HH:mm`, matrícula como texto (o zero à esquerda não some) e aviso ao editar um título.
5. Na primeira foto, a planilha mostra a faixa amarela **"algumas fórmulas estão tentando enviar e receber dados de
   terceiros"**: clique em **Permitir acesso**. Sem isso a coluna Foto fica em `#REF!` (é o `=IMAGE()` buscando a
   miniatura no Google). Basta uma vez por planilha.

> Pode rodar `configurarPlanilha` de novo quando quiser (depois de mudar a `CAPACITY`, por exemplo): não apaga dado
> nem duplica filtro, faixa ou proteção, e refaz as fórmulas das linhas que já existem. Se esquecer de rodar, a
> primeira inscrição monta a planilha sozinha, mas a autorização do Drive precisa ter sido feita antes (passo 2).
>
> As fórmulas saem no idioma da planilha: em português (e em todo idioma de vírgula decimal) o argumento se separa
> com `;`, e o script troca a vírgula sozinho. Mudou o idioma em **Arquivo > Configurações**? Rode
> `configurarPlanilha` de novo.

## 5. Publicar como Web App

1. Clique em **Implantar > Nova implantação**.
2. Em **Selecionar tipo** (engrenagem), escolha **App da Web**.
3. **Descrição:** `v1`. **Executar como:** _Eu (conta da organização)_. **Quem pode acessar:** _Qualquer pessoa_.
4. Clique em **Implantar** (se pedir, autorize de novo como no passo 4.2).
5. Copie a **URL do app da Web** (termina em `/exec`).
6. Teste no navegador: `URL/exec?action=health` precisa responder `{"ok":true,"open":true}` (`open: false` = as
   propriedades da seção 3 estão fechando as inscrições). `URL/exec?action=teams` responde `{"ok":true,"teams":[]}`.

> O `teams` respondeu erro de permissão na planilha (o Registro de execução mostra a mensagem)? No
> `appsscript.json`, troque o escopo `spreadsheets.currentonly` por `https://www.googleapis.com/auth/spreadsheets`,
> salve, rode `configurarPlanilha` de novo para autorizar e publique uma nova versão (seção 7).

## 6. Ligar o site na planilha

Escolha **uma** das opções:

- **Cloudflare Pages (o caminho do site oficial):** no projeto, abra **Settings > Variables and Secrets** (em telas
  antigas, **Environment variables**), escolha o ambiente **Production** e crie `PUBLIC_REGISTRATION_ENDPOINT` com a
  URL `/exec` do passo 5. Depois, **Deployments > Retry deployment** no último deploy de produção (as variáveis entram
  no build). Nunca no ambiente Preview: as prévias dos PRs rodam simuladas e não gravam na planilha. Passo a passo no
  guia do projeto, seção 16.7.
- **No código, só num fork seu com planilha de teste:** coloque a URL em `registration.endpoint` no
  `src/infrastructure/content/event.json`. No repositório oficial, nunca: ele é público e a URL iria junto.

Sem URL, o site mostra "As inscrições abrem em breve" com o formulário desativado. Em `npm run dev` sem URL, o envio é
simulado na memória para testar a tela: e-mail de contato começando com `falha` simula erro de rede, `servidor` o
script caindo e `duplicado` inscrição repetida; nome de equipe, e-mail ou matrícula repetidos entre as equipes da
simulação dão o mesmo erro no campo que o script de verdade. As equipes simuladas aparecem em `/equipes` já
confirmadas, com a foto, enquanto a aba do navegador estiver aberta. As prévias da Cloudflare rodam igual, ligadas
pela variável `PUBLIC_REGISTRATION_SIMULATED=true` do ambiente Preview.

## 7. Mudou o código? Publique uma nova versão

1. Cole os arquivos que mudaram (e crie os novos, se houver) e salve.
2. **Implantar > Gerenciar implantações** > selecione a implantação ativa > **Editar** (lápis) > em **Versão**,
   escolha **Nova versão** > **Implantar**. A URL continua a mesma.
3. **Nunca** use "Nova implantação" para atualizar: ela gera outra URL e o site para de enviar.
4. Mudou `CONSENT_VERSION`, colunas ou regras? Publique o script **junto com o deploy do site**: o script só aceita o
   aviso de privacidade vigente e o formato de envio atual.

> **Vindo da versão com a aba `Inscricoes`** (modalidade individual, WhatsApp, curso): a aba antiga não é mais usada.
> Cole os oito arquivos, rode `configurarPlanilha` e publique a nova versão. Depois apague a aba `Inscricoes`.

### Atualizando para a coluna Integrantes (layout 6)

A aba **Equipes** ganhou a coluna **Integrantes**, logo depois do **Status**. Mudaram só `Code.gs`, `Sheets.gs`,
`Setup.gs` e `Summary.gs`.

1. Cole os quatro arquivos por cima dos que estão no editor e salve.
2. Publique a nova versão (passo 2 acima: **Gerenciar implantações > Editar > Nova versão**).
3. Logo em seguida, rode `configurarPlanilha` uma vez. Se esquecer, a próxima inscrição faz a mesma coisa sozinha.

Faça nessa ordem. A versão publicada antes não conhece a coluna nova: se ela receber uma inscrição depois da
migração, grava os dados nas colunas erradas. Entre o passo 2 e o 3, a lista pública (`?action=teams`) sai sem as
fotos (o site mostra as iniciais): confira ela só depois do passo 3. Para não correr risco nenhum, crie a propriedade
`INSCRICOES_FECHADAS=sim` antes do passo 1 e apague depois do passo 3 (o site mostra inscrições fechadas por esses
poucos minutos).

O que o `configurarPlanilha` faz na planilha que já tem equipes:

- **Insere** uma coluna de verdade depois do Status (igual a **Inserir 1 coluna à direita**): o que estava da coluna G
  em diante anda uma coluna para a direita e nenhum dado é sobrescrito.
- **Preenche** a célula Integrantes de cada equipe que já existe com as pessoas da aba **Integrantes** (pelo
  Protocolo, na ordem do Nº).
- Refaz as fórmulas (Foto, Link da foto, Status da equipe e o Resumo) com as letras novas. O filtro, as faixas, as
  cores e o aviso dos títulos passam a cobrir a coluna nova. Se o filtro for refeito, os critérios que estavam
  aplicados nele somem (os dados ficam).
- Rodar de novo não insere outra coluna. Ele só preenche as células Integrantes que estiverem vazias.

Depois de migrar, **não volte** para uma implantação antiga: ela grava no layout anterior.

## 8. Rotina da organização

### Confirmar uma equipe

1. Na aba **Equipes**, confira os dados e a **Foto** (a miniatura aparece na própria célula; o **Link da foto** abre
   no Drive).
2. Confira as pessoas na coluna **Integrantes** da própria linha (nome, matrícula e e-mail de cada uma; a primeira é o
   contato). Para filtrar por pessoa, use a aba **Integrantes**.
3. Na coluna **Status**, troque `pendente` por `confirmado`.
4. Em até 1 minuto a equipe aparece em **/equipes** e no contador do site, só com **nome, foto e número de
   integrantes**. Nomes, matrículas e e-mails nunca saem da planilha.

`recusado` tira a equipe do site e **libera** a vaga, o nome da equipe, os e-mails e as matrículas (podem se inscrever
de novo).

### Filtrar

- Clique no ícone de filtro de qualquer título. Na aba **Equipes**: por Status, Equipe, data...
- Na aba **Integrantes**: por pessoa, **Matrícula**, **E-mail**, Contato ou **Status da equipe** (a coluna acompanha a
  aba Equipes sozinha).
- Para não atrapalhar quem está olhando junto, use uma visualização filtrada (**Dados > Visualizações filtradas**).

### Corrigir um integrante

A célula **Integrantes** da aba Equipes é texto e não acompanha a aba Integrantes sozinha. Corrigiu um nome, uma
matrícula ou um e-mail na aba **Integrantes**? Apague a célula **Integrantes** da equipe e rode `configurarPlanilha`:
ela é refeita com os dados da aba. Se o e-mail mudou, corrija também **E-mail de contato** e **E-mails da equipe**.

### Mandar e-mail para as equipes

- Aba **Resumo**: a célula de **E-mails das equipes confirmadas** já junta todos os endereços com `; `. Copie e cole
  no campo **Para** (ou **Cco**, para ninguém ver o e-mail de ninguém) do Gmail. Há também a lista de todas as
  inscritas (menos as recusadas).
- Para uma equipe só: copie a célula **E-mails da equipe** da linha dela.

### Moderação das fotos

- **Tirar uma foto do ar:** apague a célula **ID da foto**. A miniatura some e o site passa a mostrar as iniciais na
  hora (editar a coluna também limpa o cache).
- **Pedido de remoção (LGPD) ou imagem imprópria:** antes de apagar a célula, abra o **Link da foto**, mova o arquivo
  para a lixeira do Drive e esvazie a lixeira. Só apagar a célula não basta: o arquivo continua compartilhado por link
  e o endereço dele já passou pelo site (`?action=teams`).
- **Trocar a foto:** suba o arquivo novo na pasta das fotos, compartilhe como **Qualquer pessoa com o link · Leitor**,
  copie o id do link (`.../file/d/<id>/view`) e cole na célula **ID da foto**. Use só JPG, PNG ou WebP.
- O site só aceita na célula um id do Drive (letras, números, `_` e `-`): qualquer outra coisa vira as iniciais.
- Na pasta, o arquivo tem nome sorteado (`foto-<código aleatório>.webp`), nunca o protocolo: ache pela coluna **ID da
  foto**.

## Proteções que o script já faz

- **Primeiro filtro:** campo isca (honeypot) e tempo mínimo de 3 s no formulário. Os dois vêm do navegador, então só
  barram robô bobo; os limites abaixo continuam valendo para quem chama a URL direto.
- **Validação completa no servidor**, igual à do site (um teste roda os dois lados): nome da equipe de 2 a 40
  caracteres; de 2 a 5 integrantes; nome completo com nome e sobrenome; matrícula de 4 a 20 caracteres (letras,
  números, `.`, `-` e `/`, gravada em maiúsculas); e-mail válido; nada de e-mail ou matrícula repetidos na equipe;
  foto obrigatória; consentimento na versão vigente do aviso.
- **Uma equipe por pessoa:** nome de equipe já usado (sem diferenciar acento e caixa), e-mail ou matrícula que já
  estão em outra equipe não recusada voltam `duplicate_team_name`, `duplicate_email` ou `duplicate_student_id`, com a
  posição de cada integrante; o site marca o campo certo.
- **Reenvio sem duplicar:** cada formulário manda uma chave de envio (UUID). A mesma chave com o mesmo contato recebe
  o mesmo protocolo, pelo cache (10 min) e depois pela coluna **Chave de envio**.
- **Limite por e-mail:** até 10 tentativas a cada 10 min por e-mail de contato (guardado como hash no cache, nunca em
  texto). **Limite global:** 120 envios por minuto.
- `LockService` em volta da gravação: duas inscrições ao mesmo tempo não se atropelam. Os integrantes são gravados
  antes da equipe: se algo cair no meio, a linha órfã em Integrantes é ignorada.
- **Foto:** base64 que decodifica, até 400 KB, só JPEG, PNG ou WebP conferidos pelos primeiros bytes. Sobe só depois
  das checagens de reenvio e de duplicado (retry nunca cria um segundo arquivo); se a planilha falhar depois, vai para
  a lixeira. Drive fora do ar ou link público bloqueado pelo domínio: a inscrição entra do mesmo jeito e o erro vai
  para o log.
- **Fórmula injetada:** texto digitado começando com `=`, `+`, `-` ou `@` vira texto puro. As únicas fórmulas da
  planilha são as do próprio script (`IMAGE`, `HYPERLINK`, a busca do Status e o Resumo).
- Prazo e capacidade conferidos a cada envio; lista pública com cache de 60 s (o `onEdit` limpa quando Status, nome,
  quantidade ou foto mudam).

Os testes rodam todos os `.gs` de verdade no Node, com dublês dos serviços do Google (planilha com várias abas,
fórmulas, filtros, cache, lock, propriedades e Drive): `npx vitest run tests/infrastructure/apps-script`.

## Para quem faz fork: fluxo com clasp (opcional)

O [clasp](https://github.com/google/clasp) envia esta pasta direto para o Apps Script, sem copiar e colar:

1. `npm install -g @google/clasp` e `clasp login` (abre o navegador para autorizar).
2. Ative a API em <https://script.google.com/home/usersettings> (**Google Apps Script API: ativada**).
3. Crie a planilha e o projeto ligado a ela (seções 1 e 2.1) e copie o **ID do script** em **Configurações do
   projeto**.
4. Na pasta `apps-script/`, crie um `.clasp.json` (não versione):
   `{ "scriptId": "<ID do script>", "rootDir": "." }`.
5. `clasp push` envia os `.gs` e o `appsscript.json` (o editor mostra os arquivos com os mesmos nomes).
6. Siga as seções 3, 4 e 5. Para atualizar: `clasp push` e depois **Nova versão** na implantação (seção 7), ou
   `clasp deploy -i <ID da implantação>` para manter a mesma URL.

## Cotas do plano gratuito (conta Google comum)

| Recurso                | Limite aproximado                                         |
| ---------------------- | --------------------------------------------------------- |
| Tempo por execução     | 6 min (cada inscrição leva cerca de 1 s)                  |
| Execuções simultâneas  | 30 (o lock coloca o resto na fila)                        |
| Gatilhos (o `onEdit`)  | 90 min por dia no total; cada edição leva milissegundos   |
| Planilha               | 10 milhões de células (sobra para milhares de inscrições) |
| Drive (conta gratuita) | 15 GB; cada foto tem até 400 KB (100 equipes ≈ 30 MB)     |

Contas Google Workspace (institucionais) têm limites maiores. Se o site receber "muita gente se inscrevendo", ele
mesmo tenta de novo com espera crescente.

### Próximo passo recomendado: Cloudflare Turnstile

Um robô que gera e-mails diferentes ainda consegue gastar o limite global. O passo seguinte é o
[Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) (gratuito): o site manda o token junto com a
inscrição e o `doPost` valida com `UrlFetchApp` (aí o manifesto ganha o escopo `script.external_request`) usando a
secret key guardada numa Propriedade do script. O `public/_headers` precisa liberar `https://challenges.cloudflare.com`
em `script-src` e `frame-src`. Fica pendente até a organização gerar as chaves.

## LGPD

- O aviso de privacidade fica em `/privacidade`, linkado no checkbox de consentimento e no rodapé. Mudou o texto do
  aviso? Suba `CONSENT_VERSION` em `src/application/use-cases/SubmitRegistration.ts` **e** no `Validation.gs` (hoje
  `2026-10-v3`; um teste confere que são iguais) e publique o script junto com o site.
- Dados guardados: nome da equipe, foto ou logo e, de cada integrante, nome completo, matrícula e e-mail. Nada de
  telefone, curso ou dado sensível. Cada linha guarda a prova do aceite na coluna **Consentimento** (versão do aviso
  e data/hora); sem isso o script recusa a inscrição.
- Finalidades: organizar a competição, a comunicação oficial por e-mail e mostrar no site, depois da confirmação, só
  o nome da equipe, a foto e o número de integrantes.
- A planilha guarda dados pessoais: compartilhe **só** com quem organiza e nunca deixe "qualquer pessoa com o link".
  Só as fotos ficam públicas. O Google atua como operador (hospeda a planilha e roda o script).
- **Retenção:** até 6 meses depois do evento. Depois disso, apague a planilha e a pasta das fotos (ou anonimize o que
  precisar guardar para estatística).
- Pedidos de acesso, correção, exclusão ou revogação chegam por e-mail: localize pelo protocolo, pelo nome da equipe
  ou pelo e-mail (filtro da aba Integrantes) e atenda em até 15 dias. Os dados de cada pessoa aparecem em dois
  lugares: na aba **Integrantes** e, na aba **Equipes**, nas colunas **Integrantes**, **E-mail de contato** e
  **E-mails da equipe**. Corrija ou apague nos dois.
