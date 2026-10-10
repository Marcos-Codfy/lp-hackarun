export interface CalendarEntry {
  uid: string;
  title: string;
  description: string;
  location: string;
  start: Date;
  end: Date;
}

export interface CalendarExporter {
  export(calendarName: string, entries: CalendarEntry[]): string;
}
