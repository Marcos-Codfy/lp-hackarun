import type { TimeRangeDTO } from '@application/index';

type SlotLike = Pick<TimeRangeDTO, 'start' | 'end' | 'startHint'>;

// horário do jeito que a gente fala: "19h às 22h", "Manhã até 15h", "A partir das 17h"
export class SessionTimeFormatter {
  format(slot: SlotLike): string {
    const { start, end, startHint } = slot;
    if (start && end) return `${this.hour(start)} às ${this.hour(end)}`;
    if (end) return startHint ? `${startHint} até ${this.hour(end)}` : `Até ${this.hour(end)}`;
    if (start) return `A partir das ${this.hour(start)}`;
    return startHint ?? '';
  }

  // versão curta pra etiqueta: "19h–19h50", "17h+" (sem fim)
  compact(slot: SlotLike): string {
    const { start, end } = slot;
    if (start && end) return `${this.hour(start)}–${this.hour(end)}`;
    if (start) return `${this.hour(start)}+`;
    return end ? `até ${this.hour(end)}` : '';
  }

  // "19:00" -> "19h" · "19:30" -> "19h30" · "08:00" -> "8h"
  hour(hhmm: string): string {
    const [h = '0', m = '00'] = hhmm.split(':');
    const hours = String(Number(h));
    return m === '00' ? `${hours}h` : `${hours}h${m}`;
  }
}
