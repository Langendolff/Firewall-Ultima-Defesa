// Gancho de teste: o que um teste automatizado (Playwright) ou você, no console
// do navegador, pode ler e controlar. Um canvas não mostra nada para o DOM, então
// os testes dirigem o jogo por aqui.
//
//   window.game.scenes            chaves das cenas ativas, ex. ['Phase3']
//   window.game.start(key, data)  troca para outra cena, como um botão faria
//   window.game.phaser            a instância Phaser.Game
//
//   ?scene=<chave>   abre direto nessa cena (ex. ?scene=Phase4); útil para testar
//                    uma fase sem passar pelo menu
//   ?phase=<id>      junto com ?scene=Briefing ou Debriefing, vira { phaseId }
//   ?autostart=1     a fase começa sem esperar o botão "Começar" (src/guide.js)
//
// O jogador nunca vê nada disso. window.game só existe depois que o Phaser
// terminou de iniciar, então um teste espera por window.game.start.

/**
 * Instala window.game e aplica ?scene= / ?phase= da URL.
 * @param {Phaser.Game} game
 */
export function installHook(game) {
  const params = new URLSearchParams(location.search)
  const startKey = params.get('scene')
  const phaseId = Number(params.get('phase')) || undefined

  const activeScenes = () => game.scene.getScenes(true)

  const start = (key, data) => {
    const [current] = activeScenes()
    // scene.start a partir de uma cena para ela e inicia a outra, igual aos
    // botões do jogo; sem cena ativa, o gerenciador inicia direto.
    if (current) current.scene.start(key, data)
    else game.scene.start(key, data)
  }

  game.events.once('ready', () => {
    window.game = {
      get scenes() {
        return activeScenes().map((s) => s.scene.key)
      },
      start,
      phaser: game,
    }

    if (startKey) {
      // Espera a primeira cena (MainMenu) estar rodando e troca a partir dela.
      const jump = () => {
        if (!game.scene.isActive('MainMenu')) return
        game.events.off('step', jump)
        start(startKey, phaseId ? { phaseId } : undefined)
      }
      game.events.on('step', jump)
    }
  })
}
