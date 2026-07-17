import Phaser from 'phaser'
import { COLORS, PORTS, PHASE_2, FONT_HEADING, FONT_BODY } from '../gameData.js'
import { card, packetToken, backButton } from '../ui.js'
import { buildSpeedControls } from '../speedControl.js'
import { buildPortModal } from '../portModal.js'

// MAP_X desloca o tabuleiro (desenhado para um canvas de 960px) para o
// centro do canvas atual de 1440px: (1440 - 960) / 2 = 240.
const MAP_X = 20 + 240
const MAP_Y = 66
const MAP_W = 620
const MAP_H = 520
const INSP_X = MAP_X + MAP_W + 16
const INSP_Y = 66
const INSP_W = 1200 - INSP_X - 20
const INSP_H = 520

const NODES = {
  internet: { x: MAP_X + 80, y: MAP_Y + MAP_H / 2, label: 'Internet' },
  firewall: { x: MAP_X + 190, y: MAP_Y + MAP_H / 2, label: 'Firewall' },
  ids: { x: MAP_X + 300, y: MAP_Y + MAP_H / 2, label: 'IDS' },
  router: { x: MAP_X + 410, y: MAP_Y + MAP_H / 2, label: 'Roteador' },
  pc1: { x: MAP_X + 520, y: MAP_Y + MAP_H / 2 - 90, label: 'PC 1' },
  pc2: { x: MAP_X + 520, y: MAP_Y + MAP_H / 2 + 90, label: 'PC 2' },
}

export default class Phase2Scene extends Phaser.Scene {
  constructor() {
    super('Phase2')
  }

  create() {
    const { width: w } = this.scale
    this.cameras.main.setBackgroundColor(COLORS.grassLight)
    this.gameOver = false

    // HUD
    card(this, 0, 0, w, 52, { radius: 0, fill: COLORS.navy })
    this.hudTitle = this.add.text(20, 17, '', { fontFamily: FONT_HEADING, fontSize: '15px', color: '#ffffff' })
    this.waveSquares = []
    for (let i = 0; i < PHASE_2.wavesToWin; i++) {
      this.waveSquares.push(this.add.rectangle(210 + i * 26, 26, 18, 18, COLORS.panelLine, 1))
    }
    this.speed = buildSpeedControls(this, w / 2 - 47, 12)
    this.add.circle(w - 148, 26, 9, COLORS.amber)
    this.scoreText = this.add.text(w - 130, 17, '', { fontFamily: FONT_HEADING, fontSize: '16px', fontStyle: '800', color: '#ffffff' })
    backButton(this, w - 44, 8)

    // painel do mapa de rede
    card(this, MAP_X, MAP_Y, MAP_W, MAP_H, { radius: 22 })
    this.add.text(MAP_X + 20, MAP_Y + 14, 'MAPA DA REDE', { fontFamily: FONT_BODY, fontSize: '11px', fontStyle: '800', color: '#8a8fa3' })
    this.buildNetworkMap()

    // painel inspetor de pacotes
    card(this, INSP_X, INSP_Y, INSP_W, INSP_H, { radius: 22 })
    this.add.text(INSP_X + 20, INSP_Y + 16, 'PACOTE SELECIONADO', { fontFamily: FONT_BODY, fontSize: '11px', fontStyle: '800', color: '#8a8fa3' })
    this.buildInspector()

    this.portOpen = {}
    PHASE_2.packetPorts.forEach((p) => (this.portOpen[p] = true))
    this.portModal = buildPortModal(this, {
      ports: PHASE_2.packetPorts,
      portOpen: this.portOpen,
      onClose: () => this.toggleFirewallModal(false),
    })

    this.pcStatus = { pc1: true, pc2: true }
    this.score = 0
    this.totalCaught = 0
    this.totalMissed = 0
    this.totalOverblocked = 0
    this.wavesSurvived = 0
    this.waveNumber = 0

    this.packetsSpawned = 0
    this.packetsResolved = 0

    this.refreshHud()
    this.startWave()
  }

