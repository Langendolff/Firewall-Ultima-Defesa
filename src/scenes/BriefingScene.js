import Phaser from 'phaser'
import { COLORS, PHASES, ARCS, FONT_HEADING, FONT_BODY } from '../gameData.js'
import { card, chunkyButton } from '../ui.js'

// Briefing antes de cada fase: contexto, objetivo, ameaças, dica do técnico e
// glossário. O layout flui: cada bloco mede o próprio texto e o seguinte
// começa embaixo dele, então descrições longas nunca se sobrepõem. Se o
// conteúdo de uma fase não couber na tela, tudo é refeito com uma escala menor
// (fontes e espaçamentos) até caber; se sobrar espaço, fica centralizado.
const CONTENT_W = 1040
const MARGIN_Y = 24
const MIN_SCALE = 0.72

const RISK = {
  3: { label: 'RISCO ALTO', fill: COLORS.red, text: '#ffffff' },
  2: { label: 'RISCO MÉDIO', fill: COLORS.amber, text: '#1b2a55' },
  1: { label: 'RISCO BAIXO', fill: COLORS.panelLine, text: '#1b2a55' },
}

export default class BriefingScene extends Phaser.Scene {
  constructor() {
    super('Briefing')
  }

  init(data) {
    this.phase = PHASES[data?.phaseId ?? 1]
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.navy)
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

  /** Monta a tela inteira num Container, com fontes e espaços multiplicados por s. */
  layout(s) {
    const phase = this.phase
    const root = this.add.container(0, 0)
    const x0 = (this.scale.width - CONTENT_W) / 2
    const px = (n) => Math.round(n * s)
    const font = (n) => `${px(n)}px`
    const put = (obj) => {
      root.add(obj)
      return obj
    }
    const text = (x, y, str, style) => put(this.add.text(x, y, str, { fontFamily: FONT_BODY, ...style }))
    const label = (x, y, str, color = '#8a8fa3') => text(x, y, str, { fontSize: font(13), fontStyle: '800', color })
    const pad = px(22)
    const gap = px(14)

    let y = 0

    // ---- cabeçalho ----
    const badge = px(52)
    put(card(this, x0, y, badge, badge, { radius: 12, fill: COLORS.blue }))
    put(
      this.add
        .text(x0 + badge / 2, y + badge / 2, String(phase.id), { fontFamily: FONT_HEADING, fontSize: font(24), fontStyle: '800', color: '#ffffff' })
        .setOrigin(0.5),
    )
    const arc = ARCS.find((a) => a.phaseIds.includes(phase.id))
    label(x0 + badge + px(16), y + px(2), `RELATÓRIO DE INTELIGÊNCIA · FASE ${phase.id} DE 10 · ${arc?.subtitle.toUpperCase() ?? ''}`, '#8fa5e8')
    text(x0 + badge + px(16), y + px(18), `"${phase.title}"`, { fontFamily: FONT_HEADING, fontSize: font(32), color: '#ffffff' })
    y += badge + gap + px(4)

    // ---- blocos de largura total ----
    const block = (title, body, { fill = COLORS.white, bodyStyle = {}, titleColor = '#8a8fa3' } = {}) => {
      const bg = put(this.add.graphics())
      label(x0 + pad, y + px(16), title, titleColor)
      const t = text(x0 + pad, y + px(38), body, {
        fontSize: font(17),
        color: '#3a4160',
        wordWrap: { width: CONTENT_W - 2 * pad },
        lineSpacing: px(4),
        ...bodyStyle,
      })
      const h = px(38) + t.height + px(18)
      bg.fillStyle(fill, 1).fillRoundedRect(x0, y, CONTENT_W, h, px(18))
      y += h + gap
    }

    block('CONTEXTO', phase.narrative.join(' '))
    block('🎯 OBJETIVO DA MISSÃO', phase.objective, {
      fill: COLORS.amber,
      titleColor: '#1b2a55',
      bodyStyle: { fontSize: font(18), fontStyle: '700', color: '#1b2a55' },
    })

    // ---- ameaças | dica do técnico ----
    const colGap = px(16)
    const colW = (CONTENT_W - colGap) / 2
    const gridY = y
    const leftBg = put(this.add.graphics())
    const rightBg = put(this.add.graphics())

    label(x0 + pad, gridY + px(16), 'AMEAÇAS IDENTIFICADAS')
    let ty = gridY + px(44)
    phase.threats.forEach((threat) => {
      const risk = RISK[threat.level] ?? RISK[1]
      const iconR = px(17)
      put(this.add.circle(x0 + pad + iconR, ty + iconR, iconR, risk.fill).setStrokeStyle(px(3), COLORS.navy))
      put(
        this.add
          .text(x0 + pad + iconR, ty + iconR, '!', { fontFamily: FONT_HEADING, fontSize: font(18), fontStyle: '800', color: risk.text })
          .setOrigin(0.5),
      )
      const tx = x0 + pad + 2 * iconR + px(14)
      const pill = text(0, ty + px(1), risk.label, {
        fontSize: font(11),
        fontStyle: '800',
        color: risk.text,
        backgroundColor: `#${risk.fill.toString(16).padStart(6, '0')}`,
        padding: { x: px(8), y: px(3) },
      })
      pill.setX(x0 + colW - pad - pill.width)
      const name = text(tx, ty, threat.name, {
        fontSize: font(17),
        fontStyle: '800',
        color: '#1b2a55',
        wordWrap: { width: pill.x - tx - px(10) },
      })
      const desc = text(tx, ty + name.height + px(2), threat.desc, {
        fontSize: font(15),
        color: '#5a6072',
        wordWrap: { width: x0 + colW - pad - tx },
        lineSpacing: px(2),
      })
      ty += Math.max(2 * iconR, name.height + px(2) + desc.height) + px(16)
    })
    const leftH = ty - gridY + px(4)

    const rx = x0 + colW + colGap
    label(rx + pad, gridY + px(16), 'DICA DO TÉCNICO')
    const avatarX = rx + pad + px(34)
    const avatarY = gridY + px(84)
    this.drawTechnician(root, avatarX, avatarY, s)
    const tip = text(rx + pad + px(84), gridY + px(46), `"${phase.tip}"`, {
      fontSize: font(17),
      fontStyle: 'italic',
      color: '#3a4160',
      wordWrap: { width: colW - 2 * pad - px(84) },
      lineSpacing: px(4),
    })
    const rightH = Math.max(px(150), tip.y + tip.height - gridY + px(22))

    const gridH = Math.max(leftH, rightH)
    leftBg.fillStyle(COLORS.white, 1).fillRoundedRect(x0, gridY, colW, gridH, px(18))
    rightBg.fillStyle(COLORS.white, 1).fillRoundedRect(rx, gridY, colW, gridH, px(18))
    y = gridY + gridH + gap

    // ---- glossário, em duas colunas com linhas da altura do maior item ----
    const glossY = y
    const glossBg = put(this.add.graphics())
    label(x0 + pad, glossY + px(16), 'GLOSSÁRIO DA FASE')
    const gColW = (CONTENT_W - 2 * pad - px(24)) / 2
    let gy = glossY + px(42)
    for (let i = 0; i < phase.glossary.length; i += 2) {
      let rowH = 0
      phase.glossary.slice(i, i + 2).forEach((entry, col) => {
        const gx = x0 + pad + col * (gColW + px(24))
        const term = text(gx, gy, entry.term, { fontSize: font(16), fontStyle: '800', color: '#2f5bc7' })
        const desc = text(gx, gy + term.height, entry.desc, {
          fontSize: font(15),
          color: '#3a4160',
          wordWrap: { width: gColW },
          lineSpacing: px(2),
        })
        rowH = Math.max(rowH, term.height + desc.height)
      })
      gy += rowH + px(12)
    }
    const glossH = gy - glossY + px(8)
    glossBg.fillStyle(COLORS.white, 1).fillRoundedRect(x0, glossY, CONTENT_W, glossH, px(18))
    y = glossY + glossH + px(20)

    // ---- botões ----
    const btnH = px(58)
    const startW = px(300)
    const backW = px(170)
    const total = backW + px(20) + startW
    const bx = (this.scale.width - total) / 2
    const back = chunkyButton(this, bx, y, backW, btnH, {
      radius: px(18),
      fill: COLORS.white,
      fillHover: COLORS.panel,
      shadow: COLORS.pillShadow,
      shadowOffset: px(6),
      label: '← Fases',
      fontSize: font(19),
      textColor: '#1b2a55',
      onClick: () => this.scene.start('PhaseSelect'),
    })
    const start = chunkyButton(this, bx + backW + px(20), y, startW, btnH, {
      radius: px(18),
      fill: COLORS.amber,
      fillHover: 0xf7b64d,
      shadow: COLORS.amberDark,
      shadowOffset: px(6),
      label: 'INICIAR MISSÃO  ▶',
      fontSize: font(21),
      textColor: '#1b2a55',
      onClick: () => this.scene.start(phase.sceneKey),
    })
    root.add([back.graphics, back.text, start.graphics, start.text])
    y += btnH + px(6)

    root.contentH = y
    return root
  }

