# Firewall: A Última Defesa

Tower defense educativo sobre segurança de redes, em PT-BR. São 10 fases em 3
arcos (Fundamentos → Corporativo → Missão crítica). Cada fase é
briefing → fase jogável → debriefing. O jogo roda no navegador e fica publicado
em https://firewall-ultima-defesa.vercel.app.

## Stack

- **Engine**: Web: Phaser 4 (`phaser` 4.2.x) + Vite 8, JavaScript (ES modules), sem TypeScript
- **Testes**: Vitest 5 (`tests/unit/`) e Playwright 1.64 (`tests/integration/`)
- **Node**: `^22.12 || ^24 || >=26`
- **Resolução**: canvas 1440×900, `Phaser.Scale.FIT`
- **Persistência**: só `localStorage` (`src/progress.js`)

> O Phaser 4 é posterior ao que o modelo conhece bem: por padrão saem APIs do
> Phaser 3. **Antes de usar qualquer API do Phaser, consulte
> `docs/engine-reference/web/phaser.md`.** Para Vite 8, Vitest 5 e Playwright,
> consulte `docs/engine-reference/web/breaking-changes.md`.

## Comandos

```bash
npm run dev        # servidor de desenvolvimento
npm run build      # build de produção em dist/
npm run test:unit  # Vitest: dados das fases e progresso (rápido, sem navegador)
npm run smoke      # build + só o teste @boot do Playwright
npm run test:e2e   # build + todas as telas e as 10 fases no navegador (~1 min)
npm test           # unit + e2e
```

O Playwright usa o Chrome/Chromium do sistema (`/usr/bin/chromium` etc.);
`CHROME_PATH` escolhe outro.

## Estrutura

```text
CLAUDE.md, project.yaml     configuração do projeto (este arquivo é a referência principal)
src/
  main.js                   cria o Phaser.Game e registra as cenas
  hook.js                   window.game e ?scene=/?phase=/?autostart=, para testes e depuração
  guide.js                  painel-guia das fases (como jogar, Começar, o que aconteceu) e destaque de tutorial
  difficulty.js             Tranquilo / Desafio
  gameData.js               TODO o conteúdo e os valores de ajuste: cores, portas, PHASE_1..10, ARCS
  progress.js               fases concluídas / liberadas (localStorage)
  ui.js, portModal.js, speedControl.js   componentes de interface compartilhados
  scenes/                   MainMenu, PhaseSelect, Briefing, Phase1..10, Debriefing
public/                     favicon e ícones servidos como estão
design/
  levels/roteiro-fases.md   roteiro pedagógico: objetivos, ameaças e conceitos de cada fase (fonte da verdade)
  gdd/                      documentos de mecânica (ex. regras-e-incidentes.md, proposta)
  ux/mockup-telas.html      mockup visual de referência (paleta, layout, resolução)
docs/engine-reference/web/  referência de APIs do Phaser 4 / Vite 8 / Vitest 5
tests/unit/                 Vitest (*.test.js)
tests/integration/          Playwright (*.spec.js)
```

## Como o jogo funciona

- **Fluxo de cenas**: `MainMenu → PhaseSelect → Briefing {phaseId} → PhaseN → Debriefing {payload}`.
  O payload do Debriefing está documentado no topo de `src/scenes/DebriefingScene.js`.
- **Conteúdo fica em `gameData.js`, não nas cenas.** Cada `PHASE_N` tem os textos
  (narrativa, objetivo, dica, ameaças, glossário, conquista) e os valores de
  ajuste (`wavesToWin`, `packetIntervalMs`, `maliciousChance`, `idsErrorChance`…).
  A cena só lê `PHASE_N.*`.
- **Tempo**: use `this.time` e `this.tweens` da cena, nunca `setTimeout` nem
  `Date.now()`. Os botões de pausa/velocidade (`speedControl.js`) agem via
  `timeScale` e pausam só esses relógios.
- **Progresso**: uma fase libera quando a anterior foi concluída (`isUnlocked`).
- **Público**: muita gente que joga não tem costume com jogos. Toda fase tem o
  painel-guia (`src/guide.js`) embaixo do mapa, com "Como jogar" (`PHASE_N.howTo`),
  o botão "Começar" (a primeira onda espera o jogador) e o feed "O que aconteceu",
  que explica cada acerto e erro. As cenas chamam `this.guide.onBlock(packet)` /
  `onDeliver(packet)` e `this.guide.log(texto, tom)`.
- **Dificuldade** (`src/difficulty.js`): "Tranquilo" (padrão) e "Desafio" (os
  valores originais). `applyDifficulty()` reescreve os valores de ajuste de
  `PHASE_N` a partir de uma cópia dos originais. Ajuste de balanceamento vai em
  `gameData.js`; o que muda entre dificuldades vai em `DIFFICULTIES`.
- **Cor nunca sozinha**: o estado do pacote tem selo (✓/!) além de verde/vermelho,
  e a porta diz ABERTA/FECHADA em texto. Mantenha isso em elementos novos.

## Testar uma fase direto

`?scene=Phase4` abre direto na fase 4 (`&autostart=1` pula o botão "Começar").
`?scene=Briefing&phase=7` abre o briefing da fase 7. No console: `window.game.scenes` e `window.game.start('Debriefing', {...})`.

## Convenções

- Textos do jogo, comentários e commits em **português**; identificadores em inglês, camelCase.
- Commits curtos no imperativo, em PT ("Adiciona…", "Corrige Fase 6: …"), como no histórico.
- Toda mudança em fase/conteúdo: rode `npm run test:unit`. Toda mudança em
  cena: rode `npm run smoke` (ou `test:e2e` para a fase mexida) e olhe a tela no `npm run dev`.
- Bug corrigido ganha teste de regressão, e você o vê **falhar** antes da correção.
- Mudou uma fase (ameaças, conceitos, condições de vitória)? Atualize
  `design/levels/roteiro-fases.md` junto.
- Mecânica nova ou grande: escreva primeiro um doc em `design/gdd/` (ver `.claude/rules/design-docs.md`).

Regras específicas por pasta ficam em `.claude/rules/` e carregam sozinhas ao mexer nesses arquivos.
