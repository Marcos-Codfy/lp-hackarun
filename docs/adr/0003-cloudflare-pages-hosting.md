# ADR 0003 · Hospedagem na Cloudflare Pages

- **Status:** aceita
- **Data:** 2026-10-10

## Contexto

Orçamento zero: nenhum servidor pago. Picos de acesso são esperados (divulgação, abertura e encerramento das
inscrições, dia da final). Opções avaliadas: Vercel, GitHub Pages e Cloudflare.

## Decisão

**Cloudflare Pages** no plano gratuito, conectada ao GitHub (deploy automático na `main`, preview por PR).

| Critério                               | Cloudflare Pages | Vercel Hobby                     | GitHub Pages                      |
| -------------------------------------- | ---------------- | -------------------------------- | --------------------------------- |
| Custo                                  | Grátis           | Grátis                           | Grátis                            |
| Banda / requisições estáticas          | Ilimitadas       | 100 GB/mês                       | ~100 GB/mês (limite flexível)     |
| Uso com patrocinador/instituição       | Permitido        | Plano Hobby proíbe uso comercial | Desencorajado pra fins comerciais |
| CDN no Brasil                          | Sim              | Sim                              | Via Fastly                        |
| Headers customizados (cache/segurança) | Sim (`_headers`) | Sim                              | Não                               |
| Preview por Pull Request               | Sim              | Sim                              | Não                               |

## Consequências

- Site 100% estático servido pela CDN: o pico de acesso não derruba nada, porque não existe servidor de origem.
- A única parte dinâmica (inscrição) fica no Google Apps Script, isolada do site (ADR 0004).
- Domínio próprio é opcional (o `*.pages.dev` é gratuito).

## Nota de 2026-10-12: integração com o Git e projeto oficial

- **Projeto:** `hackarun`, em `https://hackarun.pages.dev`, no plano Free e sem forma de pagamento cadastrada.
  Produção na branch `main`, prévia em todo Pull Request. Configuração completa no guia do projeto, seção 16.
- **Integração com o Git da Cloudflare (Connect to Git), e não uma GitHub Action com token da API:** nenhum segredo
  fica guardado no GitHub (um token de API vazado publicaria qualquer coisa na conta), as prévias por PR e o
  comentário com o link vêm prontos, e o rollback é um clique no painel. O preço é a amarração: projeto com Git
  integration não vira Direct Upload depois, e PR de fork não ganha prévia (a equipe trabalha com clone e branches).
- **Prévia de revisão:** o ambiente Preview tem `PUBLIC_REGISTRATION_SIMULATED=true`, que roda a inscrição simulada
  (nada é gravado na planilha) com um aviso na tela e `noindex`. Com endpoint configurado, o endpoint sempre ganha, e
  a flag num build de produção sem endpoint quebra o build de propósito.
- **Custo:** site só estático, sem `functions/`, `_worker.js` ou `wrangler.toml`. No limite de 500 builds por mês, os
  builds esperam o mês virar; o site no ar continua.
- O deploy usado para validar o design com a organização, na Vercel, é temporário e sai depois da produção conferida.
