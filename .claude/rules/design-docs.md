---
paths:
  - "design/**"
---

# Regras dos documentos de design

- `design/levels/roteiro-fases.md` é a **fonte da verdade pedagógica**: objetivo,
  ameaças, conceitos e condições de cada fase. O código segue o roteiro. Se os
  dois divergirem, decida com o usuário qual está certo e alinhe o outro.
- `design/ux/mockup-telas.html` é a referência visual (paleta, layout, 1440×900).
  É um arquivo gerado e grande: leia trechos, não o arquivo inteiro.
- **Mecânica nova ou mudança grande** ganha um doc em `design/gdd/[slug].md`
  antes do código, com uma linha `Status:` (proposto / aceito / implementado /
  descartado) e estas seções, nessa ordem:
  1. **Visão geral**: um parágrafo
  2. **Problema / experiência desejada**: o que o jogador deve sentir e aprender
  3. **Regras detalhadas**: mecânica sem ambiguidade
  4. **Fórmulas e valores**: toda conta com variáveis, faixa esperada e exemplo
  5. **Casos de borda**: o que acontece, não "tratar adequadamente"
  6. **Dependências**: fases, cenas e dados afetados
  7. **Valores de ajuste**: o que vai para `gameData.js`, com faixa segura
  8. **Critérios de aceite**: verificáveis, com passa/falha
- Um doc que já existe num formato antigo (ex. `regras-e-incidentes.md`) não
  precisa ser reescrito. Só os docs novos seguem as seções.
- Escreva em partes: esqueleto primeiro, depois uma seção de cada vez,
  confirmando com o usuário.
- "Tem que ser divertido" não é especificação. Valores de balanceamento citam a
  razão ou o playtest de onde vieram.
