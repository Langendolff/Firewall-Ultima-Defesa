import Phaser from 'phaser'
import { COLORS, PORTS, PHASE_9, FONT_HEADING, FONT_BODY } from '../gameData.js'
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

const TARGET_POS = {
  internetbanking: { x: MAP_X + 460, y: MAP_Y + 110, icon: '💳', label: 'Internet Banking' },
  atms: { x: MAP_X + 460, y: MAP_Y + 220, icon: '🏧', label: 'ATMs' },
  swift: { x: MAP_X + 460, y: MAP_Y + 330, icon: '🌍', label: 'SWIFT' },
}
const CORE_POS = { x: MAP_X + 560, y: MAP_Y + 440, label: 'Core Bancário' }
const MFA_POS = { x: MAP_X + 245, y: MAP_Y + 420 }

const KIND_LABEL = { mitm: 'Fraude via MITM', swift: 'Ataque SWIFT', ddos: 'DDoS nos ATMs', apt: 'APT (Ameaça Persistente)' }

export default class Phase9Scene extends Phaser.Scene {
  constructor() {
    super('Phase9')
  }

  create() {
    const { width: w } = this.scale
    this.cameras.main.setBackgroundColor(COLORS.grassLight)
    this.gameOver = false

    // HUD
    card(this, 0, 0, w, 52, { radius: 0, fill: COLORS.navy })
    this.hudTitle = this.add.text(20, 17, '', { fontFamily: FONT_HEADING, fontSize: '15px', color: '#ffffff' })
    this.waveSquares = []
    for (let i = 0; i < PHASE_9.wavesToWin; i++) {
      this.waveSquares.push(this.add.rectangle(210 + i * 22, 26, 16, 18, COLORS.panelLine, 1))
    }
    this.speed = buildSpeedControls(this, w / 2 - 47, 12)
    this.add.circle(w - 148, 26, 9, COLORS.amber)
    this.scoreText = this.add.text(w - 130, 17, '', { fontFamily: FONT_HEADING, fontSize: '16px', fontStyle: '800', color: '#ffffff' })
    backButton(this, w - 44, 8)

    // painel do mapa de rede
    card(this, MAP_X, MAP_Y, MAP_W, MAP_H, { radius: 22 })
    this.add.text(MAP_X + 20, MAP_Y + 14, 'MAPA DA REDE', { fontFamily: FONT_BODY, fontSize: '11px', fontStyle: '800', color: '#8a8fa3' })
    this.buildNetworkMap()
    this.fraudText = this.add.text(MAP_X + 20, MAP_Y + MAP_H - 22, '', { fontFamily: FONT_BODY, fontSize: '11px', fontStyle: '700', color: '#8a8fa3' })

    // painel inspetor de pacotes
    card(this, INSP_X, INSP_Y, INSP_W, INSP_H, { radius: 22 })
    this.add.text(INSP_X + 20, INSP_Y + 16, 'PACOTE SELECIONADO', { fontFamily: FONT_BODY, fontSize: '11px', fontStyle: '800', color: '#8a8fa3' })
    this.buildInspector()

    this.portOpen = {}
    PHASE_9.packetPorts.forEach((p) => (this.portOpen[p] = true))
    this.portModal = buildPortModal(this, {
      ports: PHASE_9.packetPorts,
      portOpen: this.portOpen,
      onClose: () => this.toggleFirewallModal(false),
    })

    this.mfaEnabled = false
    this.atmDown = false
    this.fraudCount = 0
    this.aptWarned = false

    this.score = 0
    this.totalBlocked = 0
    this.totalAutoBlocked = 0
    this.totalOverblocked = 0
    this.wavesSurvived = 0
    this.waveNumber = 0

    this.packetsSpawned = 0
    this.packetsResolved = 0

    this.refreshHud()
    this.refreshFraud()
    this.startWave()
    this.time.delayedCall(PHASE_9.aptSpawnDelayMs, () => this.spawnApt())
  }

