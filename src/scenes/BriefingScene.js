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
    const gridH = Math.max(140, 44 + phase.threats.length * 40 + 16)

    card(this, CONTENT_X, gridY, colW, gridH, { radius: 18 })
    this.add.text(CONTENT_X + 20, gridY + 14, 'AMEAÇAS IDENTIFICADAS', { fontFamily: FONT_BODY, fontSize: '11px', fontStyle: '800', color: '#1b2a55' })
    phase.threats.forEach((threat, i) => {
      const ty = gridY + 44 + i * 40
      const dangerColor = threat.level >= 2 ? COLORS.red : COLORS.amber
      this.add.circle(CONTENT_X + 34, ty, 15, COLORS.muted)
      this.add.text(CONTENT_X + 58, ty - 12, threat.name, { fontFamily: FONT_BODY, fontSize: '13px', fontStyle: '800', color: '#1b2a55' })
      this.add.text(CONTENT_X + 58, ty + 4, threat.desc, {
        fontFamily: FONT_BODY,
        fontSize: '11px',
        color: '#8a8fa3',
        wordWrap: { width: colW - 130 },
      })
      for (let b = 0; b < 3; b++) {
        this.add.rectangle(colW - 24 + b * 11, ty - 6, 8, 16, b < threat.level ? dangerColor : COLORS.panel)
      }
    })

    const col2X = CONTENT_X + colW + 20
    card(this, col2X, gridY, colW, gridH, { radius: 18 })
    this.add.text(col2X + 20, gridY + 14, 'DICA DO TÉCNICO', { fontFamily: FONT_BODY, fontSize: '11px', fontStyle: '800', color: '#1b2a55' })
    this.add.ellipse(col2X + 42, gridY + 62, 44, 50, COLORS.green).setStrokeStyle(4, COLORS.navy)
    this.add.text(col2X + 72, gridY + 42, `"${phase.tip}"`, {
      fontFamily: FONT_BODY,
      fontSize: '13px',
      color: '#3a4160',
      wordWrap: { width: colW - 96 },
      lineSpacing: 3,
    })

    // glossário
    const glossY = gridY + gridH + 16
    const gCols = 2
    const gRows = Math.ceil(phase.glossary.length / gCols)
    const glossH = 46 + gRows * 32 + 14
    card(this, CONTENT_X, glossY, CONTENT_W, glossH, { radius: 18 })
    this.add.text(CONTENT_X + 20, glossY + 14, 'GLOSSÁRIO DA FASE', { fontFamily: FONT_BODY, fontSize: '11px', fontStyle: '800', color: '#1b2a55' })

    const gColW = (CONTENT_W - 40) / gCols
    phase.glossary.forEach((entry, i) => {
      const col = i % gCols
      const row = Math.floor(i / gCols)
      const gx = CONTENT_X + 20 + col * gColW
      const gy = glossY + 46 + row * 32
      this.add.text(gx, gy, entry.term, { fontFamily: FONT_BODY, fontSize: '12px', fontStyle: '800', color: '#4c7ef3' })
      this.add.text(gx, gy + 15, entry.desc, {
        fontFamily: FONT_BODY,
        fontSize: '11px',
        color: '#3a4160',
        wordWrap: { width: gColW - 30 },
      })
    })

    // botão
    chunkyButton(this, w / 2 - 130, glossY + glossH + 16, 260, 48, {
      radius: 16,
      fill: COLORS.amber,
      fillHover: 0xf7b64d,
      shadow: COLORS.amberDark,
      shadowOffset: 6,
      label: 'INICIAR MISSÃO',
      fontSize: '18px',
      textColor: '#1b2a55',
      onClick: () => this.scene.start(phase.sceneKey),
    })
  }
}
