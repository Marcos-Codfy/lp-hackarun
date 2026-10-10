// datas "AAAA-MM-DD" em pt-BR sem depender do fuso de quem roda o build
const WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'] as const;
const WEEKDAYS_LONG = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
] as const;
const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'] as const;
const MONTHS_LONG = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const;

export interface DayLabel {
  weekday: string;
  day: string;
  month: string;
  // "QUA · 11 NOV"
  short: string;
  // "quarta-feira, 11 de novembro" (pro leitor de tela)
  long: string;
}

export class DayLabelFormatter {
  format(isoDate: string): DayLabel {
    const { year, month, day } = this.parse(isoDate);
    // meio-dia UTC: nenhum fuso empurra pro dia vizinho
    const weekdayIndex = new Date(Date.UTC(year, month, day, 12)).getUTCDay();
    const weekday = WEEKDAYS[weekdayIndex] ?? '';
    const dd = String(day).padStart(2, '0');
    const mon = MONTHS[month] ?? '';
    return {
      weekday,
      day: dd,
      month: mon,
      short: `${weekday} · ${dd} ${mon}`,
      long: `${WEEKDAYS_LONG[weekdayIndex] ?? ''}, ${day} de ${MONTHS_LONG[month] ?? ''}`,
    };
  }

  // "11–14 NOV", ou "30 OUT–02 NOV" quando vira o mês
  range(first: string, last: string): string {
    const a = this.format(first);
    const b = this.format(last);
    if (a.month === b.month) return `${a.day}–${b.day} ${b.month}`;
    return `${a.day} ${a.month}–${b.day} ${b.month}`;
  }

  private parse(isoDate: string): { year: number; month: number; day: number } {
    const [y = '1970', m = '1', d = '1'] = isoDate.slice(0, 10).split('-');
    return { year: Number(y), month: Number(m) - 1, day: Number(d) };
  }
}
