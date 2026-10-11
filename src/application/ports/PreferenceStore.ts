// porta de preferências do visitante (som, NPCs achados...); só strings, quem usa serializa
export interface PreferenceStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}
