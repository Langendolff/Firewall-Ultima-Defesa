import Phaser from 'phaser'
import { COLORS } from './gameData.js'
import MainMenuScene from './scenes/MainMenuScene.js'
import PhaseSelectScene from './scenes/PhaseSelectScene.js'
import BriefingScene from './scenes/BriefingScene.js'
import Phase1Scene from './scenes/Phase1Scene.js'
import Phase2Scene from './scenes/Phase2Scene.js'
import Phase3Scene from './scenes/Phase3Scene.js'
import Phase4Scene from './scenes/Phase4Scene.js'
import Phase5Scene from './scenes/Phase5Scene.js'
import Phase6Scene from './scenes/Phase6Scene.js'
import Phase7Scene from './scenes/Phase7Scene.js'
import Phase8Scene from './scenes/Phase8Scene.js'
import Phase9Scene from './scenes/Phase9Scene.js'
import Phase10Scene from './scenes/Phase10Scene.js'
import DebriefingScene from './scenes/DebriefingScene.js'
import { installHook } from './hook.js'
import { applyDifficulty, currentDifficulty } from './difficulty.js'

applyDifficulty(currentDifficulty())

// O Phaser desenha o texto uma vez, na fonte disponível naquele instante. Sem
// esperar as fontes do Google, a primeira tela saía em Arial. Espera no máximo
// 3 s: sem internet, o jogo abre com a fonte reserva.
async function loadFonts() {
  if (!document.fonts) return
  const fonts = ['800 40px "Baloo 2"', '700 40px "Baloo 2"', '400 16px Nunito', '700 16px Nunito', '800 16px Nunito']
  const timeout = new Promise((resolve) => setTimeout(resolve, 3000))
  await Promise.race([Promise.all(fonts.map((f) => document.fonts.load(f))).catch(() => {}), timeout])
}

await loadFonts()

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  // 1440x900 casa com a resolução do mockup de referência
  // (design/ux/mockup-telas.html) — mais próximo do aspect ratio 16:9/16:10 dos
  // monitores reais, então sobra bem menos borda lateral que os 960x640
  // antigos, e o canvas fica nítido em telas HiDPI em vez de esticado.
  width: 1440,
  height: 900,
  backgroundColor: COLORS.navy,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [
    MainMenuScene,
    PhaseSelectScene,
    BriefingScene,
    Phase1Scene,
    Phase2Scene,
    Phase3Scene,
    Phase4Scene,
    Phase5Scene,
    Phase6Scene,
    Phase7Scene,
    Phase8Scene,
    Phase9Scene,
    Phase10Scene,
    DebriefingScene,
  ],
})

installHook(game)
