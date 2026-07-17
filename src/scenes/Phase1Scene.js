import Phaser from 'phaser'
import { COLORS, PHASE_1, FONT_HEADING, FONT_BODY } from '../gameData.js'
import { card, packetToken, backButton } from '../ui.js'
import { buildSpeedControls } from '../speedControl.js'
import { buildPortModal } from '../portModal.js'

// MAP_X desloca o tabuleiro (desenhado para um canvas de 960px) para o
// centro do canvas atual de 1440px: (1440 - 960) / 2 = 240.
const MAP_X = 20 + 240
const MAP_Y = 66
const MAP_W = 920
const MAP_H = 500

const NODES = {
  internet: { x: MAP_X + 110, y: MAP_Y + MAP_H / 2, label: 'Internet' },
  firewall: { x: MAP_X + MAP_W / 2, y: MAP_Y + MAP_H / 2, label: 'Firewall' },
  home: { x: MAP_X + MAP_W - 110, y: MAP_Y + MAP_H / 2, label: 'Sua Rede' },
}

export default class Phase1Scene extends Phaser.Scene {
  constructor() {
    super('Phase1')
  }

  create() {
    const { width: w } = this.scale
    this.cameras.main.setBackgroundColor(COLORS.grassLight)

    // HUD
    card(this, 0, 0, w, 52, { radius: 0, fill: COLORS.navy })
    this.hudTitle = this.add.text(20, 17, '', { fontFamily: FONT_HEADING, fontSize: '15px', color: '#ffffff' })
    this.waveSquares = []
    for (let i = 0; i < PHASE_1.wavesToWin; i++) {
      this.waveSquares.push(this.add.rectangle(210 + i * 30, 26, 22, 22, COLORS.panelLine, 1))
    }
    this.speed = buildSpeedControls(this, w / 2 - 47, 12)
    this.add.circle(w - 148, 26, 9, COLORS.amber)
    this.scoreText = this.add.text(w - 130, 17, '', { fontFamily: FONT_HEADING, fontSize: '16px', fontStyle: '800', color: '#ffffff' })
    backButton(this, w - 44, 8)

    // painel do mapa de rede
    card(this, MAP_X, MAP_Y, MAP_W, MAP_H, { radius: 22 })
    this.add.text(MAP_X + 20, MAP_Y + 14, 'MAPA DA REDE', { fontFamily: FONT_BODY, fontSize: '11px', fontStyle: '800', color: '#8a8fa3' })
    this.buildNetworkMap()

    this.portOpen = {}
    PHASE_1.glossaryPorts.forEach((p) => (this.portOpen[p] = true))
    this.portModal = buildPortModal(this, {
      ports: PHASE_1.glossaryPorts,
      portOpen: this.portOpen,
      onClose: () => this.toggleFirewallModal(false),
    })

    this.score = 0
    this.totalBlocked = 0
    this.totalLeaked = 0
    this.streak = 0
    this.waveNumber = 0

    this.packetsSpawned = 0
    this.packetsResolved = 0
    this.waveLeaks = 0

    this.refreshHud()
    this.startWave()
  }

  buildNetworkMap() {
    const g = this.add.graphics()
    g.lineStyle(4, COLORS.panelLine, 1)
    g.lineBetween(NODES.internet.x, NODES.internet.y, NODES.firewall.x, NODES.firewall.y)
    g.lineBetween(NODES.firewall.x, NODES.firewall.y, NODES.home.x, NODES.home.y)

    this.add.circle(NODES.internet.x, NODES.internet.y, 28, COLORS.muted)
    this.add.text(NODES.internet.x, NODES.internet.y, '🌐', { fontSize: '24px' }).setOrigin(0.5)

    this.firewallNode = this.add.rectangle(NODES.firewall.x, NODES.firewall.y, 56, 56, COLORS.blue).setStrokeStyle(3, COLORS.navy)
    this.firewallNode.setInteractive({ useHandCursor: true })
    this.firewallNode.on('pointerover', () => this.firewallNode.setStrokeStyle(4, COLORS.amber))
    this.firewallNode.on('pointerout', () => this.firewallNode.setStrokeStyle(3, COLORS.navy))
    this.firewallNode.on('pointerdown', () => this.toggleFirewallModal(true))
    this.add.text(NODES.firewall.x, NODES.firewall.y, '⚙️', { fontSize: '20px' }).setOrigin(0.5)

    this.add.rectangle(NODES.home.x, NODES.home.y, 70, 60, COLORS.green).setStrokeStyle(4, COLORS.navy)
    this.add.text(NODES.home.x, NODES.home.y, '🏠', { fontSize: '24px' }).setOrigin(0.5)

    Object.values(NODES).forEach((n) => {
      this.add.text(n.x, n.y + 46, n.label, { fontFamily: FONT_BODY, fontSize: '12px', fontStyle: '700', color: '#1b2a55' }).setOrigin(0.5)
    })
  }

