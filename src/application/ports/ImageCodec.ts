// porta de saída: abre e regrava imagens no aparelho de quem se inscreve (canvas no navegador, falso nos testes)

export type EncodableImageType = 'image/webp' | 'image/jpeg';

export interface ImageSize {
  width: number;
  height: number;
}

// o arquivo escolhido; um File do navegador já satisfaz
export interface ImageFile {
  readonly type: string;
  readonly size: number;
}

export interface DecodedImage extends Readonly<ImageSize> {
  // libera a memória do bitmap
  close(): void;
}

export interface EncodedImage {
  readonly mimeType: EncodableImageType;
  readonly bytes: number;
  base64(): Promise<string>;
}

export interface ImageCodec {
  // rejeita quando o arquivo não abre (corrompido, formato que o navegador não lê)
  decode(file: ImageFile): Promise<DecodedImage>;
  // null = este navegador não gera o formato (ex.: WebP no Safari antigo)
  encode(
    image: DecodedImage,
    size: ImageSize,
    type: EncodableImageType,
    quality: number,
  ): Promise<EncodedImage | null>;
}
