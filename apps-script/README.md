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
Acessibilidade, Status, Origem` e um menu suspenso na coluna **Status**.

## 2. Colar o código

1. Na planilha, abra **Extensões > Apps Script**.
2. Apague o conteúdo do `Código.gs` e cole o conteúdo de [`Code.gs`](./Code.gs).
3. Clique em **+ > Script**, dê o nome `Validacao` e cole o conteúdo de [`Validacao.gs`](./Validacao.gs).
4. (Opcional) Em **Configurações do projeto**, marque "Mostrar o arquivo de manifesto appsscript.json" e cole o
   conteúdo de [`appsscript.json`](./appsscript.json). Ele fixa o fuso `America/Araguaina` e o runtime V8.
5. Salve (Ctrl+S).

> O tamanho da equipe está em `TEAM_SIZE` no `Validacao.gs` (hoje 2 a 5 pessoas). Ele precisa ser igual ao
> `registration.teamSize` do arquivo `src/infrastructure/content/event.json`.

## 3. Publicar como Web App

1. Clique em **Implantar > Nova implantação**.
2. Em "Tipo", escolha **App da Web**.
3. **Executar como:** _Eu_ (a conta da organização). **Quem pode acessar:** _Qualquer pessoa_.
4. Clique em **Implantar** e autorize o acesso à planilha (o Google mostra um aviso de app não verificado: clique em
   "Avançado" e continue, o app é seu).
5. Copie a **URL do app da Web** (termina em `/exec`).
6. Teste no navegador: `URL/exec?action=health` precisa responder `{"ok":true}`.

> Mudou o código? Use **Implantar > Gerenciar implantações > Editar > Nova versão**. Assim a URL continua a mesma.
> "Nova implantação" gera outra URL e o site para de enviar.

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

Para **fechar as inscrições** sem mexer no site: em **Configurações do projeto > Propriedades do script**, crie
`INSCRICOES_FECHADAS` com o valor `sim`. Para reabrir, apague a propriedade ou troque para `nao`.

## Proteções que o script já faz

- Campo isca (honeypot) e tempo mínimo de 3s no formulário contra robôs.
- Validação completa no servidor (nome, e-mail, WhatsApp, curso, tamanho da equipe e e-mails repetidos).
- `LockService` em volta da gravação: duas inscrições ao mesmo tempo não se atropelam.
- Bloqueio de inscrição repetida pelo e-mail do líder.
- Reenvio automático do site (falha de rede) recebe o mesmo protocolo em vez de duplicar a linha.
- Limite de 40 inscrições por minuto e proteção contra fórmulas injetadas na planilha (`=`, `+`, `-`, `@`).

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

- A planilha guarda dados pessoais: compartilhe **só** com quem organiza e nunca deixe "qualquer pessoa com o link".
- O formulário pede consentimento explícito ("uso dos meus dados apenas para fins do evento").
- Use os dados só para o HackaRun (contato, credenciamento, certificados) e apague ou anonimize a planilha depois do
  encerramento, conforme a política da instituição.
- Pedidos de acesso, correção ou exclusão de dados chegam pelo e-mail da organização: localize pelo e-mail ou pelo
  protocolo e atenda em até 15 dias.