  buildNetworkMap() {
    const g = this.add.graphics()
    g.lineStyle(4, COLORS.panelLine, 1)
    g.lineBetween(NODES.internet.x, NODES.internet.y, NODES.firewall.x, NODES.firewall.y)
    g.lineBetween(NODES.firewall.x, NODES.firewall.y, NODES.ids.x, NODES.ids.y)
    g.lineBetween(NODES.ids.x, NODES.ids.y, NODES.router.x, NODES.router.y)
    g.lineBetween(NODES.router.x, NODES.router.y, NODES.pc1.x, NODES.pc1.y)
    g.lineBetween(NODES.router.x, NODES.router.y, NODES.pc2.x, NODES.pc2.y)

    this.add.circle(NODES.internet.x, NODES.internet.y, 28, COLORS.muted)
    this.add.text(NODES.internet.x, NODES.internet.y, '🌐', { fontSize: '22px' }).setOrigin(0.5)

    this.firewallNode = this.add.rectangle(NODES.firewall.x, NODES.firewall.y, 56, 56, COLORS.blue).setStrokeStyle(3, COLORS.navy)
    this.firewallNode.setInteractive({ useHandCursor: true })
    this.firewallNode.on('pointerover', () => this.firewallNode.setStrokeStyle(4, COLORS.amber))
    this.firewallNode.on('pointerout', () => this.firewallNode.setStrokeStyle(3, COLORS.navy))
    this.firewallNode.on('pointerdown', () => this.toggleFirewallModal(true))
    this.add.text(NODES.firewall.x, NODES.firewall.y, '⚙️', { fontSize: '20px' }).setOrigin(0.5)

    // torre do IDS — nível 1: só classifica (colore) o pacote depois que ele passa por aqui.
    // Níveis 2 (revelar tipo de malware) e 3 (bloquear sozinho, virando um IPS) ficam para fases futuras.
    this.add.rectangle(NODES.ids.x, NODES.ids.y, 38, 64, COLORS.blueDark).setStrokeStyle(3, COLORS.navy)
    this.add.text(NODES.ids.x, NODES.ids.y, '🔍', { fontSize: '20px' }).setOrigin(0.5)

    this.add.rectangle(NODES.router.x, NODES.router.y, 60, 46, COLORS.navy)
    this.add.text(NODES.router.x, NODES.router.y, '📡', { fontSize: '20px' }).setOrigin(0.5)

    Object.values(NODES).forEach((n) => {
      this.add.text(n.x, n.y + 42, n.label, { fontFamily: FONT_BODY, fontSize: '12px', fontStyle: '700', color: '#1b2a55' }).setOrigin(0.5)
    })

    this.pcNodes = {}
    ;['pc1', 'pc2'].forEach((key) => {
      const n = NODES[key]
      const rect = this.add.rectangle(n.x, n.y, 56, 44, COLORS.green).setStrokeStyle(4, COLORS.navy)
      const statusText = this.add.text(n.x, n.y, '💻', { fontFamily: FONT_BODY, fontSize: '18px' }).setOrigin(0.5)
      this.pcNodes[key] = { rect, statusText }
    })
  }

  buildInspector() {
    const x = INSP_X + 20
    const swatchY = INSP_Y + 44
    const swatchW = INSP_W - 40
    const swatchH = 84

    this.inspSwatch = this.add.graphics()
    this.inspIcon = this.add.circle(x + swatchW / 2, swatchY + swatchH / 2, 22, COLORS.muted)
    this.add.text(x + swatchW / 2, swatchY + swatchH / 2, '✉️', { fontSize: '18px' }).setOrigin(0.5)

    const rowY = swatchY + swatchH + 20
    this.add.text(x, rowY, 'Porta', { fontFamily: FONT_BODY, fontSize: '13px', fontStyle: '700', color: '#8a8fa3' })
    this.inspPort = this.add.text(x + swatchW, rowY, '—', { fontFamily: FONT_BODY, fontSize: '13px', fontStyle: '800', color: '#1b2a55' }).setOrigin(1, 0)

    this.add.text(x, rowY + 26, 'Protocolo', { fontFamily: FONT_BODY, fontSize: '13px', fontStyle: '700', color: '#8a8fa3' })
    this.inspProto = this.add.text(x + swatchW, rowY + 26, '—', { fontFamily: FONT_BODY, fontSize: '13px', fontStyle: '800', color: '#1b2a55' }).setOrigin(1, 0)

    this.add.text(x, rowY + 52, 'Classificação', { fontFamily: FONT_BODY, fontSize: '13px', fontStyle: '700', color: '#8a8fa3' })
    this.inspClass = this.add.text(x + swatchW, rowY + 52, '—', { fontFamily: FONT_BODY, fontSize: '13px', fontStyle: '800', color: '#1b2a55' }).setOrigin(1, 0)

    const descY = rowY + 84
    card(this, x, descY, swatchW, INSP_H - (descY - INSP_Y) - 16, { radius: 12, fill: COLORS.panel })
    this.inspDesc = this.add.text(x + 12, descY + 12, 'Passe o mouse sobre um pacote para inspecioná-lo.', {
      fontFamily: FONT_BODY,
      fontSize: '12px',
      color: '#5a6072',
      wordWrap: { width: swatchW - 24 },
      lineSpacing: 3,
    })

    this.showInspector(null)
  }

