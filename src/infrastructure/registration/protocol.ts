// sem 0/O/1/I pra ninguém confundir ao ditar o protocolo
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function fakeProtocol(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < 6; i++) code += ALPHABET.charAt(Math.floor(random() * ALPHABET.length));
  return `HR26-${code}`;
}
