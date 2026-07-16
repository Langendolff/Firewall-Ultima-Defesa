import Phaser from 'phaser'
import { COLORS, PHASES, FONT_HEADING, FONT_BODY } from '../gameData.js'
import { card, chunkyButton } from '../ui.js'

const CONTENT_X = 40
const CONTENT_W = 880

export default class BriefingScene extends Phaser.Scene {
  constructor() {
    super('Briefing')
  }

  init(data) {
    this.phase = PHASES[data?.phaseId ?? 1]
  }

  create() {
    const { width: w } = this.scale
    const phase = this.phase
    this.cameras.main.setBackgroundColor(COLORS.navy)

    // cabeçalho
    card(this, CONTENT_X, 20, 40, 40, { radius: 10, fill: COLORS.blue })
    this.add
      .text(CONTENT_X + 20, 40, String(phase.id), { fontFamily: FONT_HEADING, fontSize: '18px', fontStyle: '800', color: '#ffffff' })
      .setOrigin(0.5)
    this.add.text(CONTENT_X + 56, 20, `RELATÓRIO DE INTELIGÊNCIA · FASE ${phase.id}`, {
      fontFamily: FONT_BODY,
      fontSize: '11px',
      fontStyle: '700',
      color: '#8fa5e8',
    })
    this.add.text(CONTENT_X + 56, 34, `"${phase.title}"`, {
      fontFamily: FONT_HEADING,
      fontSize: '24px',
      color: '#ffffff',
    })

    // contexto
    const contextH = 88
    card(this, CONTENT_X, 76, CONTENT_W, contextH, { radius: 18 })
    this.add.text(CONTENT_X + 22, 88, 'CONTEXTO', { fontFamily: FONT_BODY, fontSize: '11px', fontStyle: '800', color: '#1b2a55' })
    this.add.text(CONTENT_X + 22, 106, phase.narrative.join(' '), {
      fontFamily: FONT_BODY,
      fontSize: '13px',
      color: '#3a4160',
      wordWrap: { width: CONTENT_W - 44 },
      lineSpacing: 3,
    })

    // objetivo — o que o jogador precisa fazer, em destaque (antes só existia
    // como texto solto no gameData, nunca chegava a aparecer na tela)
    const objY = 76 + contextH + 10
    const objH = 76
    card(this, CONTENT_X, objY, CONTENT_W, objH, { radius: 18, fill: COLORS.amber })
    this.add.text(CONTENT_X + 22, objY + 14, '🎯 OBJETIVO DA MISSÃO', { fontFamily: FONT_BODY, fontSize: '11px', fontStyle: '800', color: '#1b2a55' })
    this.add.text(CONTENT_X + 22, objY + 34, phase.objective, {
      fontFamily: FONT_BODY,
      fontSize: '14px',
      fontStyle: '700',
      color: '#1b2a55',
      wordWrap: { width: CONTENT_W - 44 },
      lineSpacing: 3,
    })

    // grid: ameaças + dica
    const colW = (CONTENT_W - 20) / 2
    const gridY = objY + objH + 10
    const gridHFull = Math.max(140, 44 + phase.threats.length * 40 + 16)
    const glossRowsFull = Math.ceil(phase.glossary.length / 2)
    const glossHFull = 46 + glossRowsFull * 32 + 14

    // Fases com mais ameaças/termos que o layout original previa (2-3 de cada)
    // empurram o botão pra fora do canvas de 640px de altura — encolhe a
    // grade de ameaças, o glossário e o botão proporcionalmente até caber,
    // em vez de vazar. Fases com o conteúdo original (scale=1) não mudam.
    const availableForVariable = this.scale.height - gridY - 16
    const neededForVariable = gridHFull + 16 + glossHFull + 16 + 48
    const scale = Math.min(1, availableForVariable / neededForVariable)

    const gridH = gridHFull * scale
    const threatRowH = 40 * scale
    const threatStartOffset = 44 * scale

    card(this, CONTENT_X, gridY, colW, gridH, { radius: 18 })
    this.add.text(CONTENT_X + 20, gridY + 14, 'AMEAÇAS IDENTIFICADAS', { fontFamily: FONT_BODY, fontSize: '11px', fontStyle: '800', color: '#1b2a55' })
    phase.threats.forEach((threat, i) => {
      const ty = gridY + threatStartOffset + i * threatRowH
      const dangerColor = threat.level >= 2 ? COLORS.red : COLORS.amber
      this.add.circle(CONTENT_X + 34, ty, 15 * scale, COLORS.muted)
      this.add.text(CONTENT_X + 58, ty - 12 * scale, threat.name, { fontFamily: FONT_BODY, fontSize: `${13 * scale}px`, fontStyle: '800', color: '#1b2a55' })
      this.add.text(CONTENT_X + 58, ty + 4 * scale, threat.desc, {
        fontFamily: FONT_BODY,
        fontSize: `${11 * scale}px`,
        color: '#8a8fa3',
        wordWrap: { width: colW - 130 },
      })
      for (let b = 0; b < 3; b++) {
        this.add.rectangle(colW - 24 + b * 11, ty - 6 * scale, 8, 16 * scale, b < threat.level ? dangerColor : COLORS.panel)
      }
    })

    const col2X = CONTENT_X + colW + 20
    card(this, col2X, gridY, colW, gridH, { radius: 18 })
    this.add.text(col2X + 20, gridY + 14, 'DICA DO TÉCNICO', { fontFamily: FONT_BODY, fontSize: '11px', fontStyle: '800', color: '#1b2a55' })
    this.add.ellipse(col2X + 42, gridY + 62 * scale, 44, 50, COLORS.green).setStrokeStyle(4, COLORS.navy)
    this.add.text(col2X + 72, gridY + 42 * scale, `"${phase.tip}"`, {
      fontFamily: FONT_BODY,
      fontSize: `${13 * scale}px`,
      color: '#3a4160',
      wordWrap: { width: colW - 96 },
      lineSpacing: 3,
    })

    // glossário
    const gap1 = 16 * scale
    const glossY = gridY + gridH + gap1
    const gCols = 2
    const glossH = glossHFull * scale
    const glossRowH = 32 * scale
    const glossStartOffset = 46 * scale
    card(this, CONTENT_X, glossY, CONTENT_W, glossH, { radius: 18 })
    this.add.text(CONTENT_X + 20, glossY + 14, 'GLOSSÁRIO DA FASE', { fontFamily: FONT_BODY, fontSize: '11px', fontStyle: '800', color: '#1b2a55' })

    const gColW = (CONTENT_W - 40) / gCols
    phase.glossary.forEach((entry, i) => {
      const col = i % gCols
      const row = Math.floor(i / gCols)
      const gx = CONTENT_X + 20 + col * gColW
      const gy = glossY + glossStartOffset + row * glossRowH
      this.add.text(gx, gy, entry.term, { fontFamily: FONT_BODY, fontSize: `${12 * scale}px`, fontStyle: '800', color: '#4c7ef3' })
      this.add.text(gx, gy + 15 * scale, entry.desc, {
        fontFamily: FONT_BODY,
        fontSize: `${11 * scale}px`,
        color: '#3a4160',
        wordWrap: { width: gColW - 30 },
      })
    })

    // botão
    const gap2 = 16 * scale
    const btnH = 48 * scale
    chunkyButton(this, w / 2 - 130, glossY + glossH + gap2, 260, btnH, {
      radius: 16,
      fill: COLORS.amber,
      fillHover: 0xf7b64d,
      shadow: COLORS.amberDark,
      shadowOffset: 6,
      label: 'INICIAR MISSÃO',
      fontSize: `${18 * scale}px`,
      textColor: '#1b2a55',
      onClick: () => this.scene.start(phase.sceneKey),
    })
  }
}
