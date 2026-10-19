// insígnia de cada equipe (sorteio de 12/11): a organização sobe a imagem numa pasta do Drive e cola o ID na aba
// Equipes. O script só cria a pasta e confere o ID antes de mandar pro site.

const IMAGE_FOLDER_PROPERTY = 'FOTOS_PASTA_ID';
const IMAGE_FOLDER_NAME = 'HackaRun 2026 · Insígnias das equipes';
// id de arquivo do Drive: o site monta a URL pública com ele (mesma regra do driveImageUrl.ts)
const IMAGE_ID_PATTERN = /^[A-Za-z0-9_-]{20,}$/;

// a pasta da propriedade FOTOS_PASTA_ID; sem ela (ou apagada), cria uma e guarda o id
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

// célula ID da insígnia -> id público; vazio ou editado à mão com lixo vira null (o site mostra as iniciais)
function publicImageId_(value) {
  const id = String(value == null ? '' : value).trim();
  return IMAGE_ID_PATTERN.test(id) ? id : null;
}
