import Phaser from 'phaser'
import { COLORS, FONT_HEADING, FONT_BODY } from './gameData.js'

// Botão "chunky" com sombra sólida embaixo (box-shadow: 0 Npx 0 color do mockup)
export function chunkyButton(scene, x, y, w, h, opts = {}) {
  const {
    radius = 16,
    fill = COLORS.amber,
    fillHover = fill,
    shadow = COLORS.amberDark,
    shadowOffset = 6,
    label = '',
    fontSize = '20px',
    textColor = '#ffffff',
    fontFamily = FONT_HEADING,
    onClick = null,
  } = opts

  // "resting" colors are mutable so toggle-style buttons (port panel) can
  // change their base state and have hover/out still respect it.
  let restFill = fill
  let restShadow = shadow

  const g = scene.add.graphics()
  const draw = (fillColor, shadowColor = restShadow) => {
    g.clear()
    g.fillStyle(shadowColor, 1)
    g.fillRoundedRect(x, y, w, h + shadowOffset, radius)
    g.fillStyle(fillColor, 1)
    g.fillRoundedRect(x, y, w, h, radius)
  }
  draw(restFill)

  const text = scene.add
    .text(x + w / 2, y + h / 2, label, {
      fontFamily,
      fontSize,
      color: textColor,
      fontStyle: '700',
    })
    .setOrigin(0.5)

  const setColors = (newFill, newShadow = newFill) => {
    restFill = newFill
    restShadow = newShadow
    draw(restFill, restShadow)
  }

  if (onClick) {
    g.setInteractive(new Phaser.Geom.Rectangle(x, y, w, h), Phaser.Geom.Rectangle.Contains)
    g.on('pointerover', () => draw(fillHover, restShadow))
    g.on('pointerout', () => draw(restFill, restShadow))
    g.on('pointerdown', onClick)
  }

  return { graphics: g, text, setColors }
}

// Painel branco arredondado (cards do mockup)
export function card(scene, x, y, w, h, opts = {}) {
  const { radius = 22, fill = COLORS.white } = opts
  return scene.add.graphics().fillStyle(fill, 1).fillRoundedRect(x, y, w, h, radius)
}

// Fundo em gradiente vertical de duas cores
export function skyGradient(scene, x, y, w, h, colorTop, colorBottom) {
  const g = scene.add.graphics()
  g.fillGradientStyle(colorTop, colorTop, colorBottom, colorBottom, 1)
  g.fillRect(x, y, w, h)
  return g
}

// Raio da área clicável de um pacote: maior que o desenho, para quem ainda não
// tem precisão com o mouse acertar um alvo em movimento.
export const PACKET_HIT_RADIUS = 26

// Token visual de um pacote de rede: círculo colorido + envelope + etiqueta da
// porta, agrupados num Container para que mova como uma unidade só nas tweens.
// setTag('red' | 'green') pinta o pacote com a classificação do IDS e mostra um
// selo "!" ou "✓": a forma diz o mesmo que a cor, para quem não distingue
// vermelho de verde.
export function packetToken(scene, x, y, port, color, icon = '✉️') {
  const container = scene.add.container(x, y)
  const circle = scene.add.circle(0, 0, 19, color).setStrokeStyle(3, COLORS.navy)
  const iconText = scene.add.text(0, -1, icon, { fontSize: '16px' }).setOrigin(0.5)
  const label = scene.add
    .text(0, 27, String(port), {
      fontFamily: FONT_BODY,
      fontSize: '12px',
      fontStyle: '800',
      color: '#1b2a55',
      backgroundColor: '#ffffff',
      padding: { x: 4, y: 1 },
    })
    .setOrigin(0.5)
  const badge = scene.add.circle(15, -15, 9, COLORS.white).setStrokeStyle(2, COLORS.navy).setVisible(false)
  const badgeText = scene.add
    .text(15, -15, '', { fontFamily: FONT_HEADING, fontSize: '13px', fontStyle: '800', color: '#1b2a55' })
    .setOrigin(0.5)
    .setVisible(false)
  container.add([circle, iconText, label, badge, badgeText])
  container.circle = circle
  container.setTag = (tag) => {
    const red = tag === 'red'
    circle.setFillStyle(red ? COLORS.red : COLORS.green)
    badge.setStrokeStyle(2, red ? COLORS.redDark : COLORS.greenDark).setVisible(true)
    badgeText.setText(red ? '!' : '✓').setColor(red ? '#b5432f' : '#2e9863').setVisible(true)
  }
  return container
}

