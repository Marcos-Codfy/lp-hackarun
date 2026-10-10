// leitura do ambiente do usuário; nada aqui pode quebrar no SSR
const isBrowser = typeof window !== 'undefined';

interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: string;
}

export function prefersReducedMotion(): boolean {
  return isBrowser && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function isCoarsePointer(): boolean {
  return isBrowser && window.matchMedia('(pointer: coarse)').matches;
}

export function saveDataEnabled(): boolean {
  if (!isBrowser) return false;
  const connection = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
  const slow = connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g';
  return connection?.saveData === true || slow;
}

export function supportsWebGL(): boolean {
  if (!isBrowser) return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