  toggleFirewallModal(show) {
    this.portModal.setVisible(show)
    if (show) {
      this.speedBeforeModal = this.speed.current
      this.speed.set('paused')
    } else {
      this.speed.set(this.speedBeforeModal)
    }
  }

  refreshHud() {
    this.hudTitle.setText(`Fase 1 · Onda ${this.waveNumber}`)
    this.waveSquares.forEach((sq, i) => sq.setFillStyle(i < this.streak ? COLORS.green : COLORS.panelLine))
    this.scoreText.setText(String(this.score))
  }

  startWave() {
    this.waveNumber++
    this.packetsSpawned = 0
    this.packetsResolved = 0
    this.waveLeaks = 0
    this.refreshHud()

    this.spawnTimer = this.time.addEvent({
      delay: PHASE_1.packetIntervalMs,
      repeat: PHASE_1.packetsPerWave - 1,
      callback: () => this.spawnPacket(),
    })
    this.spawnPacket()
  }

  spawnPacket() {
    if (this.packetsSpawned >= PHASE_1.packetsPerWave) return
    this.packetsSpawned++

    const port = Phaser.Utils.Array.GetRandom(PHASE_1.glossaryPorts)
    const start = NODES.internet
    const packet = packetToken(this, start.x, start.y, port, COLORS.muted)

    this.tweens.add({
      targets: packet,
      x: NODES.firewall.x,
      y: NODES.firewall.y,
      duration: 1000,
      onComplete: () => {
        if (!this.portOpen[port]) {
          this.resolvePacket(port, packet, false)
          return
        }
        this.tweens.add({
          targets: packet,
          x: NODES.home.x,
          y: NODES.home.y,
          duration: 1000,
          onComplete: () => this.resolvePacket(port, packet, true),
        })
      },
    })
  }

  resolvePacket(port, packet, reachedHome) {
    const legit = PHASE_1.allowedPorts.includes(port)

    this.tweens.add({
      targets: packet,
      scale: 0,
      alpha: 0,
      duration: 250,
      onComplete: () => packet.destroy(),
    })

    if (reachedHome) {
      if (legit) {
        this.score += 10
      } else {
        this.score -= 10
        this.totalLeaked++
        this.waveLeaks++
      }
    } else {
      this.score += legit ? -5 : 5
      if (!legit) this.totalBlocked++
    }

    this.refreshHud()
    this.packetsResolved++
    if (this.packetsSpawned >= PHASE_1.packetsPerWave && this.packetsResolved >= this.packetsSpawned) {
      this.finishWave()
    }
  }

  finishWave() {
    this.streak = this.waveLeaks === 0 ? this.streak + 1 : 0
    this.refreshHud()

    if (this.streak >= PHASE_1.wavesToWin) {
      this.time.delayedCall(800, () => {
        this.scene.start('Debriefing', {
          phaseId: PHASE_1.id,
          success: true,
          stars: this.streak,
          statCards: [
            { value: this.totalBlocked, label: 'Pacotes bloqueados', color: '#4c7ef3' },
            { value: this.totalLeaked, label: 'Vazamentos indevidos', color: '#f5a623' },
            { value: this.score, label: 'Pontuação final', color: '#e4573d' },
          ],
          achievement: PHASE_1.achievement,
          funFact: 'A porta 445 (SMB) aberta indevidamente foi usada pelo ransomware WannaCry para se espalhar em 2017.',
        })
      })
    } else {
      this.time.delayedCall(1200, () => this.startWave())
    }
  }
}
