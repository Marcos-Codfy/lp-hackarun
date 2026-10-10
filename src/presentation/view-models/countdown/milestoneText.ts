// textos do contador; usados no SSR (Countdown.astro) e no browser (CountdownView)
const EVENT_TIME_ZONE = 'America/Araguaina';

export const OVER_SENTENCE = 'O HackaRun 2026 foi encerrado. Valeu, corredores!';

export const pad2 = (value: number): string => String(Math.max(0, Math.floor(value))).padStart(2, '0');

function timeParts(iso: string, timeZone: string): { hour: number; minute: string } {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '00';
  return { hour: Number(pick('hour')), minute: pick('minute') };
}

// "19h" ou "19h30"
export function formatHour(iso: string, timeZone = EVENT_TIME_ZONE): string {
  const { hour, minute } = timeParts(iso, timeZone);
  return minute === '00' ? `${hour}h` : `${hour}h${minute}`;
}

// frase estática pro leitor de tela: "O HackaRun começa em 11 de novembro de 2026, às 19h."
export function milestoneSentence(label: string, iso: string | null, timeZone = EVENT_TIME_ZONE): string {
  if (!iso) return OVER_SENTENCE;
  const day = new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
  return `${label} ${day}, às ${formatHour(iso, timeZone)}.`;
}

// legenda curta estilo HUD: "11.11 · 19H"
export function milestoneTag(iso: string | null, timeZone = EVENT_TIME_ZONE): string {
  if (!iso) return 'FIM DE JOGO';
  const date = new Intl.DateTimeFormat('pt-BR', { timeZone, day: '2-digit', month: '2-digit' }).format(
    new Date(iso),
  );
  return `${date.replace('/', '.')} · ${formatHour(iso, timeZone).toUpperCase()}`;
}