// Marca que sobe e some sobre o ponto onde algo aconteceu (✔ acerto, ✖ erro),
// para ligar a ação do jogador à consequência no mesmo lugar da tela.
export function floatMark(scene, x, y, good, text = good ? '✔' : '✖') {
  const mark = scene.add
    .text(x, y - 10, text, {
      fontFamily: FONT_HEADING,
      fontSize: '22px',
      fontStyle: '800',
      color: good ? '#2e9863' : '#e4573d',
      stroke: '#ffffff',
      strokeThickness: 5,
    })
    .setOrigin(0.5)
    .setDepth(40)
  scene.tweens.add({ targets: mark, y: y - 46, alpha: 0, duration: 900, ease: 'Cubic.easeOut', onComplete: () => mark.destroy() })
}

// Janela modal centralizada com fundo escurecido, título e botão "Fechar".
// Devolve { x, y, w, h, add(obj), close() }; add() põe o objeto na camada da
// janela e o destrói junto ao fechar.
export function modal(scene, { title, width = 560, height = 420, onClose } = {}) {
  const { width: sw, height: sh } = scene.scale
  const x = (sw - width) / 2
  const y = (sh - height) / 2
  const objects = []
  const add = (obj) => {
    obj.setDepth?.(Math.max(obj.depth ?? 0, 101))
    objects.push(obj)
    return obj
  }
  const close = () => {
    objects.forEach((o) => o.destroy())
    onClose?.()
  }

  objects.push(scene.add.rectangle(0, 0, sw, sh, 0x000000, 0.55).setOrigin(0).setInteractive().setDepth(100))
  add(card(scene, x, y, width, height, { radius: 22 }))
  add(scene.add.text(x + 28, y + 24, title, { fontFamily: FONT_HEADING, fontSize: '24px', fontStyle: '800', color: '#1b2a55' }))
  const btn = chunkyButton(scene, x + width / 2 - 80, y + height - 66, 160, 44, {
    radius: 14,
    fill: COLORS.amber,
    fillHover: 0xf7b64d,
    shadow: COLORS.amberDark,
    shadowOffset: 5,
    label: 'Fechar',
    fontSize: '17px',
    textColor: '#1b2a55',
    onClick: close,
  })
  add(btn.graphics)
  add(btn.text).setDepth(102)
  return { x, y, w: width, h: height, add, close }
}

// Botão de HUD para sair da fase e voltar ao menu. Mata tweens/timers
// pendentes antes de trocar de cena — a Scene é reaproveitada entre
// partidas, e timers vazados de uma fase abandonada corrompem a próxima.
export function backButton(scene, x, y) {
  return chunkyButton(scene, x, y, 36, 36, {
    radius: 10,
    fill: COLORS.white,
    shadow: COLORS.pillShadow,
    shadowOffset: 3,
    label: '🏠',
    fontSize: '16px',
    onClick: () => {
      scene.tweens.killAll()
      scene.time.removeAllEvents()
      scene.scene.start('MainMenu')
    },
  })
}

// Cartão de estatística (número grande + rótulo), usado no debriefing
export function statCard(scene, x, y, w, h, { value, label, color }) {
  card(scene, x, y, w, h, { radius: 16 })
  scene.add
    .text(x + w / 2, y + h * 0.38, String(value), {
      fontFamily: FONT_HEADING,
      fontSize: '28px',
      fontStyle: '800',
      color,
    })
    .setOrigin(0.5)
  scene.add
    .text(x + w / 2, y + h * 0.72, label, {
      fontFamily: FONT_BODY,
      fontSize: '12px',
      fontStyle: '700',
      color: '#8a8fa3',
      align: 'center',
      wordWrap: { width: w - 16 },
    })
    .setOrigin(0.5)
}
