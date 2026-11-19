import Phaser from 'phaser'
import { COLORS, PORTS, PHASE_5, FONT_HEADING, FONT_BODY } from '../gameData.js'
import { card, packetToken, backButton, PACKET_HIT_RADIUS } from '../ui.js'
import { buildGuide } from '../guide.js'
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
  internet: { x: MAP_X + 55, y: MAP_Y + MAP_H / 2, label: 'Internet' },
  firewall: { x: MAP_X + 150, y: MAP_Y + MAP_H / 2, label: 'Firewall' },
  ids: { x: MAP_X + 245, y: MAP_Y + MAP_H / 2, label: 'IDS' },
  switch: { x: MAP_X + 340, y: MAP_Y + MAP_H / 2, label: 'Switch' },
}

const PC_POS = {
  pc1: { x: MAP_X + 460, y: MAP_Y + 110, label: 'PC 1' },
  pc2: { x: MAP_X + 580, y: MAP_Y + 110, label: 'PC 2' },
  pc3: { x: MAP_X + 460, y: MAP_Y + 230, label: 'PC 3' },
  pc4: { x: MAP_X + 580, y: MAP_Y + 230, label: 'PC 4' },
}
const BACKUP_POS = { x: MAP_X + 520, y: MAP_Y + 350 }
const DB_POS = { x: MAP_X + 520, y: MAP_Y + 460 }

const PC_VISUAL = {
  healthy: { fill: COLORS.green, icon: '💻', status: '' },
  infected: { fill: COLORS.red, icon: '🦠', status: 'ISOLAR!' },
  quarantined: { fill: COLORS.blueDark, icon: '🔒', status: 'Isolado' },
  breached: { fill: COLORS.navy, icon: '💀', status: 'Perdido' },
}

export default class Phase5Scene extends Phaser.Scene {
  constructor() {
    super('Phase5')
  }

  create() {
    this.guide = null
    const { width: w } = this.scale
    this.cameras.main.setBackgroundColor(COLORS.grassLight)
    this.gameOver = false

    // HUD
    card(this, 0, 0, w, 52, { radius: 0, fill: COLORS.navy })
    this.hudTitle = this.add.text(20, 17, '', { fontFamily: FONT_HEADING, fontSize: '15px', color: '#ffffff' })
    this.waveSquares = []
    for (let i = 0; i < PHASE_5.wavesToWin; i++) {
      this.waveSquares.push(this.add.rectangle(210 + i * 26, 26, 18, 18, COLORS.panelLine, 1))
    }
    this.speed = buildSpeedControls(this, w / 2 - 47, 12)
    this.add.text(w - 162, 26, 'PONTOS', { fontFamily: FONT_BODY, fontSize: '13px', fontStyle: '800', color: '#8fa5e8' }).setOrigin(1, 0.5)
    this.add.circle(w - 148, 26, 9, COLORS.amber)
    this.scoreText = this.add.text(w - 130, 17, '', { fontFamily: FONT_HEADING, fontSize: '16px', fontStyle: '800', color: '#ffffff' })
    backButton(this, w - 44, 8)

    this.pcState = {}
    this.pcPulseTween = {}
    PHASE_5.pcKeys.forEach((k) => (this.pcState[k] = 'healthy'))
    this.backupBusy = false
    this.firstInfectWarned = false

    // painel do mapa de rede
    card(this, MAP_X, MAP_Y, MAP_W, MAP_H, { radius: 22 })
    this.add.text(MAP_X + 20, MAP_Y + 14, 'MAPA DA REDE', { fontFamily: FONT_BODY, fontSize: '13px', fontStyle: '800', color: '#8a8fa3' })
    this.buildNetworkMap()

    // painel inspetor de pacotes
    card(this, INSP_X, INSP_Y, INSP_W, INSP_H, { radius: 22 })
    this.add.text(INSP_X + 20, INSP_Y + 16, 'PACOTE SELECIONADO', { fontFamily: FONT_BODY, fontSize: '13px', fontStyle: '800', color: '#8a8fa3' })
    this.buildInspector()

    this.portOpen = {}
    PHASE_5.packetPorts.forEach((p) => (this.portOpen[p] = true))
    this.portModal = buildPortModal(this, {
      ports: PHASE_5.packetPorts,
      portOpen: this.portOpen,
      onClose: () => this.toggleFirewallModal(false),
    })

    this.score = 0
    this.totalBlocked = 0
    this.totalOverblocked = 0
    this.totalContained = 0
    this.totalMissed = 0
    this.totalRestored = 0
    this.wavesSurvived = 0
    this.waveNumber = 0

    this.packetsSpawned = 0
    this.packetsResolved = 0

    this.refreshHud()
    this.guide = buildGuide(this, { phase: PHASE_5, onStart: () => this.startWave() })
  }

