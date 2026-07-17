import Phaser from 'phaser'
import { COLORS, PORTS, PHASE_8, FONT_HEADING, FONT_BODY } from '../gameData.js'
import { card, packetToken, backButton, chunkyButton } from '../ui.js'
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
  ids: { x: MAP_X + 245, y: MAP_Y + MAP_H / 2, label: 'IDS / IPS' },
  switch: { x: MAP_X + 340, y: MAP_Y + MAP_H / 2, label: 'Switch' },
}

const PRONTUARIOS_POS = { x: MAP_X + 460, y: MAP_Y + 140, icon: '📋', label: 'Prontuários' }
const ADMIN_POS = { x: MAP_X + 460, y: MAP_Y + 320, icon: '🖥️', label: 'Administrativo' }
const IOT_POS = {
  marcapasso: { x: MAP_X + 570, y: MAP_Y + 110, icon: '❤️', label: 'Marca-passo' },
  ventilador: { x: MAP_X + 570, y: MAP_Y + 220, icon: '🫁', label: 'Ventilador' },
  monitor: { x: MAP_X + 570, y: MAP_Y + 330, icon: '📟', label: 'Monitor Cardíaco' },
}
const IOT_KEYS = Object.keys(IOT_POS)

const KIND_LABEL = { ransomware: 'Ransomware Hospitalar', trojan: 'Trojan Administrativo', ddos: 'DDoS em Equipamento IoT' }

export default class Phase8Scene extends Phaser.Scene {
  constructor() {
    super('Phase8')
  }

