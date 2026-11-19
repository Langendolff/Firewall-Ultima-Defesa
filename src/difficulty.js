// Dificuldade: "Tranquilo" (padrão, pensado para quem não costuma jogar) e
// "Desafio" (os valores originais de gameData.js).
//
// A dificuldade não muda o que a fase ensina nem como se vence: só dá mais
// tempo e mais margem. Ela age em dois lugares:
//   - ritmo: o timeScale "normal" e "rápido" de speedControl.js;
//   - valores de ajuste das fases: applyDifficulty() reescreve os campos
//     numéricos de PHASE_N a partir de uma cópia dos valores originais, então
//     aplicar de novo nunca acumula.
import { PHASES } from './gameData.js'

const KEY = 'firewall-game:difficulty'

export const DEFAULT_DIFFICULTY = 'tranquilo'

export const DIFFICULTIES = {
  tranquilo: {
    label: 'Tranquilo',
    desc: 'Pacotes mais lentos, o IDS erra menos e você tem mais tempo para reagir. Recomendado para começar.',
    speed: { normal: 0.45, fast: 1.0 },
    multiply: {
      // o IDS erra metade das vezes
      idsErrorChance: 0.5,
      // mais tempo para isolar um PC / conter um worm / achar um APT
      quarantineWindowMs: 1.5,
      wormQuarantineWindowMs: 1.5,
      aptDormancyMinMs: 1.5,
      aptDormancyMaxMs: 1.5,
      // equipamentos derrubados voltam mais rápido
      pcDownMs: 0.6,
      serverDownMs: 0.6,
      serviceDownMs: 0.6,
      recordsDownMs: 0.6,
      adminDownMs: 0.6,
      atmDownMs: 0.6,
      systemDownMs: 0.6,
    },
    add: {
      // Fase 9: uma fraude a mais tolerada
      fraudLimit: 1,
    },
  },
  desafio: {
    label: 'Desafio',
    desc: 'O ritmo e os erros do IDS originais. Para quem já domina as fases.',
    speed: { normal: 0.65, fast: 1.5 },
    multiply: {},
    add: {},
  },
}

// Cópia dos valores originais, tirada antes de qualquer applyDifficulty().
const BASE = new Map(Object.values(PHASES).map((phase) => [phase, { ...phase }]))

/** Reescreve os valores de ajuste de cada fase para a dificuldade dada. */
export function applyDifficulty(level, phases = PHASES) {
  const diff = DIFFICULTIES[level] ?? DIFFICULTIES[DEFAULT_DIFFICULTY]
  for (const phase of Object.values(phases)) {
    const base = BASE.get(phase) ?? { ...phase }
    if (!BASE.has(phase)) BASE.set(phase, base)
    for (const [key, value] of Object.entries(base)) {
      if (typeof value !== 'number') continue
      let next = value
      if (key in diff.multiply) next = value * diff.multiply[key]
      if (key in diff.add) next = value + diff.add[key]
      if (key.endsWith('Ms')) next = Math.round(next)
      phase[key] = next
    }
  }
}

/** A dificuldade salva no navegador, ou a padrão. */
export function getDifficulty() {
  try {
    const saved = localStorage.getItem(KEY)
    return saved in DIFFICULTIES ? saved : DEFAULT_DIFFICULTY
  } catch {
    return DEFAULT_DIFFICULTY
  }
}

/** Salva e aplica uma dificuldade. */
export function setDifficulty(level) {
  if (!(level in DIFFICULTIES)) return
  try {
    localStorage.setItem(KEY, level)
  } catch {
    // sem localStorage (modo privado): vale só nesta sessão
  }
  current = level
  applyDifficulty(level)
}

let current = null

/** A dificuldade em uso nesta sessão. */
export function currentDifficulty() {
  if (!current) current = getDifficulty()
  return current
}

/** Ritmo (timeScale) da dificuldade em uso. */
export function speedScales() {
  return DIFFICULTIES[currentDifficulty()].speed
}
