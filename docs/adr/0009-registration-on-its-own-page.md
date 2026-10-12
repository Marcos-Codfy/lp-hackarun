# ADR 0009 · Inscrição numa página própria (`/inscricao`)

- **Status:** aceita
- **Data:** 2026-10-12
- **Complementa:** ADR 0008 (inscrição só de equipe) e ADR 0007 (fotos das equipes)

## Contexto

Até a rodada 3, o formulário morava no fim da landing page, logo depois do clímax do globo. Isso trazia alguns
problemas:

- **Formulário longo no fim de uma página longa:** com 3 integrantes e a foto, ele passava de 2.800 px no celular. O
  clímax, que é o pico da página, virava só a porta de entrada de um formulário.
- **Quem clicava num CTA no meio da página** (header, hero, equipes) era levado por um scroll longo até o fim, por cima
  de todo o conteúdo, e precisava de um controlador próprio (`RegistrationCtaController`) para isso.
- **A página mais pesada carregava a tarefa mais simples:** preencher o formulário dividia a thread com o 3D, o GSAP e
  o Lenis, e o chunk do formulário tinha que ser carregado sob demanda para não pesar o JS inicial.
- **Sem endereço próprio:** o link da inscrição era uma âncora no fim da LP (`/#inscricao`), que abria a página
  inteira com o 3D. Ela não tinha título nem descrição de busca, e a origem (de qual CTA a equipe veio) dependia de um
  evento entre módulos da mesma página (`registration:intent`).
- **Nada guardava o preenchimento:** recarregar a página ou abrir `/equipes` no meio do caminho jogava fora o que foi
  digitado, inclusive a foto já preparada.

## Decisão

1. **Página `/inscricao`**, leve como a `/equipes` (`PageLayout` + `LightApp`): sem 3D, GSAP nem Lenis, com SEO
   próprio (título, descrição, canonical, Open Graph e JSON-LD com `BreadcrumbList`) e no sitemap. O formulário é o
   mesmo, com três complementos: indicador de etapas, painel "O que você precisa ter em mãos" e rascunho.
2. **A LP fica só com o clímax:** a seção `#inscricao` mantém o globo, o contador, a lista curta do que ter em mãos e
   o CTA. Os ganchos da carga (`data-scene-hold`, as classes `is-charging` e `is-charged` e os eventos
   `experience:charging` e `experience:charged`) não mudam.
3. **Todo CTA de inscrição aponta para `/inscricao?origem=<lugar>`.** A origem é conferida contra uma lista fixa
   (`registrationOrigin.ts`; o que não está nela vira `direct`) e vai para a coluna Origem da planilha.
4. **Sub-navegação compartilhada** por `/inscricao` e `/equipes`: "← Voltar ao evento" e a chave
   [Inscrição | Equipes inscritas]. Quem veio da LP nesta aba volta pelo histórico, no mesmo ponto da página
   (bfcache ou restauração do scroll); quem chegou direto, ou está sem JavaScript, vai para `/#inscricao`.
5. **Rascunho na aba** (`sessionStorage`): o que foi digitado, a foto preparada e a chave de envio voltam quando a
   pessoa retorna à página. O aceite nunca volta marcado, e o rascunho some ao fechar a aba, no envio com sucesso ou em
   "Limpar rascunho".
6. **Endereços sem barra no fim:** `trailingSlash: 'never'` e `build.format: 'file'`. O build gera `inscricao.html`,
   a Cloudflare Pages serve `/inscricao` sem redirecionar e o sitemap fica igual ao canonical.

## Alternativas consideradas

- **Manter o formulário na LP** e só encurtá-lo: resolveria parte do tamanho, mas não o endereço próprio nem o peso
  do 3D durante o preenchimento.
- **Formulário num modal sobre a LP:** não teria endereço próprio. Além disso, pediria foco preso, rolagem dentro do
  modal no celular e um estado a mais para o botão de voltar, com o 3D rodando por trás.
- **Google Forms:** perderia a validação igual à do servidor, a prévia e a redução da foto no navegador, o visual da
  marca e o controle sobre os dados (ADR 0004).

## Consequências

- Mais uma navegação entre o CTA e o formulário. Em troca, a página abre direto no que interessa e é leve: Lighthouse
  mobile com Performance 99 e LCP de 2,0 s.
- A LP perdeu o chunk do formulário, o lobby e o `RegistrationCtaController` (com o evento `registration:intent`), e o
  JS inicial caiu de 68,4 para 68,2 KB gzip.
- A volta para a LP depende do histórico: a LP não pode ter listener de `unload`/`beforeunload` nem conexão aberta que
  tire a página do bfcache. Sem bfcache, a restauração nativa do scroll erra por alguns pixels.
- O rascunho guarda dados pessoais só na aba, e o aviso de privacidade explica isso. A coleta não mudou, então o
  `CONSENT_VERSION` continua `2026-10-v3`.
- QA: o `scripts/qa/anchorcheck.mjs` confere que os CTAs abrem `/inscricao?origem=…` e que o "Voltar ao evento" de
  quem chegou direto para no `#inscricao`. Depois do deploy, vale um `curl -I` para confirmar que `/inscricao`
  responde 200, sem redirecionar.
