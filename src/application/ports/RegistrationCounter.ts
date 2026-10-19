// quantas inscrições ocupam vaga agora, contadas pela planilha; null = não deu pra saber (vale o build)
export interface RegistrationCounter {
  taken(): Promise<number | null>;
}
