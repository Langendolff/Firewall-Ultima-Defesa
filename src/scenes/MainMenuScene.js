import Phaser from 'phaser'
import { COLORS, PHASES, FONT_HEADING, FONT_BODY } from '../gameData.js'
import { card, chunkyButton, skyGradient, modal } from '../ui.js'
import { DIFFICULTIES, currentDifficulty, setDifficulty } from '../difficulty.js'
import { getCompleted, resetProgress } from '../progress.js'

const float = (scene, target, dy = 8, duration = 2200) => {
  scene.tweens.add({ targets: target, y: target.y - dy, duration, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
}

const GROUND_Y = 720

export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenu')
  }

  create() {
    const { width: w, height: h } = this.scale

    skyGradient(this, 0, 0, w, h, COLORS.sky, COLORS.grassLight)

    // nuvens
    const cloud1 = this.add.ellipse(160, 110, 170, 58, COLORS.white, 0.9)
    const cloud2 = this.add.ellipse(300, 150, 100, 40, COLORS.white, 0.85)
    const cloud3 = this.add.ellipse(w - 180, 130, 190, 62, COLORS.white, 0.85)
    const cloud4 = this.add.ellipse(w - 380, 250, 110, 38, COLORS.white, 0.7)
    float(this, cloud1, 6, 3200)
    float(this, cloud2, 5, 3800)
    float(this, cloud3, 7, 4200)
    float(this, cloud4, 5, 3600)

    // chão até a borda de baixo da tela
    this.add.rectangle(w / 2, GROUND_Y + (h - GROUND_Y) / 2, w, h - GROUND_Y, COLORS.grassGround)
    this.add.rectangle(w / 2, GROUND_Y, w, 6, COLORS.grassGroundLine)

    // selo
    chunkyButton(this, w / 2 - 170, 80, 340, 36, {
      radius: 18,
      fill: COLORS.blueDark,
      shadow: COLORS.blueDarker,
      shadowOffset: 4,
      label: 'EDUCAÇÃO EM CIBERSEGURANÇA',
      fontSize: '14px',
      fontFamily: FONT_HEADING,
    })

    // título
    this.add
      .text(w / 2, 200, 'FIREWALL', {
        fontFamily: FONT_HEADING,
        fontSize: '96px',
        fontStyle: '800',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setStroke('#1b2a55', 7)
      .setShadow(0, 8, '#1b2a55', 0, true, true)

    chunkyButton(this, w / 2 - 130, 262, 260, 44, {
      radius: 14,
      fill: COLORS.amber,
      shadow: COLORS.amberDark,
      shadowOffset: 5,
      label: 'A Última Defesa',
      fontSize: '22px',
      textColor: '#1b2a55',
    })

    // casa com roteador, apoiada no chão
    const houseX = 200
    const houseTop = GROUND_Y - 120
    this.add.rectangle(houseX, houseTop + 60, 170, 120, COLORS.white).setStrokeStyle(6, COLORS.navy)
    const roof = this.add.graphics()
    roof.fillStyle(COLORS.red, 1).fillTriangle(houseX - 105, houseTop + 3, houseX + 105, houseTop + 3, houseX, houseTop - 80)
    roof.lineStyle(6, COLORS.navy, 1).strokeTriangle(houseX - 105, houseTop + 3, houseX + 105, houseTop + 3, houseX, houseTop - 80)
    const router = this.add.rectangle(houseX, houseTop + 62, 64, 64, COLORS.blue).setStrokeStyle(5, COLORS.navy)
    this.add.rectangle(houseX - 14, houseTop + 22, 5, 18, COLORS.navy)
    this.add.rectangle(houseX + 14, houseTop + 22, 5, 18, COLORS.navy)
    float(this, router, 4, 2600)

    // mascote escudo
    const shieldContainer = this.add.container(w - 210, GROUND_Y - 90)
    const shieldBody = this.add.ellipse(0, 0, 150, 166, COLORS.green).setStrokeStyle(7, COLORS.navy)
    const eyeL = this.add.ellipse(-28, -10, 16, 22, COLORS.navy)
    const eyeR = this.add.ellipse(28, -10, 16, 22, COLORS.navy)
    const smile = this.add.graphics().lineStyle(6, COLORS.navy, 1)
    smile.beginPath()
    smile.arc(0, 14, 26, Phaser.Math.DegToRad(25), Phaser.Math.DegToRad(155), false)
    smile.strokePath()
    shieldContainer.add([shieldBody, eyeL, eyeR, smile])
    float(this, shieldContainer, 10, 2400)

    // botão jogar
    chunkyButton(this, w / 2 - 140, 380, 280, 72, {
      radius: 22,
      fill: COLORS.amber,
      fillHover: 0xf7b64d,
      shadow: COLORS.amberDark,
      shadowOffset: 8,
      label: 'JOGAR',
      fontSize: '34px',
      onClick: () => this.scene.start('PhaseSelect'),
    })

    const secondary = [
      { label: '🏆 Conquistas', onClick: () => this.openAchievements() },
      { label: '⚙ Opções', onClick: () => this.openOptions() },
      { label: 'Créditos', onClick: () => this.openCredits() },
    ]
    const sw = 170
    const sgap = 20
    const sx = w / 2 - (secondary.length * sw + (secondary.length - 1) * sgap) / 2
    secondary.forEach(({ label, onClick }, i) => {
      chunkyButton(this, sx + i * (sw + sgap), 490, sw, 46, {
        radius: 14,
        fill: COLORS.white,
        fillHover: COLORS.panel,
        shadow: COLORS.pillShadow,
        shadowOffset: 4,
        label,
        fontSize: '17px',
        textColor: '#1b2a55',
        onClick,
      })
    })

    this.difficultyText = this.add
      .text(w / 2, 575, '', { fontFamily: FONT_BODY, fontSize: '16px', fontStyle: '700', color: '#1b2a55' })
      .setOrigin(0.5)
    this.refreshDifficultyText()

    this.add.text(w - 46, h - 28, 'v1.1', { fontFamily: FONT_BODY, fontSize: '13px', color: '#1b2a55' }).setAlpha(0.6)
  }

  refreshDifficultyText() {
    this.difficultyText.setText(`Dificuldade: ${DIFFICULTIES[currentDifficulty()].label} · mude em Opções`)
  }

  openOptions() {
    const m = modal(this, { title: 'Opções', width: 640, height: 470, onClose: () => this.refreshDifficultyText() })
    m.add(this.add.text(m.x + 28, m.y + 70, 'DIFICULDADE', { fontFamily: FONT_BODY, fontSize: '13px', fontStyle: '800', color: '#8a8fa3' }))

    const cards = []
    const draw = () => {
      cards.forEach(({ key, g, x, y, cw, ch }) => {
        const selected = currentDifficulty() === key
        g.clear()
        g.fillStyle(selected ? 0xfff4e0 : COLORS.panel, 1).fillRoundedRect(x, y, cw, ch, 16)
        g.lineStyle(4, selected ? COLORS.amber : COLORS.panelLine, 1).strokeRoundedRect(x, y, cw, ch, 16)
      })
    }
    Object.entries(DIFFICULTIES).forEach(([key, diff], i) => {
      const cw = (m.w - 56 - 20) / 2
      const ch = 170
      const x = m.x + 28 + i * (cw + 20)
      const y = m.y + 96
      const g = m.add(this.add.graphics())
      m.add(this.add.text(x + 18, y + 16, diff.label, { fontFamily: FONT_HEADING, fontSize: '22px', fontStyle: '800', color: '#1b2a55' }))
      m.add(
        this.add.text(x + 18, y + 52, diff.desc, {
          fontFamily: FONT_BODY,
          fontSize: '15px',
          color: '#3a4160',
          wordWrap: { width: cw - 36 },
          lineSpacing: 2,
        }),
      )
      const zone = m.add(this.add.zone(x, y, cw, ch).setOrigin(0).setInteractive({ useHandCursor: true }))
      zone.on('pointerdown', () => {
        setDifficulty(key)
        draw()
      })
      cards.push({ key, g, x, y, cw, ch })
    })
    draw()

    let armed = false
    const reset = chunkyButton(this, m.x + 28, m.y + 290, 220, 40, {
      radius: 12,
      fill: COLORS.white,
      fillHover: COLORS.redSoft,
      shadow: COLORS.pillShadow,
      shadowOffset: 4,
      label: 'Apagar progresso',
      fontSize: '15px',
      textColor: '#b5432f',
      onClick: () => {
        if (!armed) {
          armed = true
          reset.text.setText('Clique de novo para confirmar')
          return
        }
        resetProgress()
        reset.text.setText('Progresso apagado')
      },
    })
    m.add(reset.graphics)
    m.add(reset.text).setDepth(102)
    m.add(
      this.add.text(m.x + 264, m.y + 300, 'Volta todas as fases para o início.', { fontFamily: FONT_BODY, fontSize: '14px', color: '#8a8fa3' }),
    )
  }

  openAchievements() {
    const done = getCompleted()
    const m = modal(this, { title: `Conquistas · ${done.length} de 10`, width: 820, height: 660 })
    Object.values(PHASES).forEach((phase, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const x = m.x + 28 + col * 390
      const y = m.y + 78 + row * 96
      const got = done.includes(phase.id)
      m.add(card(this, x, y, 374, 84, { radius: 14, fill: got ? 0xfff4e0 : COLORS.panel }))
      m.add(this.add.text(x + 34, y + 42, got ? '🏆' : '🔒', { fontSize: '30px' }).setOrigin(0.5))
      m.add(
        this.add.text(x + 66, y + 12, got ? phase.achievement.name : `Fase ${phase.id}: ${phase.title}`, {
          fontFamily: FONT_HEADING,
          fontSize: '17px',
          fontStyle: '800',
          color: got ? '#1b2a55' : '#8a8fa3',
        }),
      )
      m.add(
        this.add.text(x + 66, y + 38, got ? `Fase ${phase.id} concluída` : `Conclua a fase ${phase.id} para ganhar.`, {
          fontFamily: FONT_BODY,
          fontSize: '14px',
          color: got ? '#3a4160' : '#8a8fa3',
          wordWrap: { width: 290 },
        }),
      )
    })
  }

  openCredits() {
    const m = modal(this, { title: 'Créditos', width: 600, height: 370 })
    m.add(
      this.add.text(
        m.x + 28,
        m.y + 76,
        'Firewall: A Última Defesa\nUm jogo educativo sobre segurança de redes.\n\nDesign, roteiro e programação: Lorenzo Langendolff Cardoso\nFeito com Phaser 4 e Vite.\nFontes: Baloo 2 e Nunito (Google Fonts).\nLicença: PolyForm Noncommercial 1.0.0.',
        { fontFamily: FONT_BODY, fontSize: '16px', color: '#1b2a55', lineSpacing: 6 },
      ),
    )
  }
}
