import type { RegistrationWindow } from '../value-objects/RegistrationWindow';

export type RegistrationStatus = 'soon' | 'open' | 'closing' | 'closed';

// regra de negócio da inscrição; "closing" liga o gatilho de urgência na UI
export class RegistrationPolicy {
  static readonly CLOSING_WINDOW_MS = 72 * 60 * 60 * 1000;

  statusAt(now: Date, window: RegistrationWindow): RegistrationStatus {
    if (window.slots.level === 'full') return 'closed';
    if (window.closesAt && now.getTime() >= window.closesAt.getTime()) return 'closed';
    if (!window.endpoint) return 'soon';
    if (
      window.closesAt &&
      window.closesAt.getTime() - now.getTime() <= RegistrationPolicy.CLOSING_WINDOW_MS
    ) {
      return 'closing';
    }
    return 'open';
  }
}
