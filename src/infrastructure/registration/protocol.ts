// sem 0/O/1/I pra ninguém confundir ao ditar o protocolo
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function code(random: () => number): string {
  let out = '';
  for (let i = 0; i < 6; i++) out += ALPHABET.charAt(Math.floor(random() * ALPHABET.length));
  return out;
}

export function fakeProtocol(random: () => number = Math.random): string {
  return `HR26-${code(random)}`;
}

// cadastro de mentor: mesmo formato, outro prefixo (o do Apps Script é MT26-)
export function fakeMentorProtocol(random: () => number = Math.random): string {
  return `MT26-${code(random)}`;
}
