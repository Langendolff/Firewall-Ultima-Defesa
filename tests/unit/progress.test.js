// Progresso salvo (src/progress.js): quais fases foram concluídas e quais
// estão liberadas. localStorage é trocado por um em memória a cada teste.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { completePhase, getCompleted, isUnlocked } from '../../src/progress.js'

const KEY = 'firewall-game:completed-phases'

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    clear: () => data.clear(),
  }
}

beforeEach(() => {
  vi.unstubAllGlobals()
  vi.stubGlobal('localStorage', memoryStorage())
})

describe('getCompleted', () => {
  it('começa vazio num navegador sem progresso', () => {
    expect(getCompleted()).toEqual([])
  })

  it('volta vazio quando o valor salvo está corrompido', () => {
    vi.stubGlobal('localStorage', memoryStorage({ [KEY]: '{não é json' }))
    expect(getCompleted()).toEqual([])
  })
})

describe('completePhase', () => {
  it('salva a fase concluída', () => {
    completePhase(1)
    expect(getCompleted()).toEqual([1])
  })

  it('não duplica uma fase concluída duas vezes', () => {
    completePhase(2)
    completePhase(2)
    expect(getCompleted()).toEqual([2])
  })
})

describe('isUnlocked', () => {
  it('libera a fase 1 desde o início', () => {
    expect(isUnlocked(1)).toBe(true)
  })

  it('mantém a fase 2 travada até a fase 1 ser concluída', () => {
    expect(isUnlocked(2)).toBe(false)
    completePhase(1)
    expect(isUnlocked(2)).toBe(true)
  })

  it('libera uma fase só pela anterior, não por qualquer uma', () => {
    completePhase(1)
    expect(isUnlocked(3)).toBe(false)
  })
})