  buildNetworkMap() {
    const g = this.add.graphics()
    g.lineStyle(4, COLORS.panelLine, 1)
    g.lineBetween(NODES.internet.x, NODES.internet.y, NODES.firewall.x, NODES.firewall.y)
    g.lineBetween(NODES.firewall.x, NODES.firewall.y, NODES.ids.x, NODES.ids.y)
    g.lineBetween(NODES.ids.x, NODES.ids.y, NODES.switch.x, NODES.switch.y)
    Object.values(TARGET_POS).forEach((p) => g.lineBetween(NODES.switch.x, NODES.switch.y, p.x, p.y))
    g.lineStyle(3, COLORS.red, 0.5)
    g.lineBetween(NODES.switch.x, NODES.switch.y, CORE_POS.x, CORE_POS.y)

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

    this.targetNodes = {}
    Object.entries(TARGET_POS).forEach(([key, p]) => {
      const rect = this.add.rectangle(p.x, p.y, 56, 44, COLORS.green).setStrokeStyle(4, COLORS.navy)
      const icon = this.add.text(p.x, p.y, p.icon, { fontSize: '18px' }).setOrigin(0.5)
      this.add.text(p.x, p.y + 32, p.label, { fontFamily: FONT_BODY, fontSize: '10px', fontStyle: '700', color: '#1b2a55' }).setOrigin(0.5, 0)
      this.targetNodes[key] = { rect, icon }
    })

    this.add.rectangle(CORE_POS.x, CORE_POS.y, 64, 50, COLORS.panel).setStrokeStyle(4, COLORS.red)
    this.add.text(CORE_POS.x, CORE_POS.y, '🏛️', { fontSize: '20px' }).setOrigin(0.5)
    this.add.text(CORE_POS.x, CORE_POS.y + 32, CORE_POS.label, { fontFamily: FONT_BODY, fontSize: '11px', fontStyle: '700', color: '#1b2a55' }).setOrigin(0.5, 0)

    // MFA — torre defensiva ligável a qualquer momento; só ajuda contra fraude
    // (MITM/SWIFT), não contra DDoS ou o APT.
    this.mfaBox = this.add.rectangle(MFA_POS.x, MFA_POS.y, 54, 44, COLORS.muted).setStrokeStyle(3, COLORS.panelLine)
    this.mfaBox.setInteractive({ useHandCursor: true })
    this.mfaBox.on('pointerdown', () => this.toggleMfa())
    this.mfaIcon = this.add.text(MFA_POS.x, MFA_POS.y - 3, '🔐', { fontSize: '18px' }).setOrigin(0.5)
    this.mfaStatus = this.add.text(MFA_POS.x, MFA_POS.y + 14, 'OFF', { fontFamily: FONT_BODY, fontSize: '9px', fontStyle: '800', color: '#ffffff' }).setOrigin(0.5)
    this.add.text(MFA_POS.x, MFA_POS.y + 32, 'MFA (clique)', { fontFamily: FONT_BODY, fontSize: '10px', fontStyle: '700', color: '#1b2a55' }).setOrigin(0.5, 0)
  }

