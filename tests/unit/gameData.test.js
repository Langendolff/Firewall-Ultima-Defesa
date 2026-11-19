// Integridade dos dados de fase (src/gameData.js). Um erro aqui não quebra o
// build, só aparece no meio de uma fase: uma porta sem descrição no glossário,
// um arco que esquece uma fase, uma chance fora de 0..1.
import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ARCS, PHASES, PORTS } from '../../src/gameData.js'

const phases = Object.values(PHASES)

describe('PHASES', () => {
  it('tem as fases 1 a 10, cada uma com o id da própria chave', () => {
    expect(Object.keys(PHASES).map(Number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    for (const [key, phase] of Object.entries(PHASES)) expect(phase.id).toBe(Number(key))
  })

  it.each(phases)('fase $id aponta para uma cena que existe', (phase) => {
    expect(phase.sceneKey).toBe(`Phase${phase.id}`)
    expect(existsSync(`src/scenes/${phase.sceneKey}Scene.js`)).toBe(true)
  })

  it.each(phases)('fase $id tem todo o texto do briefing e do debriefing', (phase) => {
    expect(phase.title).toBeTruthy()
    expect(phase.objective).toBeTruthy()
    expect(phase.tip).toBeTruthy()
    expect(phase.narrative.length).toBeGreaterThan(0)
    expect(phase.threats.length).toBeGreaterThan(0)
    for (const threat of phase.threats) {
      expect(threat.name).toBeTruthy()
      expect(threat.desc).toBeTruthy()
    }
    expect(phase.glossary.length).toBeGreaterThan(0)
    for (const entry of phase.glossary) {
      expect(entry.term).toBeTruthy()
      expect(entry.desc).toBeTruthy()
    }
    expect(phase.howTo.length).toBeGreaterThanOrEqual(2)
    for (const step of phase.howTo) expect(step.length).toBeLessThanOrEqual(110)
    expect(phase.achievement.name).toBeTruthy()
    expect(phase.achievement.text).toBeTruthy()
  })

  it.each(phases)('fase $id só usa portas descritas em PORTS', (phase) => {
    const used = [
      ...(phase.packetPorts ?? []),
      ...(phase.maliciousPorts ?? []),
      ...(phase.allowedPorts ?? []),
      ...(phase.glossaryPorts ?? []),
    ]
    for (const port of used) expect(PORTS, `porta ${port}`).toHaveProperty(String(port))
  })

  it.each(phases.filter((p) => p.maliciousPorts))('fase $id só gera ataques por portas que recebem pacotes', (phase) => {
    for (const port of phase.maliciousPorts) expect(phase.packetPorts).toContain(port)
  })

  it.each(phases.filter((p) => p.threatByPort))('fase $id define a ameaça de cada porta maliciosa', (phase) => {
    const threatPorts = Object.keys(phase.threatByPort).map(Number).sort((a, b) => a - b)
    const malicious = [...phase.maliciousPorts].sort((a, b) => a - b)
    expect(threatPorts).toEqual(malicious)
  })

  it.each(phases)('fase $id tem ondas e pacotes em números inteiros positivos', (phase) => {
    for (const key of ['wavesToWin', 'packetsPerWave', 'packetIntervalMs']) {
      expect(Number.isInteger(phase[key]), key).toBe(true)
      expect(phase[key], key).toBeGreaterThan(0)
    }
  })

  it.each(phases)('fase $id mantém toda chance e proporção entre 0 e 1', (phase) => {
    const ratios = Object.entries(phase).filter(([key]) => /Chance$|Ratio$/.test(key))
    for (const [key, value] of ratios) {
      expect(value, key).toBeGreaterThanOrEqual(0)
      expect(value, key).toBeLessThanOrEqual(1)
    }
    for (const [port, value] of Object.entries(phase.maliciousChanceByPort ?? {})) {
      expect(value, `maliciousChanceByPort[${port}]`).toBeGreaterThanOrEqual(0)
      expect(value, `maliciousChanceByPort[${port}]`).toBeLessThanOrEqual(1)
    }
  })

  it.each(phases.filter((p) => p.aptDormancyMinMs !== undefined))(
    'fase $id tem dormência mínima do APT menor ou igual à máxima',
    (phase) => {
      expect(phase.aptDormancyMinMs).toBeLessThanOrEqual(phase.aptDormancyMaxMs)
    },
  )
})

describe('ARCS', () => {
  it('cobre as fases 1 a 10 uma vez cada, em ordem', () => {
    expect(ARCS.flatMap((arc) => arc.phaseIds)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('dá título e subtítulo a todo arco', () => {
    for (const arc of ARCS) {
      expect(arc.title).toBeTruthy()
      expect(arc.subtitle).toBeTruthy()
    }
  })
})
