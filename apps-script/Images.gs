// foto/logo da equipe: confere o que chegou e grava no Drive, numa pasta só das fotos.
// O nome do arquivo é aleatório: nada do protocolo nem do que a pessoa digitou (o link é público).

// mantenha igual ao TEAM_IMAGE_RULES.maxBytes do src/domain/value-objects/TeamImage.ts (um teste confere)
const MAX_IMAGE_BYTES = 400 * 1024;
const MIN_IMAGE_BYTES = 64;
const IMAGE_FOLDER_PROPERTY = 'FOTOS_PASTA_ID';
const IMAGE_FOLDER_NAME = 'HackaRun 2026 · Fotos das equipes';
// assinatura de cada formato: [posição, bytes]
const IMAGE_TYPES = {
  'image/jpeg': { ext: 'jpg', magic: [[0, [0xff, 0xd8, 0xff]]] },
  'image/png': { ext: 'png', magic: [[0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]]] },
  'image/webp': {
    ext: 'webp',
    magic: [
      [0, [0x52, 0x49, 0x46, 0x46]],
      [8, [0x57, 0x45, 0x42, 0x50]],
    ],
  },
};
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;
// id de arquivo do Drive: o site monta a URL pública com ele (mesma regra do driveImageUrl.ts)
const IMAGE_ID_PATTERN = /^[A-Za-z0-9_-]{20,}$/;

// { mimeType, ext, bytes } ou null. O tipo declarado precisa bater com os bytes de verdade
function parseTeamImage_(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const mimeType = String(raw.mimeType || '');
  const base64 = String(raw.base64 || '');
  if (!Object.prototype.hasOwnProperty.call(IMAGE_TYPES, mimeType)) return null;
  // teto antes de decodificar: base64 gigante nem chega a ocupar memória
  const maxLength = Math.ceil(MAX_IMAGE_BYTES / 3) * 4;
  if (base64.length % 4 !== 0 || base64.length > maxLength || !BASE64_PATTERN.test(base64)) return null;
  let bytes;
  try {
    bytes = Utilities.base64Decode(base64);
  } catch (err) {
    return null;
  }
  if (!bytes || bytes.length < MIN_IMAGE_BYTES || bytes.length > MAX_IMAGE_BYTES) return null;
  if (detectImageType_(bytes) !== mimeType) return null;
  return { mimeType: mimeType, ext: IMAGE_TYPES[mimeType].ext, bytes: bytes };
}

// bytes do Apps Script vêm com sinal (-128..127): & 0xff normaliza
function detectImageType_(bytes) {
  const matches = (mime) =>
    IMAGE_TYPES[mime].magic.every((sig) => sig[1].every((b, i) => (bytes[sig[0] + i] & 0xff) === b));
  return Object.keys(IMAGE_TYPES).find(matches) || '';
}

// grava e devolve o arquivo; null se o Drive falhar. A inscrição vale mesmo sem a foto:
// a coluna Imagem fica vazia e a organização pede a foto de novo pelo contato.
// O link público (shareImage_) o doPost liga depois de soltar o lock
function saveTeamImage_(protocol, image) {
  if (!image) return null;
  try {
    const blob = Utilities.newBlob(image.bytes, image.mimeType, imageFileName_(image.ext));
    return imageFolder_().createFile(blob);
  } catch (err) {
    console.error('Foto da equipe não foi salva (' + protocol + '): ' + err);
    return null;
  }
}

// o arquivo fica com link público e o nome aparece pra quem abre: o protocolo identifica a inscrição
// (troca de foto, pedidos da LGPD), então o nome é sorteado e não deriva dele. A coluna Imagem liga linha e arquivo
function imageFileName_(ext) {
  return 'foto-' + Utilities.getUuid() + '.' + ext;
}

// domínio institucional pode proibir "qualquer pessoa com o link": a inscrição segue e o site mostra as iniciais
function shareImage_(file, protocol) {
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (err) {
    console.error('Compartilhamento da foto bloqueado (' + protocol + '): ' + err);
  }
}

// a pasta da propriedade FOTOS_PASTA_ID; sem ela (ou apagada), cria uma e guarda o id. Roda sob o lock do doPost
function imageFolder_() {
  const props = PropertiesService.getScriptProperties();
  const id = String(props.getProperty(IMAGE_FOLDER_PROPERTY) || '').trim();
  if (id) {
    try {
      return DriveApp.getFolderById(id);
    } catch (err) {
      console.error('FOTOS_PASTA_ID não abre (' + id + '): criando outra pasta');
    }
  }
  const folder = DriveApp.createFolder(IMAGE_FOLDER_NAME);
  props.setProperty(IMAGE_FOLDER_PROPERTY, folder.getId());
  return folder;
}

// a linha não entrou na planilha: a foto vai pra lixeira (o reenvio grava outra)
function discardImage_(fileId) {
  if (!fileId) return;
  try {
    DriveApp.getFileById(fileId).setTrashed(true);
  } catch (err) {
    console.error('Não deu pra descartar a foto ' + fileId + ': ' + err);
  }
}

// célula Imagem -> id público; vazio ou editado à mão com lixo vira null (o site mostra as iniciais)
function publicImageId_(value) {
  const id = String(value == null ? '' : value).trim();
  return IMAGE_ID_PATTERN.test(id) ? id : null;
}

// rode uma vez no editor (selecione prepararFotos e clique em Executar): autoriza o Drive e cria a pasta
// (e já deixa criado o segredo dos ids públicos, antes da 1ª inscrição)
function prepararFotos() {
  idSecret_();
  console.log('Pasta das fotos das equipes: ' + imageFolder_().getUrl());
}
