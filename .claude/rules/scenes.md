---
paths:
  - "src/scenes/**"
  - "src/ui.js"
  - "src/portModal.js"
  - "src/speedControl.js"
---

# Regras das cenas (Phaser 4)

- **Phaser 4, não 3.** Confira `docs/engine-reference/web/phaser.md` antes de usar
  uma API de renderização, máscara, tint, efeito ou geometria: `preFX`/`postFX`,
  `setPipeline`, `setTintFill`, `Geom.Point` e `Math.TAU` mudaram ou saíram.
- **Valores de jogo ficam em `src/gameData.js`** (`PHASE_N.*`), nunca soltos na
  cena: ondas, intervalos, chances, tempos de queda, limites. Posição e tamanho
  de layout (`MAP_X`, `NODES`…) podem ficar como constantes no topo da cena.
- **Tempo só pelos relógios da cena**: `this.time.delayedCall` / `addEvent` e
  `this.tweens`. Nada de `setTimeout`, `setInterval` ou `Date.now()`: fogem da
  pausa e da velocidade de `speedControl.js` e continuam rodando depois que a
  cena para.
- **Troca de cena por `this.scene.start(key, data)`.** O fim de fase vai para
  `'Debriefing'` com o payload documentado em `DebriefingScene.js`
  (`phaseId`, `success`, `stars`, `statCards`, `achievement`, `reason`, `funFact`).
- **Reinício limpo**: `create()` reinicia todo o estado da cena (contadores,
  arrays, flags), porque o Phaser reaproveita a mesma instância ao repetir a
  fase. Um estado que sobra da partida anterior foi a causa do bug de
  "retry travado" da Fase 6.
- **Texto para o jogador em PT-BR**, com as fontes `FONT_HEADING` / `FONT_BODY`
  e as cores de `COLORS`. Não invente cores novas fora da paleta do mockup
  (`design/ux/mockup-telas.html`).
- **Painel-guia em toda fase**: `this.guide = buildGuide(this, { phase: PHASE_N, onStart })`
  no fim do `create()`, com `this.guide = null` no início. Timers de ameaça
  (APT etc.) começam no `onStart`, nunca no `create()`. Todo bloqueio/entrega
  passa por `this.guide.onBlock/onDeliver`; evento novo ganha um `guide.log`
  explicando o que houve e o que fazer.
- **Legível para quem não joga**: texto de jogo com no mínimo 13px, área de
  clique de pacote `PACKET_HIT_RADIUS`, e nenhuma informação só por cor.
- **Fase nova**: registre em `src/main.js`, crie `PHASE_N` (com `howTo`) e coloque-a em
  `PHASES` e num `ARCS` em `gameData.js`, atualize `design/levels/roteiro-fases.md`
  e o `PHASE_IDS` de `tests/integration/boot.spec.js`.
- **Verifique rodando**: `npm run smoke` não basta para mudança visual. Abra
  `npm run dev` com `?scene=PhaseN` e olhe a tela.
