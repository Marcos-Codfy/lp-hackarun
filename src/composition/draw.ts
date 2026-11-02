// composition root do sorteio das equipes (ferramenta da organização): liga o gateway da planilha aos casos de uso. Só
// as telas /sorteio e /sorteio/nomes importam isto
import pokemon from '@infrastructure/content/pokemon.json';
import {
  DrawTeamNames,
  GenerateTeamDraw,
  GetDrawStatus,
  PublishTeams,
  SaveTeamDraw,
  type PokemonEntry,
} from '@application/draw/TeamDrawUseCases';
import {
  LocalDrawTransport,
  SiteDrawTransport,
  type DrawTransport,
} from '@infrastructure/draw/DrawTransport';
import { SheetDrawGateway } from '@infrastructure/draw/SheetDrawGateway';

// onde o sorteio lê e grava: a cópia local de teste (servidor do npm run sorteio) ou a planilha real, pela função do
// site (hackarun.com.br/sorteio, atrás do login da organização)
export type DrawSource = { mode: 'local'; label: string } | { mode: 'site'; label: string };

export interface DrawServices {
  source: DrawSource;
  catalog: readonly PokemonEntry[];
  status: GetDrawStatus;
  generate: GenerateTeamDraw;
  save: SaveTeamDraw;
  names: DrawTeamNames;
  publish: PublishTeams;
  // só no modo de teste (cópia local): recomeça do zero para sortear de novo quantas vezes quiser. Na planilha real é null
  resetTest: (() => Promise<void>) | null;
  // só no teste: volta os nomes para "Equipe N" (as equipes continuam). Na planilha real é null
  resetTestNames: (() => Promise<void>) | null;
  // planilha real: o sorteio das equipes grava sozinho (sem botão "Salvar"). No teste o botão continua
  autoSave: boolean;
}

function transportFor(source: DrawSource): DrawTransport {
  return source.mode === 'local' ? new LocalDrawTransport() : new SiteDrawTransport();
}

// acaso de verdade do navegador (o sorteio das equipes ainda guarda a semente, pra poder ser auditado)
const browserRandom = (): number => (crypto.getRandomValues(new Uint32Array(1))[0] as number) / 4294967296;

export function createDrawServices(source: DrawSource): DrawServices {
  const transport = transportFor(source);
  const gateway = new SheetDrawGateway(transport);
  const catalog: readonly PokemonEntry[] = pokemon;
  return {
    source,
    catalog,
    status: new GetDrawStatus(gateway),
    generate: new GenerateTeamDraw(gateway, () => new Date(), browserRandom),
    save: new SaveTeamDraw(gateway),
    names: new DrawTeamNames(gateway, catalog, browserRandom),
    publish: new PublishTeams(gateway),
    resetTest: transport instanceof LocalDrawTransport ? () => transport.reset('all') : null,
    resetTestNames: transport instanceof LocalDrawTransport ? () => transport.reset('names') : null,
    autoSave: source.mode === 'site',
  };
}