  showInspector(packet) {
    this.inspSwatch.clear()
    const x = INSP_X + 20
    const swatchY = INSP_Y + 44
    const swatchW = INSP_W - 40
    const swatchH = 84

    if (!packet) {
      this.inspSwatch.fillStyle(COLORS.panel, 1).fillRoundedRect(x, swatchY, swatchW, swatchH, 14)
      this.inspIcon.setFillStyle(COLORS.muted)
      this.inspPort.setText('—')
      this.inspProto.setText('—')
      this.inspClass.setText('—')
      this.inspDesc.setText('Passe o mouse sobre um pacote para inspecioná-lo.')
      return
    }

    this.inspPort.setText(`${packet.port} (${PORTS[packet.port].label})`)
    this.inspProto.setText('TCP')

    if (!packet.classified) {
      this.inspSwatch.fillStyle(COLORS.panel, 1).fillRoundedRect(x, swatchY, swatchW, swatchH, 14)
      this.inspIcon.setFillStyle(COLORS.muted)
      this.inspClass.setText('Aguardando IDS').setColor('#8a8fa3')
      this.inspDesc.setText(`${PORTS[packet.port].desc} Ainda não passou pela torre do IDS — a classificação só aparece depois da inspeção.`)
      return
    }

    const suspicious = packet.idsTag === 'red'
    this.inspSwatch.fillStyle(suspicious ? COLORS.redSoft : 0xe7f3ea, 1).fillRoundedRect(x, swatchY, swatchW, swatchH, 14)
    this.inspIcon.setFillStyle(suspicious ? COLORS.red : COLORS.green)
    this.inspClass.setText(suspicious ? 'Suspeito' : 'Aparenta seguro').setColor(suspicious ? '#e4573d' : '#2e9863')
    this.inspDesc.setText(
      `${PORTS[packet.port].desc} ${suspicious ? 'Marcado pelo IDS por padrão de tráfego incomum.' : 'O IDS não encontrou padrão suspeito neste pacote — mas isso não é garantia.'}`,
    )
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
    this.hudTitle.setText(`Fase 2 · Onda ${this.waveNumber || 0}/${PHASE_2.wavesToWin}`)
    this.waveSquares.forEach((sq, i) => sq.setFillStyle(i < this.wavesSurvived ? COLORS.green : COLORS.panelLine))
    this.scoreText.setText(String(this.score))
  }

  startWave() {
    if (this.gameOver) return
    this.waveNumber = (this.waveNumber || 0) + 1
    this.packetsSpawned = 0
    this.packetsResolved = 0
    this.refreshHud()

    this.spawnTimer = this.time.addEvent({
      delay: PHASE_2.packetIntervalMs,
      repeat: PHASE_2.packetsPerWave - 1,
      callback: () => this.spawnPacket(),
    })
    this.spawnPacket()
  }

  spawnPacket() {
    if (this.gameOver || this.packetsSpawned >= PHASE_2.packetsPerWave) return
    this.packetsSpawned++

    const port = Phaser.Utils.Array.GetRandom(PHASE_2.packetPorts)
    const malicious = PHASE_2.maliciousPorts.includes(port) && Math.random() < PHASE_2.maliciousChance + 0.2
    let idsTag = malicious ? 'red' : 'green'
    if (Math.random() < PHASE_2.idsErrorChance) idsTag = idsTag === 'red' ? 'green' : 'red'
    const target = Math.random() < 0.5 ? 'pc1' : 'pc2'

    const start = NODES.internet
    // pacote nasce cinza — só ganha a cor (verde/vermelho) ao passar pela torre do IDS
    const token = packetToken(this, start.x, start.y, port, COLORS.muted)

    const packet = { port, malicious, idsTag, target, token, resolved: false, classified: false }
    token.setInteractive(new Phaser.Geom.Circle(0, 0, 15), Phaser.Geom.Circle.Contains)
    token.input.cursor = 'pointer'
    token.on('pointerover', () => {
      this.inspectedPacket = packet
      this.showInspector(packet)
    })
    token.on('pointerdown', () => this.blockPacket(packet))

    if (!this.portOpen[port]) {
      this.tweens.add({
        targets: token,
        x: NODES.firewall.x,
        y: NODES.firewall.y,
        duration: 500,
        onComplete: () => {
          if (!packet.resolved) this.blockPacket(packet)
        },
      })
      return
    }

    this.tweens.add({
      targets: token,
      x: NODES.ids.x,
      y: NODES.ids.y,
      duration: 900,
      onComplete: () => {
        if (packet.resolved) return
        this.classifyPacket(packet)
        this.tweens.add({
          targets: token,
          x: NODES.router.x,
          y: NODES.router.y,
          duration: 500,
          onComplete: () => {
            if (packet.resolved) return
            const dest = NODES[target]
            this.tweens.add({
              targets: token,
              x: dest.x,
              y: dest.y,
              duration: 1000,
              onComplete: () => this.deliverPacket(packet),
            })
          },
        })
      },
    })
  }

