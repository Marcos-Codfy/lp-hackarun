// formatação que pode atravessar a quebra de linha (o título usa <em> pro destaque)
const INLINE_TAGS = new Set(['EM', 'STRONG', 'B', 'I', 'SPAN', 'MARK', 'SMALL']);
// só espaço comum quebra linha: o &nbsp; continua grudado na palavra
const SPACES = /([ \t\n\r\f]+)/;
const ONLY_SPACES = /^[ \t\n\r\f]+$/;

interface Token {
  text: string;
  space: boolean;
  // formatação em volta, de fora pra dentro; mesmo array = mesmo trecho do HTML original
  chain: readonly Element[];
}

// divide um título em linhas com máscara (o efeito que o SplitText fazia aqui). O SplitText cria um
// Intl.Segmenter ao carregar (~40 ms no desktop, 4x isso no celular) que só serve pra caracteres.
// Uma leitura de layout pra achar as quebras; revert() devolve os nós originais
export class LineSplit {
  private constructor(
    private readonly el: HTMLElement,
    private readonly original: ChildNode[],
    readonly lines: HTMLElement[],
    private readonly labelled: boolean,
  ) {}

  // null = estrutura que não dá pra dividir com segurança (<br>, imagem...): quem chama anima inteiro
  static create(el: HTMLElement, lineClass: string): LineSplit | null {
    const tokens: Token[] = [];
    if (!LineSplit.tokenize(el, [], tokens) || !tokens.some((t) => !t.space)) return null;

    const original = Array.from(el.childNodes);
    const probes = new Map<Token, HTMLElement>();
    el.replaceChildren(...tokens.map((token) => LineSplit.probe(token, probes)));
    const rows = LineSplit.rows(tokens, probes);

    const labelled = !el.hasAttribute('aria-label');
    if (labelled) el.setAttribute('aria-label', (el.textContent ?? '').replace(/\s+/g, ' ').trim());
    const built = rows.map((row) => LineSplit.line(row, lineClass));
    el.replaceChildren(...built.map(({ mask }) => mask));
    return new LineSplit(
      el,
      original,
      built.map(({ line }) => line),
      labelled,
    );
  }

  revert(): void {
    this.el.replaceChildren(...this.original);
    if (this.labelled) this.el.removeAttribute('aria-label');
  }

  private static tokenize(node: Node, chain: readonly Element[], out: Token[]): boolean {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        for (const text of (child.textContent ?? '').split(SPACES)) {
          if (text) out.push({ text, space: ONLY_SPACES.test(text), chain });
        }
      } else if (child instanceof Element && INLINE_TAGS.has(child.tagName)) {
        if (!LineSplit.tokenize(child, [...chain, child], out)) return false;
      } else if (child.nodeType !== Node.COMMENT_NODE) {
        return false;
      }
    }
    return true;
  }

  // cópia rasa da formatação em volta (mantém classe e atributos do <em>)
  private static wrap(chain: readonly Element[], inner: Node): Node {
    return chain.reduceRight<Node>((node, el) => {
      const clone = el.cloneNode(false);
      clone.appendChild(node);
      return clone;
    }, inner);
  }

  // cada palavra num span pra medir; espaço fica como texto, no mesmo trecho em que estava
  private static probe(token: Token, probes: Map<Token, HTMLElement>): Node {
    if (token.space) return LineSplit.wrap(token.chain, document.createTextNode(token.text));
    const span = document.createElement('span');
    span.textContent = token.text;
    probes.set(token, span);
    return LineSplit.wrap(token.chain, span);
  }

  // agrupa por topo da palavra; espaço no fim da linha (onde ela quebrou) some
  private static rows(tokens: readonly Token[], probes: Map<Token, HTMLElement>): Token[][] {
    const rows: Token[][] = [];
    let row: Token[] = [];
    let top = Number.NEGATIVE_INFINITY;
    for (const token of tokens) {
      const probe = probes.get(token);
      if (!probe) {
        row.push(token);
        continue;
      }
      if (probe.offsetTop > top + probe.offsetHeight / 2 && row.length > 0) {
        rows.push(LineSplit.trim(row));
        row = [];
      }
      top = Math.max(top, probe.offsetTop);
      row.push(token);
    }
    rows.push(LineSplit.trim(row));
    return rows.filter((r) => r.length > 0);
  }

  private static trim(row: Token[]): Token[] {
    let start = 0;
    let end = row.length;
    while (start < end && row[start]?.space) start++;
    while (end > start && row[end - 1]?.space) end--;
    return row.slice(start, end);
  }

  // máscara (overflow clip) > linha (o que anima); trechos seguidos com a mesma formatação viram um nó só
  private static line(row: readonly Token[], lineClass: string): { mask: HTMLElement; line: HTMLElement } {
    const mask = document.createElement('span');
    mask.className = `${lineClass}-mask`;
    mask.setAttribute('aria-hidden', 'true');
    mask.style.display = 'block';
    // clip não cria contêiner de rolagem; navegador antigo fica no hidden
    mask.style.overflow = 'hidden';
    mask.style.overflow = 'clip';
    const line = document.createElement('span');
    line.className = lineClass;
    line.style.display = 'block';

    let run = '';
    let chain: readonly Element[] | null = null;
    const flush = (): void => {
      if (chain && run) line.appendChild(LineSplit.wrap(chain, document.createTextNode(run)));
      run = '';
    };
    for (const token of row) {
      if (token.chain !== chain) {
        flush();
        chain = token.chain;
      }
      run += token.text;
    }
    flush();
    mask.appendChild(line);
    return { mask, line };
  }
}
