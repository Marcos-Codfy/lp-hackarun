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