  /** O técnico que dá a dica: rosto com boné e headset, desenhado (sem emoji). */
  drawTechnician(root, x, y, s) {
    const g = this.add.graphics()
    const r = 30 * s
    // ombros / camiseta
    g.fillStyle(COLORS.blue, 1).fillRoundedRect(x - r * 1.15, y + r * 0.75, r * 2.3, r * 1.1, r * 0.5)
    g.lineStyle(3 * s, COLORS.navy, 1).strokeRoundedRect(x - r * 1.15, y + r * 0.75, r * 2.3, r * 1.1, r * 0.5)
    // rosto
    g.fillStyle(0xf2c9a0, 1).fillCircle(x, y, r)
    g.lineStyle(3 * s, COLORS.navy, 1).strokeCircle(x, y, r)
    // boné
    g.fillStyle(COLORS.green, 1)
    g.beginPath()
    g.arc(x, y - r * 0.15, r * 1.02, Math.PI, 0, false)
    g.closePath()
    g.fillPath()
    g.lineStyle(3 * s, COLORS.navy, 1).strokePath()
    g.fillStyle(COLORS.greenDark, 1).fillRoundedRect(x - r * 0.1, y - r * 0.28, r * 1.25, r * 0.26, r * 0.12)
    // olhos e sorriso
    g.fillStyle(COLORS.navy, 1).fillCircle(x - r * 0.35, y + r * 0.2, r * 0.11).fillCircle(x + r * 0.35, y + r * 0.2, r * 0.11)
    g.lineStyle(3 * s, COLORS.navy, 1)
    g.beginPath()
    g.arc(x, y + r * 0.3, r * 0.38, Phaser.Math.DegToRad(30), Phaser.Math.DegToRad(150), false)
    g.strokePath()
    // headset
    g.lineStyle(4 * s, COLORS.navy, 1)
    g.beginPath()
    g.arc(x, y, r * 1.12, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(250), false)
    g.strokePath()
    g.fillStyle(COLORS.navy, 1).fillCircle(x - r * 1.05, y + r * 0.05, r * 0.22)
    root.add(g)
  }
}
