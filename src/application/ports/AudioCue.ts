// som de destaque (pico da carga do globo). Strategy: arquivo, sintetizado ou nada; quem toca não sabe qual é
export interface AudioCue {
  play(): Promise<void>;
  // opcional: aquece o cue (baixa/decodifica) antes da hora de tocar
  preload?(): void;
}
