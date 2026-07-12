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

// Token visual de um pacote de rede: círculo colorido + envelope + porta,
// agrupados num Container para que mova como uma unidade só nas tweens.
export function packetToken(scene, x, y, port, color) {
  const container = scene.add.container(x, y)
  const circle = scene.add.circle(0, 0, 15, color).setStrokeStyle(3, COLORS.navy)
  const icon = scene.add.text(0, -3, '✉️', { fontSize: '13px' }).setOrigin(0.5)
  const label = scene.add
    .text(0, 14, String(port), { fontFamily: FONT_BODY, fontSize: '9px', fontStyle: '800', color: '#1b2a55' })
    .setOrigin(0.5)
  container.add([circle, icon, label])
  container.circle = circle
  return container
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
