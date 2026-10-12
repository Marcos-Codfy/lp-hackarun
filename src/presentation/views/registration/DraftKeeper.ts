import { qs, qsa } from '@shared/utils/dom';
import type {
  DraftSaveResult,
  RegistrationDraft,
  RegistrationDraftData,
} from '@presentation/view-models/registration/RegistrationDraft';
import type {
  RegistrationFormState,
  RegistrationFormViewModel,
} from '@presentation/view-models/registration/RegistrationFormViewModel';
import { textAt } from '@presentation/view-models/registration/RegistrationFields';
import { DIRECT_SOURCE } from '@presentation/view-models/registration/registrationOrigin';
import { pathOf } from './fieldLookup';

export interface DraftKeeperDeps {
  // [data-registration-form]
  root: HTMLElement;
  vm: RegistrationFormViewModel;
  draft: RegistrationDraft;
  // faixa "Rascunho salvo nesta aba" com o "Limpar rascunho" ([data-draft])
  bar: HTMLElement | null;
  // origem do CTA (?origem=); sem ela vale a do rascunho
  source: string;
}

// espera a pessoa parar de digitar antes de gravar (e grava na hora ao sair da página)
const SAVE_DELAY_MS = 400;

const TEXT = {
  restored: 'Rascunho recuperado: está tudo como você deixou.',
  saved: 'Rascunho salvo nesta aba',
  pickAgain: 'A foto não coube no rascunho: escolha de novo.',
  tooBig: 'A foto não cabe no rascunho: se sair da página, escolha de novo ao voltar.',
  cleared: 'Rascunho apagado. O formulário voltou ao começo.',
};

// rascunho da aba: devolve o que foi digitado quando a pessoa volta pra /inscricao e salva enquanto ela
// preenche. O aceite nunca volta marcado; enviou, o rascunho some
export class DraftKeeper {
  private readonly deps: DraftKeeperDeps;
  private source: string;
  private restored: RegistrationDraftData | null = null;
  private timer = 0;
  private stopped = false;
  // mudou algo desde a última gravação (pagehide e visibilitychange chegam juntos: grava uma vez só)
  private dirty = false;
  private clearButton: HTMLButtonElement | null = null;

  constructor(deps: DraftKeeperDeps) {
    this.deps = deps;
    this.source = deps.source;
  }

  // antes do RegistrationFormView montar: o VM já nasce com o rascunho (os cards extras saem dele)
  restore(): void {
    if (!this.deps.vm.isOpen) return;
    const data = this.deps.draft.load();
    if (!data) return;
    this.restored = data;
    if (this.source === DIRECT_SOURCE && data.source) this.source = data.source;
    this.deps.vm.restore(data);
  }

  // depois do View montar: o rascunho vai pros campos que ainda estão vazios e passa a ser salvo
  mount(): void {
    const { vm, bar } = this.deps;
    vm.setSource(this.source);
    if (!vm.isOpen) return;
    if (this.restored) {
      this.fillInputs();
      this.show(TEXT.restored, this.restored.imageDropped ? TEXT.pickAgain : null);
      this.announce('Rascunho recuperado.');
    }
    vm.state.subscribe((state, prev) => this.onState(state, prev), { immediate: false });
    window.addEventListener('pagehide', this.flush);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.flush();
    });
    this.clearButton = bar?.querySelector<HTMLButtonElement>('[data-draft-clear]') ?? null;
    this.clearButton?.addEventListener('click', () => this.clear());
  }

  private onState(state: RegistrationFormState, prev: RegistrationFormState): void {
    // enviando: o "Limpar rascunho" espera (o envio em andamento é do que está nos campos)
    if (this.clearButton) this.clearButton.disabled = state.status === 'submitting';
    if (state.status === 'success' || !state.open) {
      this.stop();
      if (state.status === 'success') this.deps.draft.clear();
      return;
    }
    if (state.fields === prev.fields) return;
    this.dirty = true;
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(this.flush, SAVE_DELAY_MS);
  }

  private readonly flush = (): void => {
    window.clearTimeout(this.timer);
    if (this.stopped || !this.dirty) return;
    this.dirty = false;
    const { vm, draft } = this.deps;
    this.render(draft.save(vm.fields, this.source, vm.sessionKey));
  };

  private render(result: DraftSaveResult): void {
    // armazenamento indisponível (aba anônima antiga, cota cheia): segue sem rascunho, sem alarde
    if (result === 'empty' || result === 'failed') return this.show(null, null);
    const pickAgain = this.restored?.imageDropped && !this.deps.vm.fields.teamImage;
    const note = result === 'saved-without-image' ? TEXT.tooBig : pickAgain ? TEXT.pickAgain : null;
    this.show(TEXT.saved, note);
  }

  // "Limpar rascunho": apaga o salvo e zera o formulário (o foco vai pro nome da equipe). Com o envio em
  // andamento nada muda: os campos na tela continuam sendo o que está indo pra planilha
  private clear(): void {
    if (!this.deps.vm.reset()) return;
    window.clearTimeout(this.timer);
    this.dirty = false;
    this.deps.draft.clear();
    this.restored = null;
    qsa<HTMLInputElement>('input[data-field], input[data-member-field]', this.deps.root).forEach((el) => {
      if (el.type === 'checkbox') el.checked = false;
      else if (el.type !== 'file') el.value = '';
    });
    this.show(null, null);
    this.announce(TEXT.cleared);
  }

  private stop(): void {
    this.stopped = true;
    window.clearTimeout(this.timer);
    this.show(null, null);
  }

  // valor do rascunho só onde o campo está vazio: o que a pessoa já digitou nesta visita ganha
  private fillInputs(): void {
    const { fields } = this.deps.vm;
    qsa<HTMLInputElement>('input[data-field="teamName"], input[data-member-field]', this.deps.root).forEach(
      (el) => {
        const path = pathOf(el);
        const value = path ? textAt(fields, path) : null;
        if (value && !el.value) el.value = value;
      },
    );
  }

  private show(text: string | null, note: string | null): void {
    const { bar } = this.deps;
    if (!bar) return;
    bar.hidden = text === null;
    const label = qs('[data-draft-text]', bar);
    if (label && text) label.textContent = text;
    const extra = qs('[data-draft-note]', bar);
    if (extra) {
      extra.hidden = !note;
      extra.textContent = note ?? '';
    }
  }

  private announce(text: string): void {
    const live = qs('[data-reg-live]', this.deps.root);
    if (live) live.textContent = text;
  }
}
