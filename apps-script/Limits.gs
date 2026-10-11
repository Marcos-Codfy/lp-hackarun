// limites em tempo de execução: prazo e capacidade (Propriedades do script) + limite de envios.
// o build do site também fecha o formulário, mas quem chama a URL direto só esbarra aqui.

// 10 tentativas por e-mail a cada 10 min cobrem os retries automáticos do site (3 por clique)
const EMAIL_MAX_ATTEMPTS = 10;
const EMAIL_WINDOW_SECONDS = 600;
const GLOBAL_MAX_PER_MINUTE = 120;

// INSCRICOES_FECHADAS=sim fecha na mão; CLOSES_AT = data ISO com fuso; CAPACITY = máximo de equipes
function readConfig_() {
  const props = PropertiesService.getScriptProperties().getProperties();
  return {
    forcedClosed:
      String(props.INSCRICOES_FECHADAS || '')
        .trim()
        .toLowerCase() === 'sim',
    closesAt: parseLimit_(props.CLOSES_AT, 'CLOSES_AT', (text) => Date.parse(text)),
    capacity: parseLimit_(props.CAPACITY, 'CAPACITY', (text) => (/^\d+$/.test(text) ? Number(text) : NaN)),
  };
}

// vazio = sem limite (null); valor torto vira NaN e fecha as inscrições: melhor errar pro lado seguro
function parseLimit_(raw, name, parse) {
  const text = String(raw == null ? '' : raw).trim();
  if (!text) return null;
  const value = parse(text);
  if (Number.isFinite(value)) return value;
  console.error('Propriedade ' + name + ' inválida: ' + text);
  return NaN;
}

function closedByConfig_(config, nowMs) {
  if (config.forcedClosed || Number.isNaN(config.closesAt) || Number.isNaN(config.capacity)) return true;
  return config.closesAt !== null && nowMs >= config.closesAt;
}

// conta equipes que ainda ocupam vaga (pendentes e confirmadas); lotou, fecha pra todo mundo
function capacityReached_(config, rows) {
  if (config.capacity === null) return false;
  const teams = rows.filter((r) => String(r[COL.mode]) === 'Equipe' && !isRejected_(r[COL.status])).length;
  return !(teams < config.capacity);
}

// true = segura o envio. O e-mail esbarra no limite dele antes de contar no global: um script
// repetindo o mesmo e-mail gasta no máximo EMAIL_MAX_ATTEMPTS do balde, nunca tranca a fila de todo mundo
function rateLimited_(cache, emailHash, nowMs) {
  const mailKey = 'rate:mail:' + emailHash + ':' + Math.floor(nowMs / (EMAIL_WINDOW_SECONDS * 1000));
  const globalKey = 'rate:all:' + Math.floor(nowMs / 60000);
  const hits = cache.getAll([mailKey, globalKey]);

  const attempts = Number(hits[mailKey] || 0) + 1;
  cache.put(mailKey, String(attempts), EMAIL_WINDOW_SECONDS * 2);
  if (attempts > EMAIL_MAX_ATTEMPTS) return true;

  const total = Number(hits[globalKey] || 0) + 1;
  cache.put(globalKey, String(total), 120);
  return total > GLOBAL_MAX_PER_MINUTE;
}
