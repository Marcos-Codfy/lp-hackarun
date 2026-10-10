import { AddEquation, CustomBlending, OneFactor, ZeroFactor, type ShaderMaterialParameters } from 'three';

// luz somada no buffer opaco; o alpha do destino fica intacto (o canvas compõe em "screen" sobre a aurora)
export const ADDITIVE_LIGHT: ShaderMaterialParameters = {
  transparent: true,
  depthWrite: false,
  depthTest: false,
  blending: CustomBlending,
  blendEquation: AddEquation,
  blendSrc: OneFactor,
  blendDst: OneFactor,
  blendSrcAlpha: ZeroFactor,
  blendDstAlpha: OneFactor,
};
