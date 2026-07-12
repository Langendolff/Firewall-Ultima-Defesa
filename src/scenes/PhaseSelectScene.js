import Phaser from 'phaser'
import { COLORS, PHASES, FONT_HEADING, FONT_BODY } from '../gameData.js'
import { card, chunkyButton, skyGradient } from '../ui.js'
import { getCompleted, isUnlocked } from '../progress.js'

// Trilha de fases estilo "mapa de progressão" (referência: src/data/Firewall -
// Telas do Jogo (standalone).html, tela "Mapa de Progressão"): nós circulares
// numerados ligados por conectores, com anel pulsante na fase atual.
const NODE_D = 84
const CONNECTOR_W = 42

export default class PhaseSelectScene extends Phaser.Scene {
  constructor() {
    super('PhaseSelect')
  }

  create() {
    const { width: w, height: h } = this.scale
    skyGradient(this, 0, 0, w, h, COLORS.sky, COLORS.grassLight)

    this.add.text(w / 2, 44, 'SUA JORNADA DE DEFESA', { fontFamily: FONT_HEADING, fontSize: '28px', color: '#1b2a55' }).setOrigin(0.5)

    const completed = getCompleted()
    const phases = Object.values(PHASES).sort((a, b) => a.id - b.id)
    const current = phases.find((p) => isUnlocked(p.id) && !completed.includes(p.id))

    const cardX = 40
    const cardY = 100
    const cardW = w - 80
    const cardH = 280
    card(this, cardX, cardY, cardW, cardH, { radius: 24 })
    this.add.text(cardX + 28, cardY + 22, 'CAPÍTULO 1', { fontFamily: FONT_BODY, fontSize: '12px', fontStyle: '800', color: '#8a8fa3' })
    this.add.text(cardX + 28, cardY + 40, 'Fundamentos de firewall doméstico', { fontFamily: FONT_HEADING, fontSize: '18px', color: '#1b2a55' })

    const n = phases.length
    const totalW = n * NODE_D + (n - 1) * CONNECTOR_W
    const nodeY = cardY + 175
    let x = cardX + (cardW - totalW) / 2 + NODE_D / 2

    phases.forEach((phase, i) => {
      const done = completed.includes(phase.id)
      const unlocked = isUnlocked(phase.id)
      const isCurrent = phase.id === current?.id

      let nodeBg = COLORS.panel
      let nodeBorder = COLORS.panelLine
      let textColor = '#8a8fa3'
      if (done) {
        nodeBg = COLORS.green
        nodeBorder = COLORS.greenDark
        textColor = '#ffffff'
      } else if (isCurrent) {
        nodeBg = COLORS.amber
        nodeBorder = COLORS.amberDark
        textColor = '#ffffff'
      }

      if (i > 0) {
        const connectorColor = done || (unlocked && !isCurrent) ? COLORS.greenDark : COLORS.panelLine
        this.add.rectangle(x - NODE_D / 2 - CONNECTOR_W / 2, nodeY, CONNECTOR_W, 6, connectorColor, 1)
      }

      if (isCurrent) {
        const ring = this.add.circle(x, nodeY, NODE_D / 2 + 9).setStrokeStyle(4, COLORS.amber)
        this.tweens.add({ targets: ring, alpha: 0.25, scale: 1.12, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
      }

      this.add.circle(x, nodeY, NODE_D / 2, nodeBg).setStrokeStyle(5, nodeBorder)
      this.add
        .text(x, nodeY, unlocked ? String(phase.id) : '🔒', { fontFamily: FONT_HEADING, fontSize: '28px', fontStyle: '800', color: textColor })
        .setOrigin(0.5)

      if (done) {
        this.add.circle(x + NODE_D * 0.32, nodeY + NODE_D * 0.32, 15, COLORS.white).setStrokeStyle(3, COLORS.greenDark)
        this.add.text(x + NODE_D * 0.32, nodeY + NODE_D * 0.32, '★', { fontFamily: FONT_HEADING, fontSize: '14px', color: '#f5a623' }).setOrigin(0.5)
      }

      this.add
        .text(x, nodeY + NODE_D / 2 + 16, phase.title, {
          fontFamily: FONT_BODY,
          fontSize: '12px',
          fontStyle: '700',
          color: '#1b2a55',
          align: 'center',
          wordWrap: { width: NODE_D + 34 },
        })
        .setOrigin(0.5, 0)

      if (unlocked) {
        this.add
          .zone(x, nodeY, NODE_D, NODE_D)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => this.scene.start('Briefing', { phaseId: phase.id }))
      }

      x += NODE_D + CONNECTOR_W
    })

    chunkyButton(this, 30, h - 74, 140, 44, {
      radius: 14,
      fill: COLORS.white,
      shadow: COLORS.pillShadow,
      shadowOffset: 4,
      label: '← Menu',
      fontSize: '15px',
      textColor: '#1b2a55',
      onClick: () => this.scene.start('MainMenu'),
    })
  }
}