  buildNetworkMap() {
    const g = this.add.graphics()
    g.lineStyle(4, COLORS.panelLine, 1)
    g.lineBetween(NODES.internet.x, NODES.internet.y, NODES.firewall.x, NODES.firewall.y)
    g.lineBetween(NODES.firewall.x, NODES.firewall.y, NODES.ids.x, NODES.ids.y)
    g.lineBetween(NODES.ids.x, NODES.ids.y, NODES.switch.x, NODES.switch.y)
    Object.values(PC_POS).forEach((p) => g.lineBetween(NODES.switch.x, NODES.switch.y, p.x, p.y))
    g.lineStyle(3, COLORS.amberDark, 0.6)
    g.lineBetween(BACKUP_POS.x, BACKUP_POS.y, MAP_X + 460, MAP_Y + 230)

    this.add.circle(NODES.internet.x, NODES.internet.y, 26, COLORS.muted)
    this.add.text(NODES.internet.x, NODES.internet.y, '🌐', { fontSize: '20px' }).setOrigin(0.5)

    this.firewallNode = this.add.rectangle(NODES.firewall.x, NODES.firewall.y, 50, 50, COLORS.blue).setStrokeStyle(3, COLORS.navy)
    this.firewallNode.setInteractive({ useHandCursor: true })
    this.firewallNode.on('pointerover', () => this.firewallNode.setStrokeStyle(4, COLORS.amber))
    this.firewallNode.on('pointerout', () => this.firewallNode.setStrokeStyle(3, COLORS.navy))
    this.firewallNode.on('pointerdown', () => this.toggleFirewallModal(true))
    this.add.text(NODES.firewall.x, NODES.firewall.y, '⚙️', { fontSize: '18px' }).setOrigin(0.5)

    this.add.rectangle(NODES.ids.x, NODES.ids.y, 34, 58, COLORS.blueDark).setStrokeStyle(3, COLORS.navy)
    this.add.text(NODES.ids.x, NODES.ids.y, '🔍', { fontSize: '18px' }).setOrigin(0.5)

    this.add.rectangle(NODES.switch.x, NODES.switch.y, 40, 40, COLORS.navy)
    this.add.text(NODES.switch.x, NODES.switch.y, '🔀', { fontSize: '16px' }).setOrigin(0.5)

    Object.values(NODES).forEach((n) => {
      this.add.text(n.x, n.y + 38, n.label, { fontFamily: FONT_BODY, fontSize: '13px', fontStyle: '700', color: '#1b2a55' }).setOrigin(0.5)
    })

    this.add
      .text(MAP_X + 520, MAP_Y + 70, 'REDE INTERNA', { fontFamily: FONT_BODY, fontSize: '13px', fontStyle: '800', color: '#8a8fa3' })
      .setOrigin(0.5)

    this.buildPcNodes()
    this.buildBackupNode()
    this.buildDbNode()
  }

  buildPcNodes() {
    this.pcNodes = {}
    PHASE_5.pcKeys.forEach((key) => {
      const pos = PC_POS[key]
      const container = this.add.container(pos.x, pos.y)
      const rect = this.add.rectangle(0, 0, 56, 44, COLORS.green).setStrokeStyle(4, COLORS.navy)
      const icon = this.add.text(0, -4, '💻', { fontSize: '16px' }).setOrigin(0.5)
      const status = this.add.text(0, 14, '', { fontFamily: FONT_BODY, fontSize: '10px', fontStyle: '800', color: '#1b2a55' }).setOrigin(0.5)
      container.add([rect, icon, status])
      container.setInteractive(new Phaser.Geom.Rectangle(-28, -22, 56, 44), Phaser.Geom.Rectangle.Contains)
      container.input.cursor = 'pointer'
      container.on('pointerdown', () => this.quarantinePc(key))
      this.add.text(pos.x, pos.y + 37, pos.label, { fontFamily: FONT_BODY, fontSize: '13px', fontStyle: '700', color: '#1b2a55' }).setOrigin(0.5)
      this.pcNodes[key] = { container, rect, icon, status }
      this.updatePcVisual(key)
    })
  }

