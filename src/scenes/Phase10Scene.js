import Phaser from 'phaser'
import { COLORS, PORTS, PHASE_10, FONT_HEADING, FONT_BODY } from '../gameData.js'
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
  internet: { x: MAP_X + 55, y: MAP_Y + MAP_H / 2, label: 'Internet' },
  firewall: { x: MAP_X + 150, y: MAP_Y + MAP_H / 2, label: 'Firewall' },
  ids: { x: MAP_X + 245, y: MAP_Y + MAP_H / 2, label: 'IDS' },
  switch: { x: MAP_X + 340, y: MAP_Y + MAP_H / 2, label: 'Switch' },
}

const SYSTEM_POS = {
  eleitoral: { x: MAP_X + 480, y: MAP_Y + 140, icon: '🗳️', label: 'Sistema Eleitoral' },
  energia: { x: MAP_X + 480, y: MAP_Y + 280, icon: '⚡', label: 'Usina de Energia' },
  comunicacao: { x: MAP_X + 480, y: MAP_Y + 420, icon: '📡', label: 'Comunicação de Emergência' },
}
const SYSTEM_KEYS = Object.keys(SYSTEM_POS)
const EMERGENCY_POS = { x: MAP_X + 245, y: MAP_Y + 420 }

const SYSTEM_VISUAL = {
  healthy: { fill: COLORS.green, badge: '' },
  infected: { fill: COLORS.red, badge: 'CONTER!' },
  down: { fill: COLORS.muted, badge: 'OFFLINE' },
  sacrificed: { fill: COLORS.navy, badge: 'SACRIFICADO' },
}

const KIND_LABEL = { worm: 'Worm Autopropagante', supply: 'Cadeia de Suprimentos', apt: 'APT (Ameaça Persistente)' }

export default class Phase10Scene extends Phaser.Scene {
  constructor() {
    super('Phase10')
  }

  create() {
    const { width: w } = this.scale
    this.cameras.main.setBackgroundColor(COLORS.grassLight)
    this.gameOver = false

    // HUD
    card(this, 0, 0, w, 52, { radius: 0, fill: COLORS.navy })
    this.hudTitle = this.add.text(20, 17, '', { fontFamily: FONT_HEADING, fontSize: '15px', color: '#ffffff' })
    this.waveSquares = []
    for (let i = 0; i < PHASE_10.wavesToWin; i++) {
      this.waveSquares.push(this.add.rectangle(210 + i * 18, 26, 13, 18, COLORS.panelLine, 1))
    }
    this.speed = buildSpeedControls(this, w / 2 - 20, 12)
    this.add.circle(w - 148, 26, 9, COLORS.amber)
    this.scoreText = this.add.text(w - 130, 17, '', { fontFamily: FONT_HEADING, fontSize: '16px', fontStyle: '800', color: '#ffffff' })
    backButton(this, w - 44, 8)

    // painel do mapa de rede
    card(this, MAP_X, MAP_Y, MAP_W, MAP_H, { radius: 22 })
    this.add.text(MAP_X + 20, MAP_Y + 14, 'MAPA DA REDE', { fontFamily: FONT_BODY, fontSize: '11px', fontStyle: '800', color: '#8a8fa3' })
    this.buildNetworkMap()
    this.statusText = this.add.text(MAP_X + 20, MAP_Y + MAP_H - 22, '', { fontFamily: FONT_BODY, fontSize: '11px', fontStyle: '700', color: '#8a8fa3' })

    // painel inspetor de pacotes
    card(this, INSP_X, INSP_Y, INSP_W, INSP_H, { radius: 22 })
    this.add.text(INSP_X + 20, INSP_Y + 16, 'PACOTE SELECIONADO', { fontFamily: FONT_BODY, fontSize: '11px', fontStyle: '800', color: '#8a8fa3' })
    this.buildInspector()

    this.portOpen = {}
    PHASE_10.packetPorts.forEach((p) => (this.portOpen[p] = true))
    this.portModal = buildPortModal(this, {
      ports: PHASE_10.packetPorts,
      portOpen: this.portOpen,
      onClose: () => this.toggleFirewallModal(false),
    })

    this.systemState = {}
    SYSTEM_KEYS.forEach((k) => (this.systemState[k] = 'healthy'))
    this.systemPulse = {}
    this.emergencyArmed = false
    this.emergencyUsed = false
    this.aptWarned = false

    this.score = 0
    this.totalBlocked = 0
    this.totalContained = 0
    this.totalOverblocked = 0
    this.wavesSurvived = 0
    this.waveNumber = 0

    this.packetsSpawned = 0
    this.packetsResolved = 0

    this.refreshHud()
    this.refreshStatus()
    this.startWave()
    PHASE_10.aptSpawnDelaysMs.forEach((delay) => this.time.delayedCall(delay, () => this.spawnApt()))
  }

