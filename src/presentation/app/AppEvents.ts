// contrato de eventos do front: quem emite e quem escuta não se conhecem
export type SceneKey = 'core' | 'orbit' | 'enigma' | 'map' | 'terrain' | 'stage' | 'trophy' | 'dust';

export type QualityTier = 'low' | 'medium' | 'high';

export interface AppEvents extends Record<string, unknown> {
  // seção com data-scene entrou no centro da tela
  'scene:enter': { key: SceneKey; index: number; sectionId: string };
  // three.js carregou e já está desenhando
  'experience:ready': { tier: QualityTier };
  // three.js não vai rodar (sem webgl, save-data, erro de carga, de shader ou de frame); reduced motion não cai aqui
  'experience:fallback': { reason: string };
  // seção com data-scene-hold entrou: o globo começa a carregar por durationMs
  'experience:charging': { durationMs: number };
  // globo final terminou a carga (pulso de energia + revela o CTA); emitido mesmo sem webgl
  'experience:charged': undefined;
  // pausou ou retomou as animações (WCAG 2.2.2); o estado atual é a classe is-motion-paused do <html>
  'motion:paused': { paused: boolean };
  'npc:found': { id: string; found: number; total: number };
  // alguém clicou num CTA de inscrição
  'registration:intent': { source: string };
  'registration:submitted': { protocol: string };
}
