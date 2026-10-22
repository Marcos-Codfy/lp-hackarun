// imagem de compartilhamento (link no WhatsApp, redes): existe, tem o tamanho que o Seo.astro declara e é leve
// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const IMAGE = 'public/og-hackarun.jpg';

describe('imagem de compartilhamento', () => {
  it('é a que o Seo.astro e o JSON-LD apontam', () => {
    const seo = readFileSync(`${ROOT}src/presentation/components/seo/Seo.astro`, 'utf8');
    const jsonLd = readFileSync(`${ROOT}src/presentation/components/seo/eventJsonLd.ts`, 'utf8');
    expect(seo).toContain("'/og-hackarun.jpg'");
    expect(jsonLd).toContain("'/og-hackarun.jpg'");
  });

  it('tem 1200x630 (o declarado nas metatags og:image:width/height) e fica abaixo de 300 KB', async () => {
    const file = readFileSync(`${ROOT}${IMAGE}`);
    const { width, height, format } = await sharp(file).metadata();
    expect({ width, height, format }).toEqual({ width: 1200, height: 630, format: 'jpeg' });
    expect(file.byteLength).toBeLessThan(300 * 1024);
  });
});