  create() {
    const { width: w } = this.scale
    this.cameras.main.setBackgroundColor(COLORS.grassLight)
    this.gameOver = false
    this.setupDone = false

    // HUD
    card(this, 0, 0, w, 52, { radius: 0, fill: COLORS.navy })
    this.hudTitle = this.add.text(20, 17, '', { fontFamily: FONT_HEADING, fontSize: '15px', color: '#ffffff' })
    this.waveSquares = []
    for (let i = 0; i < PHASE_8.wavesToWin; i++) {
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
    this.siemText = this.add.text(MAP_X + 20, MAP_Y + MAP_H - 22, 'SIEM: Ransomware 0 · DDoS IoT 0 · Trojan 0', {
      fontFamily: FONT_BODY,
      fontSize: '11px',
      fontStyle: '700',
      color: '#8a8fa3',
    })
    this.siemCounts = { ransomware: 0, trojan: 0, ddos: 0 }

    // painel inspetor de pacotes
    card(this, INSP_X, INSP_Y, INSP_W, INSP_H, { radius: 22 })
    this.inspTitle = this.add.text(INSP_X + 20, INSP_Y + 16, 'PACOTE SELECIONADO', { fontFamily: FONT_BODY, fontSize: '11px', fontStyle: '800', color: '#8a8fa3' })
    this.buildInspector()
    this.buildSetupPanel()

    this.portOpen = {}
    PHASE_8.packetPorts.forEach((p) => (this.portOpen[p] = true))
    const lockablePorts = PHASE_8.packetPorts.filter((p) => p !== PHASE_8.iotPort)
    this.portModal = buildPortModal(this, {
      ports: lockablePorts,
      portOpen: this.portOpen,
      onClose: () => this.toggleFirewallModal(false),
    })

    this.recordsDown = false
    this.adminDown = false
    this.iotCompromised = {}
    IOT_KEYS.forEach((k) => (this.iotCompromised[k] = false))

    this.score = 0
    this.totalBlocked = 0
    this.totalAutoBlocked = 0
    this.totalOverblocked = 0
    this.totalMissed = 0
    this.wavesSurvived = 0
    this.waveNumber = 0

    this.packetsSpawned = 0
    this.packetsResolved = 0

    this.refreshHud()
  }

  buildSetupPanel() {
    const x = INSP_X + 20
    const y = INSP_Y + 16
    const width = INSP_W - 40
    const els = []

    els.push(
      this.add.text(
        x,
        y + 4,
        'A porta 2575 (HL7) dos equipamentos médicos não pode ser fechada. Ela só é protegida por um IPS automático — inspecione e clique nos pacotes suspeitos que a miram assim que a fase começar.',
        {
          fontFamily: FONT_BODY,
          fontSize: '13px',
          color: '#3a4160',
          wordWrap: { width },
          lineSpacing: 5,
        },
      ),
    )

    const btnY = y + 160
    const startBtn = chunkyButton(this, x, btnY, width, 44, {
      radius: 14,
      fill: COLORS.amber,
      fillHover: 0xf7b64d,
      shadow: COLORS.amberDark,
      shadowOffset: 5,
      label: 'Iniciar Ondas',
      fontSize: '15px',
      textColor: '#1b2a55',
      onClick: () => this.startSetup(),
    })
    els.push(startBtn.graphics, startBtn.text)

    this.setupElements = els
  }

  startSetup() {
    if (this.setupDone) return
    this.setupDone = true
    this.setupElements.forEach((el) => el.setVisible(false))
    this.inspectorElements.forEach((el) => el.setVisible(true))
    this.startWave()
  }

  buildNetworkMap() {
    const g = this.add.graphics()
    g.lineStyle(4, COLORS.panelLine, 1)
    g.lineBetween(NODES.internet.x, NODES.internet.y, NODES.firewall.x, NODES.firewall.y)
    g.lineBetween(NODES.firewall.x, NODES.firewall.y, NODES.ids.x, NODES.ids.y)
    g.lineBetween(NODES.ids.x, NODES.ids.y, NODES.switch.x, NODES.switch.y)
    g.lineBetween(NODES.switch.x, NODES.switch.y, PRONTUARIOS_POS.x, PRONTUARIOS_POS.y)
    g.lineBetween(NODES.switch.x, NODES.switch.y, ADMIN_POS.x, ADMIN_POS.y)
    Object.values(IOT_POS).forEach((p) => g.lineBetween(NODES.switch.x, NODES.switch.y, p.x, p.y))

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

    this.prontuariosRect = this.add.rectangle(PRONTUARIOS_POS.x, PRONTUARIOS_POS.y, 60, 46, COLORS.green).setStrokeStyle(4, COLORS.navy)
    this.prontuariosIcon = this.add.text(PRONTUARIOS_POS.x, PRONTUARIOS_POS.y, PRONTUARIOS_POS.icon, { fontSize: '18px' }).setOrigin(0.5)
    this.add.text(PRONTUARIOS_POS.x, PRONTUARIOS_POS.y + 32, PRONTUARIOS_POS.label, { fontFamily: FONT_BODY, fontSize: '11px', fontStyle: '700', color: '#1b2a55' }).setOrigin(0.5, 0)

    this.adminRect = this.add.rectangle(ADMIN_POS.x, ADMIN_POS.y, 60, 46, COLORS.green).setStrokeStyle(4, COLORS.navy)
    this.adminIcon = this.add.text(ADMIN_POS.x, ADMIN_POS.y, ADMIN_POS.icon, { fontSize: '18px' }).setOrigin(0.5)
    this.add.text(ADMIN_POS.x, ADMIN_POS.y + 32, ADMIN_POS.label, { fontFamily: FONT_BODY, fontSize: '11px', fontStyle: '700', color: '#1b2a55' }).setOrigin(0.5, 0)

    this.add.rectangle(MAP_X + 570, MAP_Y + 220, 100, 300, COLORS.panel, 0).setStrokeStyle(3, COLORS.red)
    this.add.text(MAP_X + 570, MAP_Y + 60, 'EQUIPAMENTOS IoT', { fontFamily: FONT_BODY, fontSize: '9px', fontStyle: '800', color: '#e4573d' }).setOrigin(0.5)

    this.iotNodes = {}
    Object.entries(IOT_POS).forEach(([key, p]) => {
      const rect = this.add.rectangle(p.x, p.y, 50, 40, COLORS.green).setStrokeStyle(4, COLORS.navy)
      const icon = this.add.text(p.x, p.y, p.icon, { fontSize: '16px' }).setOrigin(0.5)
      this.add.text(p.x, p.y + 28, p.label, { fontFamily: FONT_BODY, fontSize: '9px', fontStyle: '700', color: '#1b2a55', align: 'center', wordWrap: { width: 80 } }).setOrigin(0.5, 0)
      this.iotNodes[key] = { rect, icon }
    })
  }

  buildInspector() {
    const x = INSP_X + 20
    const swatchY = INSP_Y + 44
    const swatchW = INSP_W - 40
    const swatchH = 84

    this.inspSwatch = this.add.graphics()
    this.inspIcon = this.add.circle(x + swatchW / 2, swatchY + swatchH / 2, 22, COLORS.muted)
    this.inspIconText = this.add.text(x + swatchW / 2, swatchY + swatchH / 2, '✉️', { fontSize: '18px' }).setOrigin(0.5)

    const rowY = swatchY + swatchH + 20
    const l1 = this.add.text(x, rowY, 'Porta', { fontFamily: FONT_BODY, fontSize: '13px', fontStyle: '700', color: '#8a8fa3' })
    this.inspPort = this.add.text(x + swatchW, rowY, '—', { fontFamily: FONT_BODY, fontSize: '13px', fontStyle: '800', color: '#1b2a55' }).setOrigin(1, 0)

    const l2 = this.add.text(x, rowY + 26, 'Alvo', { fontFamily: FONT_BODY, fontSize: '13px', fontStyle: '700', color: '#8a8fa3' })
    this.inspTarget = this.add.text(x + swatchW, rowY + 26, '—', { fontFamily: FONT_BODY, fontSize: '13px', fontStyle: '800', color: '#1b2a55' }).setOrigin(1, 0)

    const l3 = this.add.text(x, rowY + 52, 'Classificação', { fontFamily: FONT_BODY, fontSize: '13px', fontStyle: '700', color: '#8a8fa3' })
    this.inspClass = this.add.text(x + swatchW, rowY + 52, '—', { fontFamily: FONT_BODY, fontSize: '13px', fontStyle: '800', color: '#1b2a55' }).setOrigin(1, 0)

    const descY = rowY + 84
    const descCard = card(this, x, descY, swatchW, INSP_H - (descY - INSP_Y) - 16, { radius: 12, fill: COLORS.panel })
    this.inspDesc = this.add.text(x + 12, descY + 12, 'Passe o mouse sobre um pacote para inspecioná-lo.', {
      fontFamily: FONT_BODY,
      fontSize: '12px',
      color: '#5a6072',
      wordWrap: { width: swatchW - 24 },
      lineSpacing: 3,
    })

    this.inspectorElements = [
      this.inspTitle,
      this.inspSwatch,
      this.inspIcon,
      this.inspIconText,
      l1,
      this.inspPort,
      l2,
      this.inspTarget,
      l3,
      this.inspClass,
      descCard,
      this.inspDesc,
    ]
    this.showInspector(null)
    this.inspectorElements.forEach((el) => el.setVisible(false))
  }

  targetLabel(target) {
    if (target === 'prontuarios') return PRONTUARIOS_POS.label
    if (target === 'administrativo') return ADMIN_POS.label
    return IOT_POS[target].label
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
    this.hudTitle.setText(`Fase 8 · Onda ${this.waveNumber || 0}/${PHASE_8.wavesToWin}`)
    this.waveSquares.forEach((sq, i) => sq.setFillStyle(i < this.wavesSurvived ? COLORS.green : COLORS.panelLine))
    this.scoreText.setText(String(this.score))
  }

  refreshSiem() {
    this.siemText.setText(`SIEM: Ransomware ${this.siemCounts.ransomware} · DDoS IoT ${this.siemCounts.ddos} · Trojan ${this.siemCounts.trojan}`)
  }

  startWave() {
    if (this.gameOver) return
    this.waveNumber = (this.waveNumber || 0) + 1
    this.packetsSpawned = 0
    this.packetsResolved = 0
    this.refreshHud()

    this.spawnTimer = this.time.addEvent({
      delay: PHASE_8.packetIntervalMs,
      repeat: PHASE_8.packetsPerWave - 1,
      callback: () => this.spawnPacket(),
    })
    this.spawnPacket()
  }

  spawnPacket() {
    if (this.gameOver || this.packetsSpawned >= PHASE_8.packetsPerWave) return
    this.packetsSpawned++

    const port = Phaser.Utils.Array.GetRandom(PHASE_8.packetPorts)
    const malicious = PHASE_8.maliciousPorts.includes(port) && Math.random() < PHASE_8.maliciousChance
    const kind = malicious ? PHASE_8.threatByPort[port] : null
    let idsTag = malicious ? 'red' : 'green'
    if (Math.random() < PHASE_8.idsErrorChance) idsTag = idsTag === 'red' ? 'green' : 'red'

    let target
    if (kind === 'ransomware') target = 'prontuarios'
    else if (kind === 'trojan') target = 'administrativo'
    else if (kind === 'ddos') target = Phaser.Utils.Array.GetRandom(IOT_KEYS)
    else target = Phaser.Utils.Array.GetRandom(['prontuarios', 'administrativo'])

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
            const dest = target === 'prontuarios' ? PRONTUARIOS_POS : target === 'administrativo' ? ADMIN_POS : IOT_POS[target]
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
    if (packet.malicious) {
      this.siemCounts[packet.kind]++
      this.refreshSiem()
    }
    if (this.inspectedPacket === packet) this.showInspector(packet)
  }

  // IPS dedicado à porta fixa dos equipamentos IoT — não existe um IDS geral
  // nível 3 nesta fase, só essa proteção específica onde o firewall não pode agir.
  maybeAutoBlock(packet) {
    if (packet.kind === 'ddos' && packet.malicious && packet.idsTag === 'red' && Math.random() < PHASE_8.iotAutoBlockChance) {
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

    if (IOT_KEYS.includes(packet.target)) {
      this.iotCompromised[packet.target] = true
      this.endPhase(false, 'iot', packet.target)
      return
    }

    this.score -= 15
    this.totalMissed++
    if (packet.target === 'prontuarios') this.setRecordsDown()
    else this.setAdminDown()
    this.refreshHud()
    this.resolvePacketCount()
  }

  setRecordsDown() {
    if (this.gameOver || this.recordsDown) return
    this.recordsDown = true
    this.prontuariosRect.setFillStyle(COLORS.muted)
    this.prontuariosIcon.setText('❌').setFontSize('16px')
    this.time.delayedCall(PHASE_8.recordsDownMs, () => {
      if (this.gameOver) return
      this.recordsDown = false
      this.prontuariosRect.setFillStyle(COLORS.green)
      this.prontuariosIcon.setText(PRONTUARIOS_POS.icon).setFontSize('18px')
    })
  }

  setAdminDown() {
    if (this.gameOver || this.adminDown) return
    this.adminDown = true
    this.adminRect.setFillStyle(COLORS.muted)
    this.adminIcon.setText('❌').setFontSize('16px')
    this.time.delayedCall(PHASE_8.adminDownMs, () => {
      if (this.gameOver) return
      this.adminDown = false
      this.adminRect.setFillStyle(COLORS.green)
      this.adminIcon.setText(ADMIN_POS.icon).setFontSize('18px')
    })
  }

  resolvePacketCount() {
    this.packetsResolved++
    if (!this.gameOver && this.packetsSpawned >= PHASE_8.packetsPerWave && this.packetsResolved >= this.packetsSpawned) {
      this.finishWave()
    }
  }

  finishWave() {
    this.wavesSurvived++
    this.refreshHud()
    if (this.wavesSurvived >= PHASE_8.wavesToWin) {
      this.endPhase(!this.recordsDown, 'records-down')
    } else {
      this.time.delayedCall(1200, () => this.startWave())
    }
  }

  endPhase(success, cause = null, iotKey = null) {
    if (this.gameOver) return
    this.gameOver = true
    this.tweens.killAll()
    this.time.removeAllEvents()

    let reason = null
    if (!success) {
      reason =
        cause === 'iot'
          ? `${IOT_POS[iotKey].label} foi comprometido — equipamentos médicos não têm segunda chance, mesmo um único incidente é derrota.`
          : 'O servidor de prontuários ainda estava offline quando a última onda terminou — hospitais não podem ficar sem esse sistema.'
    }

    this.time.delayedCall(700, () => {
      this.scene.start('Debriefing', {
        phaseId: PHASE_8.id,
        success,
        stars: this.wavesSurvived,
        reason,
        statCards: [
          { value: this.totalBlocked, label: 'Ataques bloqueados', color: '#4c7ef3' },
          { value: this.totalAutoBlocked, label: 'Bloqueios automáticos do IPS', color: '#3fbf7f' },
          { value: this.score, label: 'Pontuação final', color: '#f5a623' },
        ],
        achievement: success ? PHASE_8.achievement : null,
        funFact:
          'Em 2020, um hospital alemão sofreu um ataque de ransomware que forçou a transferência de uma paciente para outra cidade — ela morreu no caminho. A LGPD e leis semelhantes exigem proteção especial para dados de saúde justamente por esse tipo de risco.',
      })
    })
  }
}
