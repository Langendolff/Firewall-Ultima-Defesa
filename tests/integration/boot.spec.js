// Smoke test: o jogo abre, e cada tela (menu, seleção, briefing, as 10 fases e
// o debriefing) inicia e roda alguns segundos sem nenhum erro no console.
// Dirige o jogo pelo gancho window.game (src/hook.js). `npm run smoke` roda só
// o teste @boot.
import { expect, test } from '@playwright/test'

const PHASE_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

/** Abre o jogo e devolve a lista de erros que a página registrar. */
async function open(page, query = '') {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  // As fontes do Google ficam de fora: o teste roda offline e não depende delas.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
  )
  await page.goto(`/${query}`)
  await expect.poll(() => page.evaluate(() => typeof window.game?.start)).toBe('function')
  return errors
}

const activeScenes = (page) => page.evaluate(() => window.game.scenes)

test('abre no menu principal sem erros @boot', async ({ page }) => {
  const errors = await open(page)
  await expect.poll(() => activeScenes(page)).toEqual(['MainMenu'])
  const box = await page.locator('canvas').boundingBox()
  expect(box && box.width > 0 && box.height > 0).toBe(true)
  expect(errors).toEqual([])
})

test('a seleção de fases abre sem erros', async ({ page }) => {
  const errors = await open(page, '?scene=PhaseSelect')
  await expect.poll(() => activeScenes(page)).toEqual(['PhaseSelect'])
  expect(errors).toEqual([])
})

for (const id of PHASE_IDS) {
  test(`o briefing da fase ${id} abre sem erros`, async ({ page }) => {
    const errors = await open(page, `?scene=Briefing&phase=${id}`)
    await expect.poll(() => activeScenes(page)).toEqual(['Briefing'])
    expect(errors).toEqual([])
  })

  test(`a fase ${id} roda alguns segundos sem erros`, async ({ page }) => {
    const errors = await open(page, `?scene=Phase${id}&autostart=1`)
    await expect.poll(() => activeScenes(page)).toEqual([`Phase${id}`])
    // Tempo para nascerem pacotes e rodarem os timers da primeira onda.
    await page.waitForTimeout(4000)
    expect(await activeScenes(page)).toContain(`Phase${id}`)
    expect(errors).toEqual([])
  })
}

test('a fase espera o jogador clicar em Começar', async ({ page }) => {
  const errors = await open(page, '?scene=Phase2')
  await expect.poll(() => activeScenes(page)).toEqual(['Phase2'])
  await page.waitForTimeout(1500)
  const state = await page.evaluate(() => {
    const scene = window.game.phaser.scene.getScene('Phase2')
    return { started: scene.guide.started, spawned: scene.packetsSpawned }
  })
  expect(state).toEqual({ started: false, spawned: 0 })
  await page.evaluate(() => window.game.phaser.scene.getScene('Phase2').guide.start())
  await expect.poll(() => page.evaluate(() => window.game.phaser.scene.getScene('Phase2').packetsSpawned)).toBeGreaterThan(0)
  expect(errors).toEqual([])
})

for (const method of ['openOptions', 'openAchievements', 'openCredits']) {
  test(`o menu abre ${method} sem erros`, async ({ page }) => {
    const errors = await open(page)
    await expect.poll(() => activeScenes(page)).toEqual(['MainMenu'])
    await page.evaluate((m) => window.game.phaser.scene.getScene('MainMenu')[m](), method)
    await page.waitForTimeout(300)
    expect(errors).toEqual([])
  })
}

for (const [id, success] of [
  [1, true],
  [1, false],
  [10, true],
]) {
  test(`o debriefing da fase ${id} abre sem erros (${success ? 'vitória' : 'derrota'})`, async ({ page }) => {
    const errors = await open(page)
    await page.evaluate(
      ([phaseId, ok]) =>
        window.game.start('Debriefing', {
          phaseId,
          success: ok,
          stars: ok ? 3 : 0,
          statCards: [{ value: 7, label: 'Pacotes bloqueados', color: '#4c7ef3' }],
          achievement: ok ? { name: 'Conquista de teste', text: 'Texto da conquista.' } : undefined,
          reason: ok ? undefined : 'Um ataque passou pela porta aberta.',
          funFact: 'Fato curioso de teste.',
        }),
      [id, success],
    )
    await expect.poll(() => activeScenes(page)).toEqual(['Debriefing'])
    expect(errors).toEqual([])
  })
}
