import { COLORS } from './gameData.js'
import { chunkyButton } from './ui.js'
import { speedScales } from './difficulty.js'

// Botões de pausa/normal/rápido no HUD. Controla o ritmo da simulação via
// timeScale em vez de reescrever cada duração de tween/timer da cena. Os
// valores de timeScale vêm da dificuldade (difficulty.js): no Tranquilo o
// "normal" é mais lento.
//
// Os botões têm texto, não só ícone: quem não joga não reconhece ⏸ ⏩. Ficam
// sempre centralizados no HUD; x e y são aceitos só por compatibilidade.
const BTN_W = 92
const BTN_H = 30
const GAP = 8

export function buildSpeedControls(scene, _x, y = 11) {
  const state = { current: 'normal' }
  const buttons = {}
  const total = 3 * BTN_W + 2 * GAP
  const x0 = scene.scale.width / 2 - total / 2

  const apply = (name) => {
    state.current = name
    const scales = speedScales()
    if (name === 'paused') {
      scene.time.paused = true
      scene.tweens.pauseAll()
    } else {
      scene.time.paused = false
      scene.tweens.resumeAll()
      scene.time.timeScale = scales[name]
      scene.tweens.timeScale = scales[name]
    }
    Object.entries(buttons).forEach(([key, btn]) => {
      btn.setColors(key === name ? COLORS.amber : COLORS.white, key === name ? COLORS.amberDark : COLORS.pillShadow)
    })
  }

  const specs = [
    { key: 'paused', label: '❚❚ Pausar' },
    { key: 'normal', label: '▶ Normal' },
    { key: 'fast', label: '▶▶ Rápido' },
  ]
  specs.forEach((spec, i) => {
    buttons[spec.key] = chunkyButton(scene, x0 + i * (BTN_W + GAP), y, BTN_W, BTN_H, {
      radius: 9,
      fill: COLORS.white,
      shadow: COLORS.pillShadow,
      shadowOffset: 3,
      label: spec.label,
      fontSize: '13px',
      textColor: '#1b2a55',
      onClick: () => apply(spec.key),
    })
  })

  apply('normal')

  return {
    get current() {
      return state.current
    },
    set: apply,
  }
}
