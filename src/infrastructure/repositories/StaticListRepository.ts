// base genérica pros repositórios de lista estática: mapeia uma vez e guarda em memória
export abstract class StaticListRepository<TRaw, TEntity> {
  private readonly raw: readonly TRaw[];
  private cache: TEntity[] | null = null;

  protected constructor(raw: readonly TRaw[]) {
    this.raw = raw;
  }

  protected abstract map(raw: TRaw): TEntity;

  async list(): Promise<TEntity[]> {
    this.cache ??= this.raw.map((item) => this.map(item));
    return [...this.cache];
  }
}
