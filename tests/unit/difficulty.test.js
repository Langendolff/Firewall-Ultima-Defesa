// Dificuldade (src/difficulty.js): Tranquilo dá mais margem, Desafio volta aos
// valores originais, e trocar de uma para outra nunca acumula.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PHASES } from '../../src/gameData.js'
import { DEFAULT_DIFFICULTY, applyDifficulty, getDifficulty, setDifficulty } from '../../src/difficulty.js'

const original = structuredClone(Object.fromEntries(Object.entries(PHASES).map(([id, p]) => [id, { ...p }])))

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial))
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)) }
}

beforeEach(() => vi.stubGlobal('localStorage', memoryStorage()))
afterEach(() => {
  applyDifficulty('desafio')
  vi.unstubAllGlobals()
})

describe('applyDifficulty', () => {
  it('Desafio mantém todos os valores originais', () => {
    applyDifficulty('desafio')
    for (const [id, phase] of Object.entries(PHASES)) {
      expect(phase.idsErrorChance).toBe(original[id].idsErrorChance)
      expect(phase.packetIntervalMs).toBe(original[id].packetIntervalMs)
    }
  })

  it('Tranquilo reduz pela metade o erro do IDS', () => {
    applyDifficulty('tranquilo')
    expect(PHASES[2].idsErrorChance).toBeCloseTo(original[2].idsErrorChance / 2)
  })

  it('Tranquilo dá mais tempo para isolar um PC na fase 5', () => {
    applyDifficulty('tranquilo')
    expect(PHASES[5].quarantineWindowMs).toBe(Math.round(original[5].quarantineWindowMs * 1.5))
  })

  it('Tranquilo tolera uma fraude a mais na fase 9', () => {
    applyDifficulty('tranquilo')
    expect(PHASES[9].fraudLimit).toBe(original[9].fraudLimit + 1)
  })

  it('aplicar Tranquilo duas vezes não acumula', () => {
    applyDifficulty('tranquilo')
    applyDifficulty('tranquilo')
    expect(PHASES[2].idsErrorChance).toBeCloseTo(original[2].idsErrorChance / 2)
  })

  it('não muda o que se vence nem o que se ensina', () => {
    applyDifficulty('tranquilo')
    for (const [id, phase] of Object.entries(PHASES)) {
      expect(phase.wavesToWin).toBe(original[id].wavesToWin)
      expect(phase.maliciousPorts).toEqual(original[id].maliciousPorts)
      expect(phase.objective).toBe(original[id].objective)
    }
  })
})

describe('getDifficulty / setDifficulty', () => {
  it('começa no Tranquilo para quem nunca escolheu', () => {
    expect(DEFAULT_DIFFICULTY).toBe('tranquilo')
    expect(getDifficulty()).toBe('tranquilo')
  })

  it('lembra a escolha salva', () => {
    setDifficulty('desafio')
    expect(getDifficulty()).toBe('desafio')
  })

  it('ignora um valor salvo desconhecido', () => {
    vi.stubGlobal('localStorage', memoryStorage({ 'firewall-game:difficulty': 'impossivel' }))
    expect(getDifficulty()).toBe('tranquilo')
  })
})