  buildBackupNode() {
    const box = this.add.rectangle(BACKUP_POS.x, BACKUP_POS.y, 54, 44, COLORS.amber).setStrokeStyle(3, COLORS.amberDark)
    box.setInteractive({ useHandCursor: true })
    box.on('pointerdown', () => this.restoreFromBackup())
    this.backupIcon = this.add.text(BACKUP_POS.x, BACKUP_POS.y - 3, '💾', { fontSize: '18px' }).setOrigin(0.5)
    this.backupStatus = this.add
      .text(BACKUP_POS.x, BACKUP_POS.y + 14, '', { fontFamily: FONT_BODY, fontSize: '10px', fontStyle: '800', color: '#1b2a55' })
      .setOrigin(0.5)
    this.add.text(BACKUP_POS.x, BACKUP_POS.y + 32, 'Backup', { fontFamily: FONT_BODY, fontSize: '13px', fontStyle: '700', color: '#1b2a55' }).setOrigin(0.5)
    this.backupBox = box
  }

  buildDbNode() {
    this.add.rectangle(DB_POS.x, DB_POS.y, 64, 50, COLORS.panel).setStrokeStyle(4, COLORS.red)
    this.add.text(DB_POS.x, DB_POS.y, '🗄️', { fontSize: '20px' }).setOrigin(0.5)
    this.add
      .text(DB_POS.x, DB_POS.y + 34, 'Banco de Dados', { fontFamily: FONT_BODY, fontSize: '13px', fontStyle: '700', color: '#1b2a55' })
      .setOrigin(0.5)
  }

