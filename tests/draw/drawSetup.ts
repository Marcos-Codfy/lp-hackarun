import {
  DrawTeamNames,
  GenerateTeamDraw,
  PublishTeams,
  SaveTeamDraw,
  type PokemonEntry,
} from '@application/draw/TeamDrawUseCases';
import { createRandom } from '@domain/index';
import { SheetDrawGateway } from '@infrastructure/draw/SheetDrawGateway';
import type { DrawTransport, WireResponse } from '@infrastructure/draw/DrawTransport';
import { handleDrawAction } from '../../tools/sorteio/xlsx-handler.mjs';
import { crowd, makeWorkbook } from './xlsxFixture';

export const CATALOG: PokemonEntry[] = [
  { id: 25, name: 'Pikachu', types: ['electric'] },
  { id: 6, name: 'Charizard', types: ['fire', 'flying'] },
  { id: 7, name: 'Squirtle', types: ['water'] },
  { id: 1, name: 'Bulbasaur', types: ['grass', 'poison'] },
  { id: 133, name: 'Eevee', types: ['normal'] },
  { id: 150, name: 'Mewtwo', types: ['psychic'] },
];

export class FileTransport implements DrawTransport {
  constructor(private readonly file: string) {}
  call(body: Record<string, unknown>): Promise<WireResponse> {
    return handleDrawAction(this.file, body) as Promise<WireResponse>;
  }
}

export async function setup(count = 24) {
  const file = await makeWorkbook(crowd(count));
  const gateway = new SheetDrawGateway(new FileTransport(file));
  const now = () => new Date(2026, 10, 12, 19, 30, 5);
  return {
    file,
    gateway,
    generate: new GenerateTeamDraw(gateway, now, createRandom('teste')),
    save: new SaveTeamDraw(gateway),
    names: new DrawTeamNames(gateway, CATALOG, createRandom('nomes')),
    publish: new PublishTeams(gateway),
  };
}
