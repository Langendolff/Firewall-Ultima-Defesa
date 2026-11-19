---
paths:
  - "tests/**"
  - "playwright.config.js"
  - "vite.config.js"
---

# Regras dos testes

- **Unitário (Vitest)**: `tests/unit/[módulo].test.js`, para lógica sem navegador
  (`gameData.js`, `progress.js`, e toda lógica que for extraída das cenas).
- **Integração (Playwright)**: `tests/integration/[sistema].spec.js`, contra o
  build servido por `vite preview`, dirigido por `window.game` (`src/hook.js`).
  Um canvas não aparece no DOM: leia o estado pelo gancho, não por seletores.
- **Nome do teste em português, em palavras simples, dizendo cenário e
  resultado**: `it('mantém a fase 2 travada até a fase 1 ser concluída')`.
- Estrutura preparar → agir → verificar, com uma asserção precisa
  (`toEqual([1])`, não `length > 0`).
- **Determinístico e isolado**: nada de rede (as fontes do Google são
  interceptadas no `open()` do boot.spec), `localStorage` falso via
  `vi.stubGlobal` em teste unitário, nenhum teste dependendo de outro.
  As fases usam `Math.random()`, então um teste e2e verifica "roda sem erro",
  não um resultado exato de partida.
- **Teste de regressão: veja falhar.** Rode o teste novo contra o código ainda
  com o bug e confirme que falha, depois corrija e confirme que passa. Um teste
  que você só viu passar não prova nada.
- Teste lento: `waitForTimeout` só quando o que se testa é "o tempo passa sem
  erro" (como as fases). Para o resto, `expect.poll` numa condição.
