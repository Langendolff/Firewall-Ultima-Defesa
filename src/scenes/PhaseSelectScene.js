import Phaser from 'phaser'
import { COLORS, PHASES, ARCS, FONT_HEADING, FONT_BODY } from '../gameData.js'
import { card, chunkyButton, skyGradient } from '../ui.js'
import { getCompleted, isUnlocked } from '../progress.js'

// Trilha de fases estilo "mapa de progressão", agora um card por capítulo
// (Arco), como descrito no roteiro (src/data/Firewall_Fases_Roteiro.md,
// seção 1.2): nós circulares numerados ligados por conectores, com anel
// pulsante na fase atual.
const NODE_D = 62
const CONNECTOR_W = 28
const CARD_H = 164
const CARD_GAP = 12

export default class PhaseSelectScene extends Phaser.Scene {
  constructor() {
    super('PhaseSelect')
  }

  create() {
    const { width: w, height: h } = this.scale
    skyGradient(this, 0, 0, w, h, COLORS.sky, COLORS.grassLight)

    this.add.text(w / 2, 26, 'SUA JORNADA DE DEFESA', { fontFamily: FONT_HEADING, fontSize: '22px', color: '#1b2a55' }).setOrigin(0.5)

    const completed = getCompleted()
    const current = Object.values(PHASES)
      .sort((a, b) => a.id - b.id)
      .find((p) => isUnlocked(p.id) && !completed.includes(p.id))

    const cardX = 40
    const cardW = w - 80
    let cardY = 54

    ARCS.forEach((arc) => {
      card(this, cardX, cardY, cardW, CARD_H, { radius: 24 })
      this.add.text(cardX + 28, cardY + 14, arc.title.toUpperCase(), { fontFamily: FONT_BODY, fontSize: '12px', fontStyle: '800', color: '#8a8fa3' })
      this.add.text(cardX + 28, cardY + 32, arc.subtitle, { fontFamily: FONT_HEADING, fontSize: '16px', color: '#1b2a55' })

      const phases = arc.phaseIds.map((id) => PHASES[id])
      const n = phases.length
      const totalW = n * NODE_D + (n - 1) * CONNECTOR_W
      const nodeY = cardY + 96
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
          const ring = this.add.circle(x, nodeY, NODE_D / 2 + 8).setStrokeStyle(4, COLORS.amber)
          this.tweens.add({ targets: ring, alpha: 0.25, scale: 1.12, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
        }

        this.add.circle(x, nodeY, NODE_D / 2, nodeBg).setStrokeStyle(5, nodeBorder)
        this.add
          .text(x, nodeY, unlocked ? String(phase.id) : '🔒', { fontFamily: FONT_HEADING, fontSize: '20px', fontStyle: '800', color: textColor })
          .setOrigin(0.5)

        if (done) {
          this.add.circle(x + NODE_D * 0.32, nodeY + NODE_D * 0.32, 12, COLORS.white).setStrokeStyle(3, COLORS.greenDark)
          this.add.text(x + NODE_D * 0.32, nodeY + NODE_D * 0.32, '★', { fontFamily: FONT_HEADING, fontSize: '11px', color: '#f5a623' }).setOrigin(0.5)
        }

        this.add
          .text(x, nodeY + NODE_D / 2 + 10, phase.title, {
            fontFamily: FONT_BODY,
            fontSize: '10px',
            fontStyle: '700',
            color: '#1b2a55',
            align: 'center',
            wordWrap: { width: NODE_D + 26 },
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

      cardY += CARD_H + CARD_GAP
    })

    chunkyButton(this, 30, h - 60, 140, 44, {
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
