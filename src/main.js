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

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: 960,
  height: 640,
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
