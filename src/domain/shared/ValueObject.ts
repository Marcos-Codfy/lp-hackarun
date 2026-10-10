// value object: imutável e comparado pelo valor
export abstract class ValueObject<TProps extends object> {
  protected readonly props: Readonly<TProps>;

  protected constructor(props: TProps) {
    this.props = Object.freeze({ ...props });
  }

  equals(other: ValueObject<TProps> | null | undefined): boolean {
    return !!other && JSON.stringify(other.props) === JSON.stringify(this.props);
  }
}
