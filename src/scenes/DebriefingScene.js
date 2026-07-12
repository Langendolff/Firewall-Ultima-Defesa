import Phaser from 'phaser'
import { COLORS, PHASES, FONT_HEADING, FONT_BODY } from '../gameData.js'
import { card, chunkyButton, statCard } from '../ui.js'
import { completePhase } from '../progress.js'

const CONTENT_X = 40
const CONTENT_W = 880

// payload esperado: { phaseId, success, reason, statCards: [{value,label,color}], achievement, funFact, stars }
export default class DebriefingScene extends Phaser.Scene {
  constructor() {
    super('Debriefing')
  }

  init(data) {
    this.data_ = data
    this.phase = PHASES[data.phaseId]
    if (data.success) completePhase(this.phase.id)
  }

  create() {
    const { width: w } = this.scale
    const { success, statCards = [], achievement, reason, funFact, stars = 0 } = this.data_
    const phase = this.phase
    const nextPhase = PHASES[phase.id + 1]
    this.cameras.main.setBackgroundColor(COLORS.cream)

    // banner
    const bannerY = 34
    const bannerH = 82
    const bannerColor = success ? COLORS.green : COLORS.red
    const bannerShadow = success ? COLORS.greenDark : COLORS.redDark
    chunkyButton(this, CONTENT_X, bannerY, CONTENT_W, bannerH, {
      radius: 18,
      fill: bannerColor,
      shadow: bannerShadow,
      shadowOffset: 6,
      label: '',
    })
    this.add.text(CONTENT_X + 26, bannerY + 18, success ? `FASE ${phase.id} CONCLUÍDA` : `FASE ${phase.id} NÃO CONCLUÍDA`, {
      fontFamily: FONT_BODY,
      fontSize: '11px',
      fontStyle: '800',
      color: '#f0fff6',
    })
    this.add.text(CONTENT_X + 26, bannerY + 34, `"${phase.title}"`, { fontFamily: FONT_HEADING, fontSize: '26px', color: '#ffffff' })
    if (success) {
      this.add.circle(CONTENT_X + CONTENT_W - 60, bannerY + bannerH / 2, 30, COLORS.white)
      this.add
        .text(CONTENT_X + CONTENT_W - 60, bannerY + bannerH / 2, '★'.repeat(Math.max(1, stars)), {
          fontFamily: FONT_HEADING,
          fontSize: '18px',
          fontStyle: '800',
          color: '#3fbf7f',
        })
        .setOrigin(0.5)
    }

    // estatísticas
    const statY = bannerY + bannerH + 26
    const statH = 96
    const gap = 18
    const statW = (CONTENT_W - gap * (statCards.length - 1)) / statCards.length
    statCards.forEach((sc, i) => statCard(this, CONTENT_X + i * (statW + gap), statY, statW, statH, sc))

    // conquista/motivo + curiosidade
    const rowY = statY + statH + 24
    const rowH = 140
    const colW = (CONTENT_W - 20) / 2

    card(this, CONTENT_X, rowY, colW, rowH, { radius: 18 })
    if (success && achievement) {
      card(this, CONTENT_X + 18, rowY + 20, 64, 64, { radius: 16, fill: COLORS.amber })
      this.add.text(CONTENT_X + 50, rowY + 52, '🏅', { fontSize: '26px' }).setOrigin(0.5)
      this.add.text(CONTENT_X + 96, rowY + 18, 'CONQUISTA DESBLOQUEADA', { fontFamily: FONT_BODY, fontSize: '10px', fontStyle: '800', color: '#8a8fa3' })
      this.add.text(CONTENT_X + 96, rowY + 32, achievement.name, { fontFamily: FONT_HEADING, fontSize: '17px', color: '#1b2a55' })
      this.add.text(CONTENT_X + 96, rowY + 58, achievement.text, {
        fontFamily: FONT_BODY,
        fontSize: '12px',
        color: '#5a6072',
        wordWrap: { width: colW - 120 },
      })
    } else {
      card(this, CONTENT_X + 18, rowY + 20, 64, 64, { radius: 16, fill: COLORS.red })
      this.add.text(CONTENT_X + 50, rowY + 52, '💡', { fontSize: '26px' }).setOrigin(0.5)
      this.add.text(CONTENT_X + 96, rowY + 18, 'O QUE ACONTECEU', { fontFamily: FONT_BODY, fontSize: '10px', fontStyle: '800', color: '#8a8fa3' })
      this.add.text(CONTENT_X + 96, rowY + 34, reason || 'A missão não foi concluída desta vez.', {
        fontFamily: FONT_BODY,
        fontSize: '13px',
        color: '#3a4160',
        wordWrap: { width: colW - 120 },
        lineSpacing: 3,
      })
    }

    const col2X = CONTENT_X + colW + 20
    card(this, col2X, rowY, colW, rowH, { radius: 18, fill: COLORS.navy })
    this.add.text(col2X + 20, rowY + 16, 'SABIA QUE NO MUNDO REAL...', { fontFamily: FONT_BODY, fontSize: '10px', fontStyle: '800', color: '#8fa5e8' })
    this.add.text(col2X + 20, rowY + 36, funFact || '', {
      fontFamily: FONT_BODY,
      fontSize: '12px',
      color: '#ffffff',
      wordWrap: { width: colW - 40 },
      lineSpacing: 3,
    })

    // botões
    const btnY = rowY + rowH + 24
    chunkyButton(this, w / 2 - 160, btnY, 140, 46, {
      radius: 14,
      fill: COLORS.white,
      shadow: COLORS.cardShadow,
      shadowOffset: 5,
      label: 'Menu',
      fontSize: '16px',
      textColor: '#1b2a55',
      onClick: () => this.scene.start('MainMenu'),
    })

    if (success && nextPhase) {
      chunkyButton(this, w / 2 + 20, btnY, 200, 46, {
        radius: 14,
        fill: COLORS.green,
        fillHover: 0x52d492,
        shadow: COLORS.greenDark,
        shadowOffset: 5,
        label: 'Próxima Fase →',
        fontSize: '15px',
        onClick: () => this.scene.start('Briefing', { phaseId: nextPhase.id }),
      })
    } else if (success) {
      chunkyButton(this, w / 2 + 20, btnY, 200, 46, {
        radius: 14,
        fill: COLORS.green,
        fillHover: 0x52d492,
        shadow: COLORS.greenDark,
        shadowOffset: 5,
        label: 'Jogar Novamente',
        fontSize: '15px',
        onClick: () => this.scene.start('Briefing', { phaseId: phase.id }),
      })
    } else {
      chunkyButton(this, w / 2 + 20, btnY, 200, 46, {
        radius: 14,
        fill: COLORS.amber,
        fillHover: 0xf7b64d,
        shadow: COLORS.amberDark,
        shadowOffset: 5,
        label: 'Tentar Novamente',
        fontSize: '15px',
        onClick: () => this.scene.start(phase.sceneKey),
      })
    }
  }
}
