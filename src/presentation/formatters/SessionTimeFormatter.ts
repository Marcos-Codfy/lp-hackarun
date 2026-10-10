import type { SessionDTO } from '@application/index';

type SlotLike = Pick<SessionDTO, 'start' | 'end' | 'startHint'>;

// horário de sessão do jeito que a gente fala: "19h às 22h", "Manhã até 15h", "A partir das 18h"
export class SessionTimeFormatter {
  format(slot: SlotLike): string {
    const { start, end, startHint } = slot;
    if (start && end) return `${this.hour(start)} às ${this.hour(end)}`;
    if (end) return startHint ? `${startHint} até ${this.hour(end)}` : `Até ${this.hour(end)}`;
    if (start) return `A partir das ${this.hour(start)}`;
    return startHint ?? '';
  }

  // "19:00" -> "19h" · "19:30" -> "19h30"
  hour(hhmm: string): string {
    const [h = '0', m = '00'] = hhmm.split(':');
    const hours = String(Number(h));
    return m === '00' ? `${hours}h` : `${hours}h${m}`;
  }
}
