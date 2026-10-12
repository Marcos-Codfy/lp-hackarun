import type { ImageFile, PreparedTeamImageDTO, PrepareTeamImage } from '@application/index';

export type TeamImagePreparer = Pick<PrepareTeamImage, 'execute'>;

const UNEXPECTED = 'Não deu pra preparar a imagem. Tente de novo ou escolha outra.';

// foto/logo escolhida: prepara uma de cada vez e descarta resultado velho (a pessoa trocou de arquivo no meio)
export class TeamImageSlot {
  private readonly prepare: TeamImagePreparer;
  private seq = 0;
  private pending: Promise<void> | null = null;
  // por que o último arquivo foi recusado; vira o erro do campo
  problem: string | null = null;

  constructor(prepare: TeamImagePreparer) {
    this.prepare = prepare;
  }

  get busy(): boolean {
    return this.pending !== null;
  }

  // o envio clicado enquanto a imagem prepara espera ela terminar
  settled(): Promise<void> {
    return this.pending ?? Promise.resolve();
  }

  choose(file: ImageFile, apply: (image: PreparedTeamImageDTO | null) => void): Promise<void> {
    const seq = ++this.seq;
    const run = this.prepare
      .execute(file)
      .then((result) =>
        result.ok ? { image: result.value, problem: null } : { image: null, problem: result.error },
      )
      .catch(() => ({ image: null, problem: UNEXPECTED }))
      .then(({ image, problem }) => {
        if (seq !== this.seq) return;
        this.pending = null;
        this.problem = problem;
        apply(image);
      });
    this.pending = run;
    return run;
  }

  // imagem pronta vinda de fora: cancela o que estava preparando
  accept(): void {
    this.seq++;
    this.pending = null;
    this.problem = null;
  }
}
