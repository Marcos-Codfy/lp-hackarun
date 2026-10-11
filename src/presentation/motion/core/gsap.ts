// ponto único do gsap: todo mundo importa daqui
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let registered = false;

// o register do ScrollTrigger mede a página (layout forçado, 2x): no topo do módulo isso caía
// na avaliação do bundle, antes do 1º frame. O mountMotion chama no boot, antes de qualquer gatilho
export function registerMotionPlugins(): void {
  if (registered) return;
  registered = true;
  gsap.registerPlugin(ScrollTrigger);
}

export { gsap, ScrollTrigger };
