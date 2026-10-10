# ADR 0002 · Clean Architecture + DDD + MVVM

- **Status:** aceita
- **Data:** 2026-10-10

## Contexto

Várias pessoas (estudantes) vão manter o código. Precisamos de fronteiras claras, regras testáveis e baixo
acoplamento com bibliotecas visuais que mudam rápido (three.js, GSAP).

## Decisão

- Camadas **domain → application → infrastructure/presentation**, com composition roots em `src/composition`.
- **DDD tático:** entidades, value objects, aggregate root (`HackathonEvent`, `TeamRegistration`), serviço de domínio
  (`RegistrationPolicy`) e repositórios como interfaces no domínio.
- **MVVM** na apresentação interativa: ViewModels com estado `Observable` (sem DOM) e Views que fazem o binding.
- Padrões só onde fazem sentido: Factory e Strategy (formas 3D, qualidade, áudio), Facade (palco 3D, motion), Adapter
  (Lenis, Apps Script), Decorator (retry), Observer/Event Bus, Template Method (animadores), Null Object (áudio
  desligado), Singleton (Ticker e container de build).
- A regra de dependência é verificada pelo ESLint (`no-restricted-imports`).

## Consequências

- Regras de negócio (validação da inscrição, status, contador, pontuação) testadas sem navegador.
- Trocar a fonte de dados (JSON → planilha → API) não muda domínio nem telas.
- Mais arquivos do que uma landing page "simples"; compensado por arquivos pequenos e nomes previsíveis.
