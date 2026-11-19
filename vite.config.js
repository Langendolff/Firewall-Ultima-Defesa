// Vite usa os padrões (index.html na raiz, public/ para arquivos estáticos).
// O bloco `test` é do Vitest: só tests/unit/ roda lá; tests/integration/ é do Playwright.
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js'],
  },
})
