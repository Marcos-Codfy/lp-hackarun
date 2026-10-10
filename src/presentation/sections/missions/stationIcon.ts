import type { IconName } from '@presentation/components/ui/icons';
import { normalizeSearch } from '@shared/utils/text';

// tipo de espaço -> ícone; a primeira regra que bate ganha (ordem importa)
const RULES: readonly [keyword: string, icon: IconName][] = [
  ['rede', 'network'],
  ['multimidia', 'monitor'],
  ['inovacao', 'bulb'],
  ['laboratorio', 'flask'],
  ['auditorio', 'mic'],
];

export function stationIcon(space: string): IconName {
  const normalized = normalizeSearch(space);
  return RULES.find(([keyword]) => normalized.includes(keyword))?.[1] ?? 'book';
}