  updatePcVisual(key) {
    const v = PC_VISUAL[this.pcState[key]]
    const n = this.pcNodes[key]
    n.rect.setFillStyle(v.fill)
    n.icon.setText(v.icon)
    n.status.setText(v.status)

    if (this.pcPulseTween[key]) {
      this.pcPulseTween[key].stop()
      n.container.setScale(1)
      this.pcPulseTween[key] = null
    }
    if (this.pcState[key] === 'infected') {
      this.pcPulseTween[key] = this.tweens.add({ targets: n.container, scale: 1.12, duration: 350, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    }
  }

  updateBackupVisual() {
    this.backupBox.setFillStyle(this.backupBusy ? COLORS.muted : COLORS.amber)
    this.backupStatus.setText(this.backupBusy ? 'Restaurando…' : '')
  }

  infectPc(key) {
    if (this.gameOver || this.pcState[key] !== 'healthy') return
    this.pcState[key] = 'infected'
    this.updatePcVisual(key)
    if (!this.firstInfectWarned) {
      this.firstInfectWarned = true
      this.showToast('⚠️ PC infectado! Clique nele em 10s para isolar antes que o ransomware se espalhe.')
    }
    this.time.delayedCall(PHASE_5.quarantineWindowMs, () => {
      if (this.gameOver || this.pcState[key] !== 'infected') return
      this.spreadFrom(key)
    })
  }

  quarantinePc(key) {
    if (this.gameOver || this.pcState[key] !== 'infected') return
    this.pcState[key] = 'quarantined'
    this.score += 20
    this.totalContained++
    this.updatePcVisual(key)
    this.refreshHud()
  }

  spreadFrom(key) {
    this.pcState[key] = 'breached'
    this.updatePcVisual(key)
    this.score -= 15
    this.totalMissed++
    this.refreshHud()

    const healthy = PHASE_5.pcKeys.filter((k) => this.pcState[k] === 'healthy')
    if (!healthy.length) {
      this.endPhase(false, 'db-compromised')
      return
    }
    this.infectPc(Phaser.Utils.Array.GetRandom(healthy))
  }

  restoreFromBackup() {
    if (this.gameOver || this.backupBusy) return
    const target = PHASE_5.pcKeys.find((k) => this.pcState[k] === 'quarantined')
    if (!target) {
      this.showToast('Nenhum PC isolado para restaurar.')
      return
    }
    this.backupBusy = true
    this.score -= PHASE_5.restoreCost
    this.refreshHud()
    this.updateBackupVisual()
    this.time.delayedCall(PHASE_5.restoreMs, () => {
      if (this.gameOver) return
      this.pcState[target] = 'healthy'
      this.updatePcVisual(target)
      this.totalRestored++
      this.backupBusy = false
      this.updateBackupVisual()
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
    this.add.text(x, rowY, 'Porta', { fontFamily: FONT_BODY, fontSize: '14px', fontStyle: '700', color: '#8a8fa3' })
    this.inspPort = this.add.text(x + swatchW, rowY, '—', { fontFamily: FONT_BODY, fontSize: '14px', fontStyle: '800', color: '#1b2a55' }).setOrigin(1, 0)

    this.add.text(x, rowY + 26, 'PC-alvo', { fontFamily: FONT_BODY, fontSize: '14px', fontStyle: '700', color: '#8a8fa3' })
    this.inspTarget = this.add.text(x + swatchW, rowY + 26, '—', { fontFamily: FONT_BODY, fontSize: '14px', fontStyle: '800', color: '#1b2a55' }).setOrigin(1, 0)

    this.add.text(x, rowY + 52, 'Classificação', { fontFamily: FONT_BODY, fontSize: '14px', fontStyle: '700', color: '#8a8fa3' })
    this.inspClass = this.add.text(x + swatchW, rowY + 52, '—', { fontFamily: FONT_BODY, fontSize: '14px', fontStyle: '800', color: '#1b2a55' }).setOrigin(1, 0)

    const descY = rowY + 84
    card(this, x, descY, swatchW, INSP_H - (descY - INSP_Y) - 16, { radius: 12, fill: COLORS.panel })
    this.inspDesc = this.add.text(x + 12, descY + 12, 'Passe o mouse sobre um pacote para inspecioná-lo.', {
      fontFamily: FONT_BODY,
      fontSize: '13px',
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
      this.inspTarget.setText('—')
      this.inspClass.setText('—')
      this.inspDesc.setText('Passe o mouse sobre um pacote para inspecioná-lo.')
      return
    }

    this.inspPort.setText(`${packet.port} (${PORTS[packet.port].label})`)
    this.inspTarget.setText(PC_POS[packet.target].label)

    if (!packet.classified) {
      this.inspSwatch.fillStyle(COLORS.panel, 1).fillRoundedRect(x, swatchY, swatchW, swatchH, 14)
      this.inspIcon.setFillStyle(COLORS.muted)
      this.inspClass.setText('Aguardando IDS').setColor('#8a8fa3')
      this.inspDesc.setText(`${PORTS[packet.port].desc} Ainda não passou pela torre do IDS.`)
      return
    }

    const suspicious = packet.idsTag === 'red'
    this.inspSwatch.fillStyle(suspicious ? COLORS.redSoft : 0xe7f3ea, 1).fillRoundedRect(x, swatchY, swatchW, swatchH, 14)
    this.inspIcon.setFillStyle(suspicious ? COLORS.red : COLORS.green)
    this.inspClass.setText(suspicious ? 'Suspeito — Ransomware' : 'Aparenta seguro').setColor(suspicious ? '#e4573d' : '#2e9863')
    this.inspDesc.setText(
      `${PORTS[packet.port].desc} ${suspicious ? 'O IDS identificou um padrão de ataque conhecido.' : 'O IDS não encontrou padrão suspeito — mas isso não é garantia.'}`,
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

  showToast(msg) {
    this.guide?.log(msg, 'event')
    const { width: w } = this.scale
    const toast = this.add
      .text(w / 2, 60, msg, {
        fontFamily: FONT_BODY,
        fontSize: '14px',
        fontStyle: '700',
        color: '#ffffff',
        backgroundColor: '#1b2a55',
        padding: { x: 14, y: 8 },
        wordWrap: { width: w - 160 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(60)
    this.tweens.add({ targets: toast, alpha: 0, delay: 3200, duration: 600, onComplete: () => toast.destroy() })
  }

  refreshHud() {
    this.hudTitle.setText(`Fase 5 · Onda ${this.waveNumber || 0}/${PHASE_5.wavesToWin}`)
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
      delay: PHASE_5.packetIntervalMs,
      repeat: PHASE_5.packetsPerWave - 1,
      callback: () => this.spawnPacket(),
    })
    this.spawnPacket()
  }

  spawnPacket() {
    if (this.gameOver || this.packetsSpawned >= PHASE_5.packetsPerWave) return
    this.packetsSpawned++

    const port = Phaser.Utils.Array.GetRandom(PHASE_5.packetPorts)
    const malicious = PHASE_5.maliciousPorts.includes(port) && Math.random() < PHASE_5.maliciousChance
    const kind = malicious ? PHASE_5.threatByPort[port] : null
    let idsTag = malicious ? 'red' : 'green'
    if (Math.random() < PHASE_5.idsErrorChance) idsTag = idsTag === 'red' ? 'green' : 'red'
    const target = Phaser.Utils.Array.GetRandom(PHASE_5.pcKeys)

    const start = NODES.internet
    const token = packetToken(this, start.x, start.y, port, COLORS.muted)

    const packet = { port, malicious, kind, idsTag, target, token, resolved: false, classified: false }
    token.setInteractive(new Phaser.Geom.Circle(0, 0, PACKET_HIT_RADIUS), Phaser.Geom.Circle.Contains)
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
      duration: 700,
      onComplete: () => {
        if (packet.resolved) return
        this.classifyPacket(packet)
        this.tweens.add({
          targets: token,
          x: NODES.switch.x,
          y: NODES.switch.y,
          duration: 400,
          onComplete: () => {
            if (packet.resolved) return
            const dest = PC_POS[target]
            this.tweens.add({
              targets: token,
              x: dest.x,
              y: dest.y,
              duration: 700,
              onComplete: () => this.deliverPacket(packet),
            })
          },
        })
      },
    })
  }

  classifyPacket(packet) {
    packet.classified = true
    packet.token.setTag(packet.idsTag)
    this.tweens.add({ targets: packet.token, scale: 1.3, duration: 120, yoyo: true, ease: 'Sine.easeOut' })
    if (this.inspectedPacket === packet) this.showInspector(packet)
  }

  blockPacket(packet) {
    if (packet.resolved || this.gameOver) return
    packet.resolved = true
    this.guide.onBlock(packet)
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
      this.totalBlocked++
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
    this.guide.onDeliver(packet)
    packet.token.destroy()

    if (packet.malicious) {
      this.infectPc(packet.target)
    } else {
      this.score += 5
    }
    this.refreshHud()
    this.resolvePacketCount()
  }

  resolvePacketCount() {
    this.packetsResolved++
    if (!this.gameOver && this.packetsSpawned >= PHASE_5.packetsPerWave && this.packetsResolved >= this.packetsSpawned) {
      this.finishWave()
    }
  }

  finishWave() {
    this.wavesSurvived++
    this.refreshHud()
    if (this.wavesSurvived >= PHASE_5.wavesToWin) {
      this.endPhase(true)
    } else {
      this.time.delayedCall(1200, () => this.startWave())
    }
  }

  endPhase(success, cause = null) {
    if (this.gameOver) return
    this.gameOver = true
    this.tweens.killAll()
    this.time.removeAllEvents()

    const reason =
      !success && cause === 'db-compromised'
        ? 'O ransomware infectou todos os computadores sem ser contido a tempo — sem hosts saudáveis restando, o ataque alcançou o banco de dados.'
        : null

    this.time.delayedCall(700, () => {
      this.scene.start('Debriefing', {
        phaseId: PHASE_5.id,
        success,
        stars: this.wavesSurvived,
        reason,
        statCards: [
          { value: this.totalContained, label: 'PCs isolados a tempo', color: '#4c7ef3' },
          { value: this.totalMissed, label: 'PCs perdidos p/ propagação', color: '#e4573d' },
          { value: this.score, label: 'Pontuação final', color: '#f5a623' },
        ],
        achievement: success && this.totalMissed === 0 ? PHASE_5.achievement : null,
        funFact:
          'Em 2017, o ransomware WannaCry se espalhou por mais de 200 mil computadores em 150 países explorando a porta 445 (SMB) — a contenção rápida de sistemas infectados foi a principal defesa até que um patch fosse aplicado.',
      })
    })
  }
}
