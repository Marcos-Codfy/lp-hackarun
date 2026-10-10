import type { InlineRun, PdfWriter } from './PdfWriter.ts';

// subset de markdown suficiente pros docs do projeto: títulos, parágrafos, listas, tabelas e código
export class MarkdownRenderer {
  private readonly writer: PdfWriter;

  constructor(writer: PdfWriter) {
    this.writer = writer;
  }

  render(markdown: string): void {
    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    let i = 0;
    while (i < lines.length) {
      const line = lines[i] ?? '';
      if (line.startsWith('```')) {
        const block: string[] = [];
        i++;
        while (i < lines.length && !(lines[i] ?? '').startsWith('```')) block.push(lines[i++] ?? '');
        this.writer.code(block);
        i++;
        continue;
      }
      if (line.startsWith('|')) {
        const rows: string[][] = [];
        while (i < lines.length && (lines[i] ?? '').startsWith('|'))
          rows.push(MarkdownRenderer.cells(lines[i++] ?? ''));
        const [header, , ...body] = rows;
        if (header) this.writer.table(header, body);
        continue;
      }
      if (MarkdownRenderer.isPlain(line)) {
        // linhas seguidas de texto formam um parágrafo só (o .md é quebrado em ~120 colunas)
        const paragraph: string[] = [];
        while (i < lines.length && MarkdownRenderer.isPlain(lines[i] ?? ''))
          paragraph.push((lines[i++] ?? '').trim());
        this.writer.paragraph(MarkdownRenderer.inline(paragraph.join(' ')));
        continue;
      }
      if (line.startsWith('>')) {
        const quote: string[] = [];
        while (i < lines.length && (lines[i] ?? '').startsWith('>'))
          quote.push((lines[i++] ?? '').replace(/^>\s?/, ''));
        this.writer.paragraph(MarkdownRenderer.inline(quote.join(' ')), { indent: 10, color: '#55627A' });
        continue;
      }
      this.renderLine(line);
      i++;
    }
  }

  private static isPlain(line: string): boolean {
    const t = line.trim();
    return !!t && !/^(#{1,3}\s|[-*]\s|\d+\.\s|>|\||```|---+$)/.test(t);
  }

  private renderLine(line: string): void {
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      this.writer.heading(MarkdownRenderer.plain(heading[2] ?? ''), (heading[1]?.length ?? 1) as 1 | 2 | 3);
      return;
    }
    const bullet = /^(\s*)[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      this.writer.bullet(
        MarkdownRenderer.inline(bullet[2] ?? ''),
        '•',
        Math.floor((bullet[1]?.length ?? 0) / 2),
      );
      return;
    }
    const numbered = /^(\s*)(\d+)\.\s+(.*)$/.exec(line);
    if (numbered) {
      this.writer.bullet(
        MarkdownRenderer.inline(numbered[3] ?? ''),
        `${numbered[2]}.`,
        Math.floor((numbered[1]?.length ?? 0) / 2),
      );
      return;
    }
  }

  // **negrito**, `código` e [link](url) -> texto do link + url
  static inline(text: string): InlineRun[] {
    const runs: InlineRun[] = [];
    const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
    let last = 0;
    for (const match of text.matchAll(pattern)) {
      const token = match[0];
      if (match.index > last) runs.push({ text: text.slice(last, match.index) });
      if (token.startsWith('**')) runs.push({ text: token.slice(2, -2), bold: true });
      else if (token.startsWith('`')) runs.push({ text: token.slice(1, -1), code: true });
      else {
        const link = /\[([^\]]+)\]\(([^)]+)\)/.exec(token);
        runs.push({ text: link?.[1] ?? token, bold: true });
        if (link?.[2]?.startsWith('http')) runs.push({ text: ` (${link[2]})` });
      }
      last = match.index + token.length;
    }
    if (last < text.length) runs.push({ text: text.slice(last) });
    return runs.length ? runs : [{ text }];
  }

  static plain(text: string): string {
    return MarkdownRenderer.inline(text)
      .map((r) => r.text)
      .join('');
  }

  private static cells(row: string): string[] {
    return row
      .trim()
      .replace(/^\||\|$/g, '')
      .split('|')
      .map((c) => MarkdownRenderer.plain(c.trim()));
  }
}
