import Phaser from 'phaser'
import { COLORS, PHASES, FONT_HEADING, FONT_BODY } from '../gameData.js'
import { chunkyButton } from '../ui.js'
import { completePhase } from '../progress.js'

// Debriefing depois de cada fase. Mesmo princípio do briefing: o layout flui
// pela altura real de cada texto, fica centralizado na tela e encolhe só se
// não couber. Na derrota, além do motivo, mostra a dica do técnico para a
// próxima tentativa: quem não joga precisa saber o que fazer diferente.
const CONTENT_W = 1040
const MARGIN_Y = 24
const MIN_SCALE = 0.75

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
    this.cameras.main.setBackgroundColor(COLORS.cream)
    const available = this.scale.height - 2 * MARGIN_Y
    let scale = 1
    let root = this.layout(scale)
    while (root.contentH > available && scale > MIN_SCALE) {
      root.destroy()
      scale -= 0.04
      root = this.layout(scale)
    }
    root.y = Math.max(MARGIN_Y, (this.scale.height - root.contentH) / 2)
  }

  layout(s) {
    const { success, statCards = [], achievement, reason, funFact } = this.data_
    const phase = this.phase
    const nextPhase = PHASES[phase.id + 1]
    const root = this.add.container(0, 0)
    const x0 = (this.scale.width - CONTENT_W) / 2
    const px = (n) => Math.round(n * s)
    const font = (n) => `${px(n)}px`
    const put = (obj) => {
      root.add(obj)
      return obj
    }
    const text = (x, y, str, style) => put(this.add.text(x, y, str, { fontFamily: FONT_BODY, ...style }))
    const pad = px(24)
    const gap = px(18)
    let y = 0

    // ---- faixa de resultado ----
    const bannerH = px(104)
    const bannerColor = success ? COLORS.green : COLORS.red
    const bannerShadow = success ? COLORS.greenDark : COLORS.redDark
    const banner = put(this.add.graphics())
    banner.fillStyle(bannerShadow, 1).fillRoundedRect(x0, y, CONTENT_W, bannerH + px(6), px(20))
    banner.fillStyle(bannerColor, 1).fillRoundedRect(x0, y, CONTENT_W, bannerH, px(20))
    text(x0 + pad + px(4), y + px(20), success ? `FASE ${phase.id} CONCLUÍDA` : `FASE ${phase.id} NÃO CONCLUÍDA`, {
      fontSize: font(14),
      fontStyle: '800',
      color: '#ffffff',
    }).setAlpha(0.9)
    text(x0 + pad + px(4), y + px(42), `"${phase.title}"`, { fontFamily: FONT_HEADING, fontSize: font(36), color: '#ffffff' })
    if (success) {
      for (let i = 0; i < 3; i++) {
        const sx = x0 + CONTENT_W - pad - px(30) - (2 - i) * px(58)
        put(this.add.star(sx, y + bannerH / 2, 5, px(11), px(25), COLORS.amber).setStrokeStyle(px(3), COLORS.amberDark))
      }
    } else {
      text(x0 + CONTENT_W - pad, y + bannerH / 2, 'Tudo bem errar: é assim que se aprende.', {
        fontSize: font(16),
        fontStyle: '700',
        color: '#ffffff',
      }).setOrigin(1, 0.5)
    }
    y += bannerH + px(6) + gap

    // ---- estatísticas ----
    if (statCards.length) {
      const sgap = px(16)
      const sw = (CONTENT_W - sgap * (statCards.length - 1)) / statCards.length
      const sh = px(112)
      statCards.forEach((sc, i) => {
        const sx = x0 + i * (sw + sgap)
        put(this.add.graphics().fillStyle(COLORS.white, 1).fillRoundedRect(sx, y, sw, sh, px(18)))
        put(
          this.add
            .text(sx + sw / 2, y + px(40), String(sc.value), { fontFamily: FONT_HEADING, fontSize: font(40), fontStyle: '800', color: sc.color })
            .setOrigin(0.5),
        )
        put(
          this.add
            .text(sx + sw / 2, y + px(84), sc.label, {
              fontFamily: FONT_BODY,
              fontSize: font(15),
              fontStyle: '700',
              color: '#5a6072',
              align: 'center',
              wordWrap: { width: sw - px(20) },
            })
            .setOrigin(0.5),
        )
      })
      y += sh + gap
    }

    // ---- conquista ou motivo + dica | curiosidade ----
    const colGap = px(18)
    const colW = (CONTENT_W - colGap) / 2
    const rowY = y
    const leftBg = put(this.add.graphics())
    const rightBg = put(this.add.graphics())
    const iconS = px(68)
    const ix = x0 + pad
    const tx = ix + iconS + px(18)
    const tw = x0 + colW - pad - tx
    let ly = rowY + pad

    const heading = (x, yy, str, color = '#8a8fa3') => text(x, yy, str, { fontSize: font(13), fontStyle: '800', color })

    if (success && achievement) {
      this.drawMedal(root, ix + iconS / 2, rowY + pad + iconS / 2, iconS)
      heading(tx, ly, 'CONQUISTA DESBLOQUEADA')
      const name = text(tx, ly + px(20), achievement.name, { fontFamily: FONT_HEADING, fontSize: font(22), color: '#1b2a55' })
      const body = text(tx, name.y + name.height + px(4), achievement.text, {
        fontSize: font(16),
        color: '#3a4160',
        wordWrap: { width: tw },
        lineSpacing: px(3),
      })
      ly = body.y + body.height
    } else {
      this.drawAlert(root, ix + iconS / 2, rowY + pad + iconS / 2, iconS)
      heading(tx, ly, 'O QUE ACONTECEU')
      const body = text(tx, ly + px(22), reason || 'A missão não foi concluída desta vez.', {
        fontSize: font(17),
        color: '#1b2a55',
        wordWrap: { width: tw },
        lineSpacing: px(3),
      })
      heading(tx, body.y + body.height + px(16), 'PARA A PRÓXIMA TENTATIVA', '#c17e0f')
      const tip = text(tx, body.y + body.height + px(38), phase.tip, {
        fontSize: font(16),
        fontStyle: 'italic',
        color: '#3a4160',
        wordWrap: { width: tw },
        lineSpacing: px(3),
      })
      ly = tip.y + tip.height
    }
    const leftH = Math.max(ly - rowY + pad, iconS + 2 * pad)

    const rx = x0 + colW + colGap
    heading(rx + pad, rowY + pad, 'SABIA QUE NO MUNDO REAL...', '#8fa5e8')
    const fact = text(rx + pad, rowY + pad + px(24), funFact || '', {
      fontSize: font(17),
      color: '#ffffff',
      wordWrap: { width: colW - 2 * pad },
      lineSpacing: px(4),
    })
    const rightH = fact.y + fact.height - rowY + pad

    const rowH = Math.max(leftH, rightH)
    leftBg.fillStyle(COLORS.white, 1).fillRoundedRect(x0, rowY, colW, rowH, px(18))
    rightBg.fillStyle(COLORS.navy, 1).fillRoundedRect(rx, rowY, colW, rowH, px(18))
    y = rowY + rowH + px(26)

    // ---- botões ----
    const btnH = px(58)
    const specs = [{ label: 'Menu', w: 160, style: 'white', onClick: () => this.scene.start('MainMenu') }]
    if (success) {
      specs.push({ label: 'Jogar de novo', w: 210, style: 'white', onClick: () => this.scene.start('Briefing', { phaseId: phase.id }) })
      if (nextPhase) specs.push({ label: 'Próxima fase  →', w: 260, style: 'green', onClick: () => this.scene.start('Briefing', { phaseId: nextPhase.id }) })
    } else {
      specs.push({ label: 'Rever briefing', w: 210, style: 'white', onClick: () => this.scene.start('Briefing', { phaseId: phase.id }) })
      specs.push({ label: 'Tentar de novo  ↻', w: 260, style: 'amber', onClick: () => this.scene.start(phase.sceneKey) })
    }
    const styles = {
      white: { fill: COLORS.white, fillHover: COLORS.panel, shadow: COLORS.pillShadow, textColor: '#1b2a55' },
      green: { fill: COLORS.green, fillHover: 0x52d492, shadow: COLORS.greenDark, textColor: '#ffffff' },
      amber: { fill: COLORS.amber, fillHover: 0xf7b64d, shadow: COLORS.amberDark, textColor: '#1b2a55' },
    }
    const bgap = px(18)
    const total = specs.reduce((sum, b) => sum + px(b.w), 0) + bgap * (specs.length - 1)
    let bx = (this.scale.width - total) / 2
    specs.forEach((b) => {
      const btn = chunkyButton(this, bx, y, px(b.w), btnH, {
        radius: px(18),
        shadowOffset: px(6),
        label: b.label,
        fontSize: font(19),
        onClick: b.onClick,
        ...styles[b.style],
      })
      root.add([btn.graphics, btn.text])
      bx += px(b.w) + bgap
    })
    y += btnH + px(6)

    root.contentH = y
    return root
  }

  /** Medalha desenhada: fitas + disco com estrela. */
  drawMedal(root, x, y, size) {
    const r = size * 0.36
    const g = this.add.graphics()
    g.fillStyle(COLORS.blue, 1).fillTriangle(x - r * 0.9, y - size * 0.5, x - r * 0.1, y - size * 0.5, x, y)
    g.fillStyle(COLORS.red, 1).fillTriangle(x + r * 0.9, y - size * 0.5, x + r * 0.1, y - size * 0.5, x, y)
    g.fillStyle(COLORS.amber, 1).fillCircle(x, y + size * 0.1, r)
    g.lineStyle(Math.max(2, size * 0.05), COLORS.amberDark, 1).strokeCircle(x, y + size * 0.1, r)
    root.add(g)
    root.add(this.add.star(x, y + size * 0.1, 5, r * 0.3, r * 0.65, COLORS.white))
  }

  /** Alerta desenhado: círculo vermelho com "!". */
  drawAlert(root, x, y, size) {
    root.add(this.add.circle(x, y, size * 0.46, COLORS.redSoft))
    root.add(this.add.circle(x, y, size * 0.34, COLORS.red))
    root.add(
      this.add
        .text(x, y, '!', { fontFamily: FONT_HEADING, fontSize: `${Math.round(size * 0.46)}px`, fontStyle: '800', color: '#ffffff' })
        .setOrigin(0.5),
    )
  }
}