  classifyPacket(packet) {
    packet.classified = true
    packet.token.circle.setFillStyle(packet.idsTag === 'red' ? COLORS.red : COLORS.green)
    this.tweens.add({ targets: packet.token, scale: 1.3, duration: 120, yoyo: true, ease: 'Sine.easeOut' })
    if (this.inspectedPacket === packet) this.showInspector(packet)
  }

  blockPacket(packet) {
    if (packet.resolved || this.gameOver) return
    packet.resolved = true
    this.tweens.killTweensOf(packet.token)
    this.tweens.add({
      targets: packet.token,
      scale: 0,
      alpha: 0,
      duration: 200,
      onComplete: () => packet.token.destroy(),
    })

    if (packet.malicious) {
      this.score += 15
      this.totalCaught++
    } else {
      this.score -= 5
      this.totalOverblocked++
    }
    this.refreshHud()
    this.resolvePacketCount()
  }

  deliverPacket(packet) {
    if (packet.resolved || this.gameOver) return
    packet.resolved = true
    packet.token.destroy()

    if (packet.malicious) {
      this.score -= 15
      this.totalMissed++
      this.setPcDown(packet.target)
    } else {
      this.score += 5
    }
    this.refreshHud()
    this.resolvePacketCount()
  }

  setPcDown(key) {
    if (this.gameOver || !this.pcStatus[key]) return
    this.pcStatus[key] = false
    const node = this.pcNodes[key]
    node.rect.setFillStyle(COLORS.muted)
    node.statusText.setText('OFFLINE').setFontSize('9px').setFontStyle('800').setColor('#ffffff')

    if (!this.pcStatus.pc1 && !this.pcStatus.pc2) {
      this.endPhase(false)
      return
    }

    this.time.delayedCall(PHASE_2.pcDownMs, () => {
      if (this.gameOver) return
      this.pcStatus[key] = true
      node.rect.setFillStyle(COLORS.green)
      node.statusText.setText('💻').setFontSize('18px').setFontStyle('normal')
    })
  }

  resolvePacketCount() {
    this.packetsResolved++
    if (!this.gameOver && this.packetsSpawned >= PHASE_2.packetsPerWave && this.packetsResolved >= this.packetsSpawned) {
      this.finishWave()
    }
  }

  finishWave() {
    this.wavesSurvived++
    this.refreshHud()
    if (this.wavesSurvived >= PHASE_2.wavesToWin) {
      this.endPhase(true)
    } else {
      this.time.delayedCall(1200, () => this.startWave())
    }
  }

  endPhase(success) {
    if (this.gameOver) return
    this.gameOver = true
    // pacotes ainda em voo têm tweens/timers pendentes; sem isso, eles disparam
    // depois do restart e corrompem o estado da nova partida (mesma instância de Scene).
    this.tweens.killAll()
    this.time.removeAllEvents()

    this.time.delayedCall(700, () => {
      this.scene.start('Debriefing', {
        phaseId: PHASE_2.id,
        success,
        stars: this.wavesSurvived,
        reason: success ? null : 'Os dois computadores ficaram offline ao mesmo tempo — um pacote malicioso passou sem ser bloqueado.',
        statCards: [
          { value: this.totalCaught, label: 'Ataques bloqueados', color: '#4c7ef3' },
          { value: this.totalMissed, label: 'Falsos negativos', color: '#e4573d' },
          { value: this.score, label: 'Pontuação final', color: '#f5a623' },
        ],
        achievement: success ? PHASE_2.achievement : null,
        funFact: 'Sistemas de IDS reais também erram — a equipe de segurança precisa revisar alertas continuamente para não confiar cegamente na automação.',
      })
    })
  }
}