  buildNetworkMap() {
    const g = this.add.graphics()
    g.lineStyle(4, COLORS.panelLine, 1)
    g.lineBetween(NODES.internet.x, NODES.internet.y, NODES.firewall.x, NODES.firewall.y)
    g.lineBetween(NODES.firewall.x, NODES.firewall.y, NODES.ids.x, NODES.ids.y)
    g.lineBetween(NODES.ids.x, NODES.ids.y, NODES.switch.x, NODES.switch.y)
    Object.values(SYSTEM_POS).forEach((p) => g.lineBetween(NODES.switch.x, NODES.switch.y, p.x, p.y))

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
      this.add.text(n.x, n.y + 38, n.label, { fontFamily: FONT_BODY, fontSize: '11px', fontStyle: '700', color: '#1b2a55' }).setOrigin(0.5)
    })

    this.systemNodes = {}
    Object.entries(SYSTEM_POS).forEach(([key, p]) => {
      const container = this.add.container(p.x, p.y)
      const rect = this.add.rectangle(0, 0, 60, 46, COLORS.green).setStrokeStyle(4, COLORS.navy)
      const icon = this.add.text(0, -6, p.icon, { fontSize: '18px' }).setOrigin(0.5)
      const badge = this.add.text(0, 14, '', { fontFamily: FONT_BODY, fontSize: '8px', fontStyle: '800', color: '#ffffff' }).setOrigin(0.5)
      container.add([rect, icon, badge])
      container.setInteractive(new Phaser.Geom.Rectangle(-30, -23, 60, 46), Phaser.Geom.Rectangle.Contains)
      container.input.cursor = 'pointer'
      container.on('pointerdown', () => this.onSystemClick(key))
      this.add
        .text(p.x, p.y + 30, p.label, { fontFamily: FONT_BODY, fontSize: '10px', fontStyle: '700', color: '#1b2a55', align: 'center', wordWrap: { width: 100 } })
        .setOrigin(0.5, 0)
      this.systemNodes[key] = { container, rect, icon, badge }
    })

    // Modo de Emergência — sacrifica um sistema pra sempre em troca de reforço
    // automático nos outros dois. Uso único, disponível a qualquer momento.
    this.emergencyBox = this.add.rectangle(EMERGENCY_POS.x, EMERGENCY_POS.y, 54, 44, COLORS.amber).setStrokeStyle(3, COLORS.amberDark)
    this.emergencyBox.setInteractive({ useHandCursor: true })
    this.emergencyBox.on('pointerdown', () => this.toggleEmergencyArm())
    this.emergencyIcon = this.add.text(EMERGENCY_POS.x, EMERGENCY_POS.y - 3, '🚨', { fontSize: '18px' }).setOrigin(0.5)
    this.emergencyStatus = this.add.text(EMERGENCY_POS.x, EMERGENCY_POS.y + 14, '', { fontFamily: FONT_BODY, fontSize: '8px', fontStyle: '800', color: '#1b2a55' }).setOrigin(0.5)
    this.add
      .text(EMERGENCY_POS.x, EMERGENCY_POS.y + 32, 'Modo de Emergência', { fontFamily: FONT_BODY, fontSize: '10px', fontStyle: '700', color: '#1b2a55', align: 'center', wordWrap: { width: 90 } })
      .setOrigin(0.5, 0)
  }

  updateSystemVisual(key) {
    const v = SYSTEM_VISUAL[this.systemState[key]]
    const n = this.systemNodes[key]
    n.rect.setFillStyle(v.fill)
    n.badge.setText(v.badge)

    if (this.systemPulse[key]) {
      this.systemPulse[key].stop()
      n.container.setScale(1)
      this.systemPulse[key] = null
    }
    if (this.systemState[key] === 'infected') {
      this.systemPulse[key] = this.tweens.add({ targets: n.container, scale: 1.1, duration: 350, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    }
  }

  onSystemClick(key) {
    if (this.gameOver) return
    if (this.emergencyArmed && !this.emergencyUsed) {
      this.sacrificeSystem(key)
      return
    }
    this.containSystem(key)
  }

  toggleEmergencyArm() {
    if (this.gameOver || this.emergencyUsed) return
    this.emergencyArmed = !this.emergencyArmed
    this.emergencyBox.setStrokeStyle(3, this.emergencyArmed ? COLORS.red : COLORS.amberDark)
    if (this.emergencyArmed) this.showToast('🚨 Modo de emergência armado — clique em um sistema para sacrificá-lo e reforçar os outros dois.')
  }

  sacrificeSystem(key) {
    if (this.systemState[key] === 'sacrificed') return
    this.systemState[key] = 'sacrificed'
    if (this.systemPulse[key]) {
      this.systemPulse[key].stop()
      this.systemPulse[key] = null
    }
    this.updateSystemVisual(key)
    this.emergencyArmed = false
    this.emergencyUsed = true
    this.emergencyBox.setFillStyle(COLORS.muted).setStrokeStyle(3, COLORS.panelLine)
    this.emergencyStatus.setText('USADO')
    this.refreshStatus()
    this.showToast(`⚠️ ${SYSTEM_POS[key].label} foi sacrificado. Os outros dois sistemas agora têm defesa reforçada.`)
  }

  infectSystem(key) {
    if (this.gameOver || this.systemState[key] !== 'healthy') return
    this.systemState[key] = 'infected'
    this.updateSystemVisual(key)
    this.time.delayedCall(PHASE_10.wormQuarantineWindowMs, () => {
      if (this.gameOver || this.systemState[key] !== 'infected') return
      this.spreadFrom(key)
    })
  }

  containSystem(key) {
    if (this.gameOver || this.systemState[key] !== 'infected') return
    this.score += 20
    this.totalContained++
    this.setSystemDown(key)
    this.refreshHud()
  }

  spreadFrom(key) {
    this.setSystemDown(key)
    const healthy = SYSTEM_KEYS.filter((k) => this.systemState[k] === 'healthy')
    if (healthy.length) this.infectSystem(Phaser.Utils.Array.GetRandom(healthy))
  }

  setSystemDown(key) {
    if (this.gameOver || this.systemState[key] === 'down' || this.systemState[key] === 'sacrificed') return
    this.systemState[key] = 'down'
    this.updateSystemVisual(key)
    this.refreshStatus()
    this.time.delayedCall(PHASE_10.systemDownMs, () => {
      if (this.gameOver || this.systemState[key] !== 'down') return
      this.systemState[key] = 'healthy'
      this.updateSystemVisual(key)
      this.refreshStatus()
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

    this.add.text(x, rowY + 26, 'Alvo', { fontFamily: FONT_BODY, fontSize: '13px', fontStyle: '700', color: '#8a8fa3' })
    this.inspTarget = this.add.text(x + swatchW, rowY + 26, '—', { fontFamily: FONT_BODY, fontSize: '13px', fontStyle: '800', color: '#1b2a55' }).setOrigin(1, 0)

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
      this.inspTarget.setText('—')
      this.inspClass.setText('—')
      this.inspDesc.setText('Passe o mouse sobre um pacote para inspecioná-lo.')
      return
    }

    this.inspPort.setText(`${packet.port} (${PORTS[packet.port].label})`)
    this.inspTarget.setText(SYSTEM_POS[packet.target].label)

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
    this.inspClass
      .setText(suspicious ? `Suspeito${packet.kind ? ' — ' + KIND_LABEL[packet.kind] : ''}` : 'Aparenta seguro')
      .setColor(suspicious ? '#e4573d' : '#2e9863')

    let desc = `${PORTS[packet.port].desc} ${suspicious ? 'O IDS identificou um padrão de ataque conhecido.' : 'O IDS não encontrou padrão suspeito — mas isso não é garantia.'}`
    if (packet.dormant) desc = 'Este pacote chegou ao destino e não foi removido — continua presente onde não deveria estar. Isso não é normal.'
    this.inspDesc.setText(desc)
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
    const { width: w } = this.scale
    const toast = this.add
      .text(w / 2, 60, msg, {
        fontFamily: FONT_BODY,
        fontSize: '13px',
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
    this.hudTitle.setText(`Fase 10 · Onda ${this.waveNumber || 0}/${PHASE_10.wavesToWin}`)
    this.waveSquares.forEach((sq, i) => sq.setFillStyle(i < this.wavesSurvived ? COLORS.green : COLORS.panelLine))
    this.scoreText.setText(String(this.score))
  }

  refreshStatus() {
    const online = SYSTEM_KEYS.filter((k) => this.systemState[k] !== 'down' && this.systemState[k] !== 'sacrificed').length
    this.statusText.setText(`Sistemas online: ${online}/${SYSTEM_KEYS.length} (mínimo p/ vencer: ${PHASE_10.onlineNeeded})`)
  }

  startWave() {
    if (this.gameOver) return
    this.waveNumber = (this.waveNumber || 0) + 1
    this.packetsSpawned = 0
    this.packetsResolved = 0
    this.refreshHud()

    this.spawnTimer = this.time.addEvent({
      delay: PHASE_10.packetIntervalMs,
      repeat: PHASE_10.packetsPerWave - 1,
      callback: () => this.spawnPacket(),
    })
    this.spawnPacket()
  }

  activeSystemKeys() {
    return SYSTEM_KEYS.filter((k) => this.systemState[k] !== 'sacrificed')
  }

  spawnPacket() {
    if (this.gameOver || this.packetsSpawned >= PHASE_10.packetsPerWave) return
    this.packetsSpawned++

    const port = Phaser.Utils.Array.GetRandom(PHASE_10.packetPorts)
    const malicious = PHASE_10.maliciousPorts.includes(port) && Math.random() < PHASE_10.maliciousChance
    const kind = malicious ? PHASE_10.threatByPort[port] : null
    // ataques à cadeia de suprimentos nunca são marcados pelo IDS — essa é a lição
    let idsTag = kind === 'supply' ? 'green' : malicious ? 'red' : 'green'
    if (kind !== 'supply' && Math.random() < PHASE_10.idsErrorChance) idsTag = idsTag === 'red' ? 'green' : 'red'
    const target = Phaser.Utils.Array.GetRandom(this.activeSystemKeys())

    const start = NODES.internet
    const token = packetToken(this, start.x, start.y, port, COLORS.muted)

    const packet = { port, malicious, kind, idsTag, target, token, resolved: false, classified: false }
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
      duration: 700,
      onComplete: () => {
        if (packet.resolved) return
        this.classifyPacket(packet)
        if (this.maybeAutoBlock(packet)) return
        this.tweens.add({
          targets: token,
          x: NODES.switch.x,
          y: NODES.switch.y,
          duration: 400,
          onComplete: () => {
            if (packet.resolved) return
            const dest = SYSTEM_POS[target]
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
    packet.token.circle.setFillStyle(packet.idsTag === 'red' ? COLORS.red : COLORS.green)
    this.tweens.add({ targets: packet.token, scale: 1.3, duration: 120, yoyo: true, ease: 'Sine.easeOut' })
    if (this.inspectedPacket === packet) this.showInspector(packet)
  }

  // Modo de Emergência reforça só o worm (algo que o IDS marca) — cadeia de
  // suprimentos nunca é sinalizada, então nenhuma defesa automática a alcança.
  maybeAutoBlock(packet) {
    if (this.emergencyUsed && packet.malicious && packet.idsTag === 'red' && Math.random() < PHASE_10.emergencyBoost) {
      this.totalBlocked++
      this.blockPacket(packet)
      return true
    }
    return false
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
    packet.token.destroy()

    if (!packet.malicious) {
      this.score += 5
      this.refreshHud()
      this.resolvePacketCount()
      return
    }

    this.score -= 15
    if (packet.kind === 'worm') {
      this.infectSystem(packet.target)
    } else {
      this.setSystemDown(packet.target)
    }
    this.refreshHud()
    this.resolvePacketCount()
  }

  resolvePacketCount() {
    this.packetsResolved++
    if (!this.gameOver && this.packetsSpawned >= PHASE_10.packetsPerWave && this.packetsResolved >= this.packetsSpawned) {
      this.finishWave()
    }
  }

  finishWave() {
    this.wavesSurvived++
    this.refreshHud()
    if (this.wavesSurvived >= PHASE_10.wavesToWin) {
      const online = SYSTEM_KEYS.filter((k) => this.systemState[k] !== 'down' && this.systemState[k] !== 'sacrificed').length
      this.endPhase(online >= PHASE_10.onlineNeeded)
    } else {
      this.time.delayedCall(1200, () => this.startWave())
    }
  }

  // Cada APT entra disfarçado (nunca marcado suspeito), pousa num sistema à
  // escolha e não se resolve — fica dormente até ser clicado ou até o
  // temporizador estourar. Podem existir vários ao mesmo tempo.
  spawnApt() {
    if (this.gameOver) return
    const target = Phaser.Utils.Array.GetRandom(this.activeSystemKeys())
    const start = NODES.internet
    const token = packetToken(this, start.x, start.y, 443, COLORS.muted, '📦')

    const packet = { port: 443, malicious: true, kind: 'apt', idsTag: 'green', token, resolved: false, classified: false, isApt: true, target }
    token.setInteractive(new Phaser.Geom.Circle(0, 0, 15), Phaser.Geom.Circle.Contains)
    token.input.cursor = 'pointer'
    token.on('pointerover', () => {
      this.inspectedPacket = packet
      this.showInspector(packet)
    })
    token.on('pointerdown', () => this.neutralizeApt(packet))

    if (!this.portOpen[443]) {
      this.tweens.add({
        targets: token,
        x: NODES.firewall.x,
        y: NODES.firewall.y,
        duration: 500,
        onComplete: () => this.neutralizeApt(packet),
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
          x: NODES.switch.x,
          y: NODES.switch.y,
          duration: 500,
          onComplete: () => {
            if (packet.resolved) return
            const dest = SYSTEM_POS[target]
            this.tweens.add({
              targets: token,
              x: dest.x,
              y: dest.y,
              duration: 700,
              onComplete: () => this.aptDormant(packet),
            })
          },
        })
      },
    })
  }

  aptDormant(packet) {
    if (packet.resolved || this.gameOver) return
    packet.dormant = true
    this.tweens.add({ targets: packet.token, alpha: 0.55, duration: 700, yoyo: true, repeat: -1 })
    if (!this.aptWarned) {
      this.aptWarned = true
      this.showToast('🕵️ Um pacote chegou a um sistema e continua lá. Isso não é normal — inspecione.')
    }

    const dormancyMs = Phaser.Math.Between(PHASE_10.aptDormancyMinMs, PHASE_10.aptDormancyMaxMs)
    packet.activateTimer = this.time.delayedCall(dormancyMs, () => {
      if (this.gameOver || packet.resolved) return
      this.setSystemDown(packet.target)
    })
  }

  neutralizeApt(packet) {
    if (packet.resolved || this.gameOver) return
    packet.resolved = true
    if (packet.activateTimer) packet.activateTimer.remove()
    this.tweens.killTweensOf(packet.token)
    this.tweens.add({
      targets: packet.token,
      scale: 0,
      alpha: 0,
      duration: 200,
      onComplete: () => packet.token.destroy(),
    })
    this.score += 50
    this.refreshHud()
    this.showToast('🛡️ Ameaça persistente neutralizada antes de ativar!')
  }

  endPhase(success) {
    if (this.gameOver) return
    this.gameOver = true
    this.tweens.killAll()
    this.time.removeAllEvents()

    const online = SYSTEM_KEYS.filter((k) => this.systemState[k] !== 'down' && this.systemState[k] !== 'sacrificed')
    const reason = success ? null : `Só ${online.length} de ${SYSTEM_KEYS.length} sistemas críticos estavam online ao fim da última onda — o mínimo era ${PHASE_10.onlineNeeded}.`

    this.time.delayedCall(700, () => {
      this.scene.start('Debriefing', {
        phaseId: PHASE_10.id,
        success,
        stars: this.wavesSurvived,
        reason,
        statCards: [
          { value: this.totalBlocked, label: 'Ataques bloqueados', color: '#4c7ef3' },
          { value: this.totalContained, label: 'Worms contidos a tempo', color: '#3fbf7f' },
          { value: this.score, label: 'Pontuação final', color: '#f5a623' },
        ],
        achievement: success ? PHASE_10.achievement : null,
        funFact: success
          ? 'O ataque Stuxnet (2010) destruiu centrífugas nucleares iranianas sem disparar um tiro — mesmo numa rede com air gap, o malware chegou via pendrive. Você concluiu a jornada: portas e firewalls, IDS e falsos negativos, honeypots, DMZ, contenção de ransomware, TLS e certificados forjados, IDS nível 3, dispositivos IoT críticos, MFA e fraude bancária, e agora guerra cibernética. Nenhuma defesa isolada é suficiente — defesa em profundidade é o que protege sistemas de verdade.'
          : 'O ataque Stuxnet (2010) destruiu centrífugas nucleares iranianas sem disparar um tiro — mesmo numa rede com air gap total, o malware chegou fisicamente via pendrive. Infraestrutura crítica exige defesa em profundidade: nenhuma camada isolada é suficiente.',
      })
    })
  }
}
