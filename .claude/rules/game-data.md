---
paths:
  - "src/gameData.js"
  - "src/progress.js"
---

# Regras dos dados do jogo

`src/gameData.js` é o conteúdo do jogo: textos pedagógicos e valores de ajuste
de cada fase. As cenas só leem daqui.

- **Toda porta usada** em `packetPorts`, `maliciousPorts`, `allowedPorts` ou
  `glossaryPorts` precisa existir em `PORTS`, com `label` e `desc`.
- **`maliciousPorts` ⊆ `packetPorts`**, e quando a fase tem `threatByPort`, as
  chaves dele são exatamente `maliciousPorts`.
- **Chances e proporções** (`*Chance`, `*Ratio`, `maliciousChanceByPort`) ficam
  entre 0 e 1. **Tempos** em milissegundos, com sufixo `Ms`.
- **`ARCS`** cobre cada fase uma vez, em ordem.
- **`howTo`**: 3 passos curtos, no imperativo, dizendo onde clicar. Sem números
  que mudam com a dificuldade (ex. "em 10 s").
- Valor novo de tempo/tolerância? Veja se ele entra em `DIFFICULTIES`
  (`src/difficulty.js`) para o modo Tranquilo.
- Chaves em camelCase, como no resto do arquivo. Textos em PT-BR, curtos o
  bastante para caber nos cards do briefing e do debriefing.
- Mudou um valor de ajuste? Diga no commit o que mudou na experiência ("Fase 6:
  IDS erra menos, a derrota vinha cedo demais"), não só o número.
- Mudou ameaça, conceito ou condição de vitória? Atualize
  `design/levels/roteiro-fases.md`, que é a fonte da verdade pedagógica.
- `progress.js` grava em `firewall-game:completed-phases`. Trocar a chave ou o
  formato apaga o progresso de quem já joga: migre o valor antigo em vez disso.
- Rode `npm run test:unit` depois de qualquer mudança. Os testes em
  `tests/unit/gameData.test.js` verificam as regras acima.
