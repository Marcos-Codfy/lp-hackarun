import type { RegistrationWindow } from '../value-objects/RegistrationWindow';

export type RegistrationStatus = 'soon' | 'open' | 'closing' | 'closed';

// regra de negócio da inscrição; "closing" liga o gatilho de urgência na UI
export class RegistrationPolicy {
  static readonly CLOSING_WINDOW_MS = 72 * 60 * 60 * 1000;

  statusAt(now: Date, registrationWindow: RegistrationWindow): RegistrationStatus {
    const { slots, closesAt, endpoint } = registrationWindow;
    // sem prazo definido nunca fecha por data
    const msLeft = closesAt ? closesAt.getTime() - now.getTime() : Number.POSITIVE_INFINITY;
    if (slots.level === 'full' || msLeft <= 0) return 'closed';
    if (!endpoint) return 'soon';
    if (msLeft <= RegistrationPolicy.CLOSING_WINDOW_MS) return 'closing';
    return 'open';
  }
}
