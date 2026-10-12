# ADR 0007 · Fotos das equipes no Google Drive, servidas pelo CDN do Google

- **Status:** aceita
- **Data:** 2026-10-12
- **Complementa:** ADR 0004 (inscrições no Google Sheets via Apps Script)

## Contexto

A organização pediu uma página própria para as equipes inscritas, com a foto ou a logo de cada time, enviada pela
própria equipe na inscrição. Restrições:

- **Sem servidor:** o site é estático (ADR 0003) e as inscrições já passam pelo Web App do Apps Script (ADR 0004), que
  recebe um `POST` `text/plain` simples e tem cotas de conta Google.
- **Custo zero** e dados com a organização, no mesmo lugar da planilha.
- **Nada público sem alguém olhar antes:** é um evento universitário, e foto é dado pessoal (LGPD).
- **Página leve no celular:** dezenas de fotos numa grade não podem pesar como os arquivos originais de câmera.

## Decisão

1. **O navegador prepara a imagem.** O caso de uso `PrepareTeamImage`, com a porta `ImageCodec` (adapter
   `CanvasImageCodec`), aceita JPEG, PNG ou WebP de até 10 MB com o lado menor de pelo menos 200 px, reduz para
   800 px no lado maior e comprime em WebP (ou JPEG) até cerca de 300 KB, com teto de 400 KB. A imagem vai em base64
   dentro do mesmo `POST` da inscrição: sem multipart e sem preflight de CORS.
2. **O Apps Script grava no Drive** (`Images.gs`). Confere o formato pelos primeiros bytes e o teto de 400 KB, grava
   só depois das checagens de duplicado e de idempotência, usa o protocolo como nome do arquivo e guarda o id na coluna
   **Imagem**. A pasta vem da Propriedade `FOTOS_PASTA_ID` (ou é criada uma vez). Cada arquivo, e só o arquivo, fica
   como "Qualquer pessoa com o link · Leitor".
3. **A moderação é a confirmação.** `?action=teams` só devolve o id da foto de equipe com Status `confirmado`. Tirar
   uma foto do ar é apagar a célula **Imagem** (o `onEdit` limpa o cache); recusar a inscrição tira a equipe inteira.
4. **A entrega é pelo CDN de imagens do Google.** O site monta `https://lh3.googleusercontent.com/d/<id>=w600` só
   quando o id tem o formato do Drive, a entidade `Team` só aceita URL `https` ou `data:image`, e a CSP libera esse
   host só no `img-src`.
5. **Falha na foto não derruba a inscrição.** Drive fora do ar ou link público bloqueado pelo domínio: a inscrição
   entra, o erro vai para o log e o site mostra as iniciais. Planilha que falha depois do upload manda o arquivo para
   a lixeira.
6. **Consentimento versionado** (`CONSENT_VERSION` `2026-10-v2`): na inscrição de equipe, o aceite inclui a
   autorização para publicar a imagem e a declaração de que todos que aparecem nela concordaram. O servidor só aceita a
   versão vigente, e o aviso de privacidade ganhou uma seção sobre a foto (finalidade, base legal, link público,
   retenção e retirada).

## Alternativas consideradas

- **Guardar a imagem na planilha** (base64 numa célula): uma célula do Sheets aceita até 50 mil caracteres, e uma foto
  de 300 KB vira uns 400 mil em base64. A planilha também ficaria pesada para abrir.
- **Fotos no repositório** (`public/`): cada equipe exigiria um commit e um deploy, e a foto ficaria para sempre no
  histórico do Git, o que atrapalha um pedido de exclusão.
- **Cloudflare R2 ou um serviço de imagens de terceiros:** pedem uma peça a mais para receber o upload com segurança
  (Worker ou chave de API), mais uma conta para a organização manter, e tiram as fotos de perto da planilha.
- **Link `drive.google.com/uc?export=view`:** responde com redirecionamento e não foi feito para `<img>` em outro site.
  O `lh3.googleusercontent.com` entrega a imagem direto e já redimensiona (`=w600`).

## Consequências

- Custo zero, e as fotos ficam no Drive da conta da organização, ao lado da planilha (cerca de 30 MB para 100 equipes).
- A organização confere a foto antes de confirmar a equipe: é trabalho manual, mas é o mesmo clique que ela já dava.
- O endereço `lh3.googleusercontent.com/d/<id>` não é uma API documentada pelo Google. Se ele mudar, os cards caem nas
  iniciais (nada quebra) e a correção fica em dois lugares: `driveImageUrl.ts` e o `img-src` do `public/_headers`.
- Conta institucional que bloqueia link público precisa de liberação do administrador do Workspace na pasta das fotos.
- Site e Apps Script passam a subir juntos: o script exige a foto e a versão nova do consentimento.
- A requisição da inscrição ficou maior, e o tempo de espera do envio subiu de 15 s para 30 s.
- Os testes cobrem o caminho todo com dublês do Drive (formato, teto, reenvio, compartilhamento bloqueado, Drive fora
  do ar, planilha que falha). A autorização real do Drive e o compartilhamento num domínio institucional só são
  verificados no primeiro deploy do script.
