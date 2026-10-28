import { ValueObject } from '../shared/ValueObject';
import { fail, ok, type Result } from '../shared/Result';

// endereço do perfil público (LinkedIn, GitHub, site): só https, sem espaço nem símbolo de código.
// Mesmas regras do PROFILE_LINK_PATTERN/PROFILE_LINK_MAX do apps-script/Mentors.gs (um teste confere)
export class ProfileLink extends ValueObject<{ value: string }> {
  static readonly MAX = 200;
  static readonly PATTERN = /^https:\/\/[A-Za-z0-9][A-Za-z0-9.-]*\.[A-Za-z]{2,}(?:[/?#][^\s<>"'`\\]*)?$/;

  // "linkedin.com/in/ana" e "http://..." viram https://; texto vazio continua vazio (campo opcional)
  static normalize(raw: string): string {
    const value = raw.trim();
    if (!value) return '';
    if (/^https:\/\//i.test(value)) return value;
    return `https://${value.replace(/^http:\/\//i, '')}`;
  }

  static create(raw: string): Result<ProfileLink, string> {
    const value = ProfileLink.normalize(raw);
    if (value.length > ProfileLink.MAX || !ProfileLink.PATTERN.test(value)) {
      return fail('Confira o endereço: algo como https://www.linkedin.com/in/seu-nome.');
    }
    return ok(new ProfileLink({ value }));
  }

  get value(): string {
    return this.props.value;
  }
}
