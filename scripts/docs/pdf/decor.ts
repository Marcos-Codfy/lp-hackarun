import { ENERGY_STOPS } from './theme.ts';

// fio no degradê de energia do site (régua de título, cabeçalho, capa)
export function energyRule(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  length: number,
  thickness: number,
): void {
  const gradient = doc.linearGradient(x, y, x + length, y);
  ENERGY_STOPS.forEach(([offset, color]) => gradient.stop(offset, color));
  doc.rect(x, y, length, thickness).fill(gradient);
}
