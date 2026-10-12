// os cursos que fazem o HackaRun, na ordem do selo do hero; o tom liga cada um à sua cor (energia x mistério).
// Fonte única: o selo do hero e a legenda da UniCatólica na faixa "Quem faz acontecer" saem daqui
export const COURSES = [
  { name: 'Engenharia de Software', tone: 'software' },
  { name: 'Inteligência Artificial', tone: 'ai' },
] as const;

export interface Course {
  readonly name: string;
}

const LIST = new Intl.ListFormat('pt-BR', { type: 'conjunction' });

// "Engenharia de Software e Inteligência Artificial"
export function courseNames(courses: readonly Course[] = COURSES): string {
  return LIST.format(courses.map((course) => course.name));
}
