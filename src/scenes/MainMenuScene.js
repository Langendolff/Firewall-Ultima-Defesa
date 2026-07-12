import Phaser from 'phaser'
import { COLORS, FONT_HEADING, FONT_BODY } from '../gameData.js'
import { chunkyButton, skyGradient } from '../ui.js'

const float = (scene, target, dy = 8, duration = 2200) => {
  scene.tweens.add({ targets: target, y: target.y - dy, duration, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
}

export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenu')
  }

  create() {
    const { width: w, height: h } = this.scale

    skyGradient(this, 0, 0, w, h, COLORS.sky, COLORS.grassLight)

    // nuvens
    const cloud1 = this.add.ellipse(120, 70, 130, 46, COLORS.white, 0.9)
    const cloud2 = this.add.ellipse(230, 100, 80, 34, COLORS.white, 0.85)
    const cloud3 = this.add.ellipse(w - 130, 85, 150, 50, COLORS.white, 0.85)
    float(this, cloud1, 6, 3200)
    float(this, cloud2, 5, 3800)
    float(this, cloud3, 7, 4200)

    // chão
    this.add.rectangle(w / 2, 580, w, 120, COLORS.grassGround)
    this.add.rectangle(w / 2, 520, w, 5, COLORS.grassGroundLine)

    // selo
    chunkyButton(this, w / 2 - 140, 32, 280, 30, {
      radius: 15,
      fill: COLORS.blueDark,
      shadow: COLORS.blueDarker,
      shadowOffset: 4,
      label: 'EDUCAÇÃO EM CIBERSEGURANÇA',
      fontSize: '11px',
      fontFamily: FONT_HEADING,
    })

    // título
    this.add
      .text(w / 2, 118, 'FIREWALL', {
        fontFamily: FONT_HEADING,
        fontSize: '62px',
        fontStyle: '800',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setStroke('#1b2a55', 5)
      .setShadow(0, 6, '#1b2a55', 0, true, true)

    chunkyButton(this, w / 2 - 100, 158, 200, 36, {
      radius: 12,
      fill: COLORS.amber,
      shadow: COLORS.amberDark,
      shadowOffset: 4,
      label: 'A Última Defesa',
      fontSize: '18px',
      textColor: '#1b2a55',
    })

    // casa com roteador
    const houseX = 140
    const houseTop = 430
    this.add.rectangle(houseX, houseTop + 45, 130, 90, COLORS.white).setStrokeStyle(5, COLORS.navy)
    const router = this.add.rectangle(houseX, houseTop + 45, 52, 52, COLORS.blue).setStrokeStyle(4, COLORS.navy)
    this.add.rectangle(houseX - 12, houseTop + 12, 4, 14, COLORS.navy)
    this.add.rectangle(houseX + 12, houseTop + 12, 4, 14, COLORS.navy)
    float(this, router, 4, 2600)

    // mascote escudo
    const shieldX = w - 150
    const shieldContainer = this.add.container(shieldX, houseTop + 30)
    const shieldBody = this.add.ellipse(0, 0, 118, 130, COLORS.green).setStrokeStyle(6, COLORS.navy)
    const eyeL = this.add.ellipse(-22, -6, 13, 17, COLORS.navy)
    const eyeR = this.add.ellipse(22, -6, 13, 17, COLORS.navy)
    const chin = this.add.rectangle(0, 58, 26, 12, COLORS.navy)
    shieldContainer.add([shieldBody, eyeL, eyeR, chin])
    float(this, shieldContainer, 10, 2400)

    // botão jogar
    chunkyButton(this, w / 2 - 110, 300, 220, 56, {
      radius: 18,
      fill: COLORS.amber,
      fillHover: 0xf7b64d,
      shadow: COLORS.amberDark,
      shadowOffset: 7,
      label: 'JOGAR',
      fontSize: '26px',
      onClick: () => this.scene.start('PhaseSelect'),
    })

    // botões secundários (visual, sem conteúdo ainda)
    const secondary = [
      { label: '🏆 Conquistas', x: w / 2 - 190 },
      { label: '⚙ Opções', x: w / 2 - 55 },
      { label: 'Créditos', x: w / 2 + 80 },
    ]
    secondary.forEach(({ label, x }) => {
      chunkyButton(this, x, 375, 110, 34, {
        radius: 12,
        fill: COLORS.white,
        shadow: COLORS.pillShadow,
        shadowOffset: 4,
        label,
        fontSize: '13px',
        textColor: '#1b2a55',
      })
    })

    this.add.text(w - 46, h - 24, 'v1.0', { fontFamily: FONT_BODY, fontSize: '12px', color: '#1b2a55' }).setAlpha(0.6)
  }
}
