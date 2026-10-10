// instante ISO -> rótulo no fuso do evento (o build pode rodar em qualquer fuso)
export interface EventStamp {
  // "14.11"
  date: string;
  // "18H"
  hour: string;
  // "14 de novembro, às 18h" (leitor de tela)
  long: string;
}

export class EventStampFormatter {
  private readonly timeZone: string;

  constructor(timeZone: string) {
    this.timeZone = timeZone;
  }

  format(iso: string): EventStamp {
    const parts = new Intl.DateTimeFormat('pt-BR', {
      timeZone: this.timeZone,
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(iso));
    const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
    const hour = String(Number(get('hour')));
    const minute = get('minute');
    const hourLabel = minute === '00' ? `${hour}h` : `${hour}h${minute}`;
    const monthName = new Intl.DateTimeFormat('pt-BR', { timeZone: this.timeZone, month: 'long' }).format(
      new Date(iso),
    );
    return {
      date: `${get('day')}.${get('month')}`,
      hour: hourLabel.toUpperCase(),
      long: `${Number(get('day'))} de ${monthName}, às ${hourLabel}`,
    };
  }
}
