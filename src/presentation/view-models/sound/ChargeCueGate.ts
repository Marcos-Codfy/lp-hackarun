// uma carga = um som: 'charging' arma e o primeiro 'charged' depois dele dispara
// (começa armado: se o charged chegar sozinho, ainda toca uma vez)
export class ChargeCueGate {
  private armed = true;

  arm(): void {
    this.armed = true;
  }

  // true = é a vez de tocar; chamadas repetidas na mesma carga voltam false
  fire(): boolean {
    if (!this.armed) return false;
    this.armed = false;
    return true;
  }
}
