// Playwright roda tests/integration/ contra o build de produção, servido pelo
// `vite preview` (npm run test:e2e faz o build antes).
import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'

const PORT = 4173

// Usa o Chrome/Chromium já instalado na máquina; CHROME_PATH escolhe outro.
// Sem nenhum, cai no navegador do próprio Playwright
// (npx playwright install chromium).
function systemBrowser() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  const candidates = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ]
  return candidates.find((p) => existsSync(p))
}

export default defineConfig({
  testDir: 'tests/integration',
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1440, height: 900 },
    launchOptions: {
      executablePath: systemBrowser(),
      // WebGL em software (SwiftShader): o teste desenha igual com ou sem GPU.
      args: ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader'],
    },
  },
})
