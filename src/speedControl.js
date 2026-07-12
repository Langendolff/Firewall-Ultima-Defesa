import { COLORS } from './gameData.js'
import { chunkyButton } from './ui.js'

// timeScale aplicado a scene.time e scene.tweens — "normal" é mais lento que a
// duração bruta das tweens (que viram a referência de velocidade "rápida" x2.3).
const SPEED_SCALES = { normal: 0.65, fast: 1.5 }

// Botões de pausa/normal/rápido no HUD. Controla o ritmo da simulação via
// timeScale em vez de reescrever cada duração de tween/timer da cena.
export function buildSpeedControls(scene, x, y) {
  const state = { current: 'normal' }
  const buttons = {}

  const apply = (name) => {
    state.current = name
    if (name === 'paused') {
      scene.time.paused = true
      scene.tweens.pauseAll()
    } else {
      scene.time.paused = false
      scene.tweens.resumeAll()
      scene.time.timeScale = SPEED_SCALES[name]
      scene.tweens.timeScale = SPEED_SCALES[name]
    }
    Object.entries(buttons).forEach(([key, btn]) => {
      btn.setColors(key === name ? COLORS.amber : COLORS.white, key === name ? COLORS.amberDark : COLORS.pillShadow)
    })
  }

  const specs = [
    { key: 'paused', label: '⏸' },
    { key: 'normal', label: '▶' },
    { key: 'fast', label: '⏩' },
  ]
  specs.forEach((spec, i) => {
    buttons[spec.key] = chunkyButton(scene, x + i * 34, y, 28, 28, {
      radius: 8,
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
