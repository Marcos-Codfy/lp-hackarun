// JSON pra dentro de um <script> (dados do app, JSON-LD): "<" vira \u003c, então nenhum texto do conteúdo
// fecha a tag antes da hora ("</script>") nem abre comentário ("<!--"). O JSON.parse lê igual
export function safeJsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