  toggleMfa() {
    this.mfaEnabled = !this.mfaEnabled
    this.mfaBox.setFillStyle(this.mfaEnabled ? COLORS.green : COLORS.muted).setStrokeStyle(3, this.mfaEnabled ? COLORS.greenDark : COLORS.panelLine)
    this.mfaStatus.setText(this.mfaEnabled ? 'ON' : 'OFF')
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

  targetLabel(target) {
    if (target === 'core') return CORE_POS.label
    return TARGET_POS[target].label
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
    this.inspTarget.setText(this.targetLabel(packet.target))

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
    this.hudTitle.setText(`Fase 9 · Onda ${this.waveNumber || 0}/${PHASE_9.wavesToWin}`)
    this.waveSquares.forEach((sq, i) => sq.setFillStyle(i < this.wavesSurvived ? COLORS.green : COLORS.panelLine))
    this.scoreText.setText(String(this.score))
  }

  refreshFraud() {
    this.fraudText.setText(`Transações fraudulentas: ${this.fraudCount}/${PHASE_9.fraudLimit}`)
  }

  startWave() {
    if (this.gameOver) return
    this.waveNumber = (this.waveNumber || 0) + 1
    this.packetsSpawned = 0
    this.packetsResolved = 0
    this.refreshHud()

    this.spawnTimer = this.time.addEvent({
      delay: PHASE_9.packetIntervalMs,
      repeat: PHASE_9.packetsPerWave - 1,
      callback: () => this.spawnPacket(),
    })
    this.spawnPacket()
  }

  spawnPacket() {
    if (this.gameOver || this.packetsSpawned >= PHASE_9.packetsPerWave) return
    this.packetsSpawned++

    const port = Phaser.Utils.Array.GetRandom(PHASE_9.packetPorts)
    const malicious = PHASE_9.maliciousPorts.includes(port) && Math.random() < PHASE_9.maliciousChance
    const kind = malicious ? PHASE_9.threatByPort[port] : null
    let idsTag = malicious ? 'red' : 'green'
    if (Math.random() < PHASE_9.idsErrorChance) idsTag = idsTag === 'red' ? 'green' : 'red'

    let target
    if (kind === 'mitm') target = 'internetbanking'
    else if (kind === 'swift') target = 'swift'
    else if (kind === 'ddos') target = 'atms'
    else target = Phaser.Utils.Array.GetRandom(Object.keys(TARGET_POS))

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
            const dest = TARGET_POS[target]
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

  // MFA só reforça fraude (MITM/SWIFT) — DDoS nos ATMs e o APT não passam por
  // essa proteção, cada ameaça tem sua própria defesa dedicada.
  maybeAutoBlock(packet) {
    const isFraudKind = packet.kind === 'mitm' || packet.kind === 'swift'
    if (isFraudKind && this.mfaEnabled && packet.malicious && packet.idsTag === 'red' && Math.random() < PHASE_9.mfaAutoBlockChance) {
      this.totalAutoBlocked++
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

    if (packet.target === 'atms') {
      this.score -= 15
      this.setAtmDown()
      this.refreshHud()
      this.resolvePacketCount()
      return
    }

    this.score -= 20
    this.fraudCount++
    this.refreshFraud()
    this.refreshHud()
    if (this.fraudCount >= PHASE_9.fraudLimit) {
      this.endPhase(false, 'fraud')
      return
    }
    this.resolvePacketCount()
  }

  setAtmDown() {
    if (this.gameOver || this.atmDown) return
    this.atmDown = true
    const n = this.targetNodes.atms
    n.rect.setFillStyle(COLORS.muted)
    n.icon.setText('❌').setFontSize('16px')
    this.time.delayedCall(PHASE_9.atmDownMs, () => {
      if (this.gameOver) return
      this.atmDown = false
      n.rect.setFillStyle(COLORS.green)
      n.icon.setText(TARGET_POS.atms.icon).setFontSize('18px')
    })
  }

  resolvePacketCount() {
    this.packetsResolved++
    if (!this.gameOver && this.packetsSpawned >= PHASE_9.packetsPerWave && this.packetsResolved >= this.packetsSpawned) {
      this.finishWave()
    }
  }

  finishWave() {
    this.wavesSurvived++
    this.refreshHud()
    if (this.wavesSurvived >= PHASE_9.wavesToWin) {
      this.endPhase(this.fraudCount < PHASE_9.fraudLimit)
    } else {
      this.time.delayedCall(1200, () => this.startWave())
    }
  }

  // O APT entra disfarçado (nunca marcado suspeito), pousa no core bancário e
  // não se resolve — fica dormente até ser clicado ou até o temporizador estourar.
  spawnApt() {
    if (this.gameOver) return
    const start = NODES.internet
    const token = packetToken(this, start.x, start.y, 443, COLORS.muted, '📦')

    const packet = { port: 443, malicious: true, kind: 'apt', idsTag: 'green', token, resolved: false, classified: false, isApt: true, target: 'core' }
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
            this.tweens.add({
              targets: token,
              x: CORE_POS.x,
              y: CORE_POS.y,
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
      this.showToast('🕵️ Um pacote chegou ao core bancário e continua lá. Isso não é normal — inspecione.')
    }

    const dormancyMs = Phaser.Math.Between(PHASE_9.aptDormancyMinMs, PHASE_9.aptDormancyMaxMs)
    this.aptActivateTimer = this.time.delayedCall(dormancyMs, () => {
      if (this.gameOver || packet.resolved) return
      this.endPhase(false, 'apt')
    })
  }

  neutralizeApt(packet) {
    if (packet.resolved || this.gameOver) return
    packet.resolved = true
    if (this.aptActivateTimer) this.aptActivateTimer.remove()
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

  endPhase(success, cause = null) {
    if (this.gameOver) return
    this.gameOver = true
    this.tweens.killAll()
    this.time.removeAllEvents()

    let reason = null
    if (!success) {
      reason =
        cause === 'apt'
          ? 'Um APT ficou dormente no core bancário sem ser detectado e ativou o ataque — infiltrações silenciosas evitam qualquer defesa de perímetro.'
          : `${PHASE_9.fraudLimit} transações fraudulentas foram completadas — o MFA e a inspeção manual não foram suficientes para conter os ataques a tempo.`
    }

    this.time.delayedCall(700, () => {
      this.scene.start('Debriefing', {
        phaseId: PHASE_9.id,
        success,
        stars: this.wavesSurvived,
        reason,
        statCards: [
          { value: this.totalBlocked, label: 'Ataques bloqueados', color: '#4c7ef3' },
          { value: this.fraudCount, label: `Fraudes (limite ${PHASE_9.fraudLimit})`, color: this.fraudCount > 0 ? '#e4573d' : '#3fbf7f' },
          { value: this.score, label: 'Pontuação final', color: '#f5a623' },
        ],
        achievement: success && this.fraudCount === 0 ? PHASE_9.achievement : null,
        funFact:
          'O ataque ao SWIFT em 2016 desviou US$ 81 milhões do Banco Central de Bangladesh usando credenciais roubadas — MFA e o princípio do menor privilégio são defesas diretas contra esse tipo de fraude.',
      })
    })
  }
}
