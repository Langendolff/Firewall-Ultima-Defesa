import Phaser from 'phaser'
import { COLORS, PORTS, PHASE_4, FONT_HEADING, FONT_BODY } from '../gameData.js'
import { card, packetToken, backButton, chunkyButton, PACKET_HIT_RADIUS } from '../ui.js'
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

const ZONES = {
  dmz: { x: MAP_X + 500, y: MAP_Y + 100, w: 190, h: 96, label: 'DMZ', color: COLORS.amber },
  interna: { x: MAP_X + 500, y: MAP_Y + MAP_H / 2, w: 190, h: 96, label: 'Rede Interna', color: COLORS.blue },
  critica: { x: MAP_X + 500, y: MAP_Y + MAP_H - 100, w: 190, h: 96, label: 'Segmento Crítico', color: COLORS.red },
}

const SERVERS = {
  web: { icon: '🌐', label: 'Servidor Web', trayX: MAP_X + 90 },
  email: { icon: '✉️', label: 'Servidor de E-mail', trayX: MAP_X + 210 },
  db: { icon: '🗄️', label: 'Banco de Dados', trayX: MAP_X + 330 },
}
const TRAY_Y = MAP_Y + 126

const MALWARE_LABEL = { phishing: 'Phishing', ddos: 'DDoS' }

export default class Phase4Scene extends Phaser.Scene {
  constructor() {
    super('Phase4')
  }

  create() {
    this.guide = null
    const { width: w } = this.scale
    this.cameras.main.setBackgroundColor(COLORS.grassLight)
    this.gameOver = false
    this.setupDone = false

    // HUD
    card(this, 0, 0, w, 52, { radius: 0, fill: COLORS.navy })
    this.hudTitle = this.add.text(20, 17, '', { fontFamily: FONT_HEADING, fontSize: '15px', color: '#ffffff' })
    this.waveSquares = []
    for (let i = 0; i < PHASE_4.wavesToWin; i++) {
      this.waveSquares.push(this.add.rectangle(210 + i * 22, 26, 16, 18, COLORS.panelLine, 1))
    }
    this.speed = buildSpeedControls(this, w / 2 - 47, 12)
    this.add.text(w - 162, 26, 'PONTOS', { fontFamily: FONT_BODY, fontSize: '13px', fontStyle: '800', color: '#8fa5e8' }).setOrigin(1, 0.5)
    this.add.circle(w - 148, 26, 9, COLORS.amber)
    this.scoreText = this.add.text(w - 130, 17, '', { fontFamily: FONT_HEADING, fontSize: '16px', fontStyle: '800', color: '#ffffff' })
    backButton(this, w - 44, 8)

    // painel do mapa de rede
    card(this, MAP_X, MAP_Y, MAP_W, MAP_H, { radius: 22 })
    this.add.text(MAP_X + 20, MAP_Y + 14, 'MAPA DA REDE', { fontFamily: FONT_BODY, fontSize: '13px', fontStyle: '800', color: '#8a8fa3' })
    this.buildNetworkMap()

    // painel inspetor / configuração de segmentação
    card(this, INSP_X, INSP_Y, INSP_W, INSP_H, { radius: 22 })
    this.buildSetupPanel()
    this.buildInspector()

    this.portOpen = {}
    PHASE_4.packetPorts.forEach((p) => (this.portOpen[p] = true))
    this.portModal = buildPortModal(this, {
      ports: PHASE_4.packetPorts,
      portOpen: this.portOpen,
      onClose: () => this.toggleFirewallModal(false),
    })

    this.serverZone = { web: null, email: null, db: null }
    this.dbWarned = false
    this.score = 0
    this.totalBlocked = 0
    this.totalMissed = 0
    this.totalOverblocked = 0
    this.wavesSurvived = 0
    this.waveNumber = 0

    this.packetsSpawned = 0
    this.packetsResolved = 0

    this.refreshHud()
    this.buildServerTokens()
    this.guide = buildGuide(this, { phase: PHASE_4 })
  }

  buildNetworkMap() {
    const g = this.add.graphics()
    g.lineStyle(4, COLORS.panelLine, 1)
    g.lineBetween(NODES.internet.x, NODES.internet.y, NODES.firewall.x, NODES.firewall.y)
    g.lineBetween(NODES.firewall.x, NODES.firewall.y, NODES.ids.x, NODES.ids.y)
    g.lineBetween(NODES.ids.x, NODES.ids.y, NODES.switch.x, NODES.switch.y)
    Object.values(ZONES).forEach((z) => g.lineBetween(NODES.switch.x, NODES.switch.y, z.x, z.y))

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

    Object.values(ZONES).forEach((z) => {
      this.add.rectangle(z.x, z.y, z.w, z.h, COLORS.panel).setStrokeStyle(3, z.color)
      this.add.text(z.x, z.y - z.h / 2 - 12, z.label, { fontFamily: FONT_BODY, fontSize: '13px', fontStyle: '800', color: '#1b2a55' }).setOrigin(0.5)
    })
    this.add
      .text(ZONES.interna.x, ZONES.interna.y + ZONES.interna.h / 2 - 14, '👥 10 funcionários', { fontFamily: FONT_BODY, fontSize: '12px', color: '#5a6072' })
      .setOrigin(0.5)
    this.add
      .text(ZONES.critica.x, ZONES.critica.y + ZONES.critica.h / 2 - 14, '🔒 dados críticos', { fontFamily: FONT_BODY, fontSize: '12px', color: '#5a6072' })
      .setOrigin(0.5)
  }

  buildServerTokens() {
    this.serverTokens = {}
    Object.entries(SERVERS).forEach(([key, s]) => {
      this.add
        .text(s.trayX, TRAY_Y - 30, s.label, {
          fontFamily: FONT_BODY,
          fontSize: '12px',
          fontStyle: '700',
          color: '#1b2a55',
          align: 'center',
          wordWrap: { width: 90 },
        })
        .setOrigin(0.5, 1)

      const token = this.add.container(s.trayX, TRAY_Y)
      const box = this.add.rectangle(0, 0, 44, 44, COLORS.white).setStrokeStyle(3, COLORS.navy)
      const icon = this.add.text(0, 0, s.icon, { fontSize: '18px' }).setOrigin(0.5)
      token.add([box, icon])
      token.serverKey = key
      token.homeX = s.trayX
      token.homeY = TRAY_Y
      token.setInteractive(new Phaser.Geom.Rectangle(-22, -22, 44, 44), Phaser.Geom.Rectangle.Contains)
      token.input.cursor = 'grab'
      this.input.setDraggable(token)
      this.serverTokens[key] = token
    })

    this.input.on('drag', (pointer, obj, dragX, dragY) => {
      if (!obj.serverKey || this.setupDone) return
      obj.x = Phaser.Math.Clamp(dragX, MAP_X + 25, MAP_X + MAP_W - 25)
      obj.y = Phaser.Math.Clamp(dragY, MAP_Y + 25, MAP_Y + MAP_H - 25)
    })
    this.input.on('dragend', (pointer, obj) => {
      if (!obj.serverKey || this.setupDone) return
      this.dropServer(obj)
    })
  }

  dropServer(obj) {
    const key = obj.serverKey
    const zoneKey = Object.keys(ZONES).find((zk) => {
      const z = ZONES[zk]
      return Math.abs(obj.x - z.x) <= z.w / 2 && Math.abs(obj.y - z.y) <= z.h / 2
    })
    this.serverZone[key] = zoneKey || null
    this.layoutZones()
    this.updateSetupStatus(key)

    if (key === 'db' && zoneKey === 'dmz' && !this.dbWarned) {
      this.dbWarned = true
      this.showToast('⚠️ Cuidado! Banco de dados nunca deve ficar exposto diretamente à internet.')
    }
  }

  layoutZones() {
    Object.keys(ZONES).forEach((zoneKey) => {
      const inZone = Object.keys(this.serverZone).filter((k) => this.serverZone[k] === zoneKey)
      const z = ZONES[zoneKey]
      const startX = z.x - ((inZone.length - 1) * 46) / 2
      inZone.forEach((k, i) => {
        this.serverTokens[k].x = startX + i * 46
        this.serverTokens[k].y = z.y
      })
    })
    Object.keys(this.serverZone).forEach((k) => {
      if (!this.serverZone[k]) {
        this.serverTokens[k].x = this.serverTokens[k].homeX
        this.serverTokens[k].y = this.serverTokens[k].homeY
      }
    })
  }

  buildSetupPanel() {
    const x = INSP_X + 20
    const y = INSP_Y + 16
    const width = INSP_W - 40
    const els = []

    els.push(this.add.text(x, y, 'CONFIGURAÇÃO DA DMZ', { fontFamily: FONT_BODY, fontSize: '13px', fontStyle: '800', color: '#8a8fa3' }))
    els.push(
      this.add.text(x, y + 22, 'Arraste os 3 servidores no mapa até os segmentos corretos antes de iniciar as ondas de ataque.', {
        fontFamily: FONT_BODY,
        fontSize: '13px',
        color: '#5a6072',
        wordWrap: { width },
        lineSpacing: 3,
      }),
    )

    this.setupStatusTexts = {}
    Object.entries(SERVERS).forEach(([key, s], i) => {
      const ty = y + 96 + i * 30
      els.push(this.add.text(x, ty, `${s.icon} ${s.label}`, { fontFamily: FONT_BODY, fontSize: '13px', fontStyle: '700', color: '#1b2a55' }))
      const status = this.add
        .text(x + width, ty, 'não posicionado', { fontFamily: FONT_BODY, fontSize: '13px', fontStyle: '800', color: '#e4573d' })
        .setOrigin(1, 0)
      this.setupStatusTexts[key] = status
      els.push(status)
    })

    const btnY = y + 96 + 3 * 30 + 20
    const startBtn = chunkyButton(this, x, btnY, width, 44, {
      radius: 14,
      fill: COLORS.amber,
      fillHover: 0xf7b64d,
      shadow: COLORS.amberDark,
      shadowOffset: 5,
      label: 'Iniciar Ondas',
      fontSize: '15px',
      textColor: '#1b2a55',
      onClick: () => this.tryStart(),
    })
    els.push(startBtn.graphics, startBtn.text)

    this.setupHint = this.add.text(x, btnY + 56, '', {
      fontFamily: FONT_BODY,
      fontSize: '13px',
      fontStyle: '700',
      color: '#e4573d',
      wordWrap: { width },
    })
    els.push(this.setupHint)

    this.setupElements = els
  }

  updateSetupStatus(key) {
    const zoneKey = this.serverZone[key]
    const txt = this.setupStatusTexts[key]
    if (!zoneKey) {
      txt.setText('não posicionado').setColor('#e4573d')
    } else {
      txt.setText(ZONES[zoneKey].label).setColor('#2e9863')
    }
  }

  tryStart() {
    if (this.setupDone) return
    const missing = Object.keys(this.serverZone).filter((k) => !this.serverZone[k])
    if (missing.length) {
      this.setupHint.setText('Posicione todos os servidores nos segmentos antes de iniciar.')
      return
    }
    this.setupDone = true
    this.setupElements.forEach((el) => el.setVisible(false))
    this.inspectorElements.forEach((el) => el.setVisible(true))
    Object.values(this.serverTokens).forEach((t) => t.disableInteractive())
    this.startWave()
  }

  buildInspector() {
    const x = INSP_X + 20
    const header = this.add.text(INSP_X + 20, INSP_Y + 16, 'PACOTE SELECIONADO', { fontFamily: FONT_BODY, fontSize: '13px', fontStyle: '800', color: '#8a8fa3' })
    const swatchY = INSP_Y + 44
    const swatchW = INSP_W - 40
    const swatchH = 84

    this.inspSwatch = this.add.graphics()
    this.inspIcon = this.add.circle(x + swatchW / 2, swatchY + swatchH / 2, 22, COLORS.muted)
    const envelope = this.add.text(x + swatchW / 2, swatchY + swatchH / 2, '✉️', { fontSize: '18px' }).setOrigin(0.5)

    const rowY = swatchY + swatchH + 20
    const l1 = this.add.text(x, rowY, 'Porta', { fontFamily: FONT_BODY, fontSize: '14px', fontStyle: '700', color: '#8a8fa3' })
    this.inspPort = this.add.text(x + swatchW, rowY, '—', { fontFamily: FONT_BODY, fontSize: '14px', fontStyle: '800', color: '#1b2a55' }).setOrigin(1, 0)

    const l2 = this.add.text(x, rowY + 26, 'Serviço-alvo', { fontFamily: FONT_BODY, fontSize: '14px', fontStyle: '700', color: '#8a8fa3' })
    this.inspTarget = this.add.text(x + swatchW, rowY + 26, '—', { fontFamily: FONT_BODY, fontSize: '14px', fontStyle: '800', color: '#1b2a55' }).setOrigin(1, 0)

    const l3 = this.add.text(x, rowY + 52, 'Classificação', { fontFamily: FONT_BODY, fontSize: '14px', fontStyle: '700', color: '#8a8fa3' })
    this.inspClass = this.add.text(x + swatchW, rowY + 52, '—', { fontFamily: FONT_BODY, fontSize: '14px', fontStyle: '800', color: '#1b2a55' }).setOrigin(1, 0)

    const descY = rowY + 84
    const descCard = card(this, x, descY, swatchW, INSP_H - (descY - INSP_Y) - 16, { radius: 12, fill: COLORS.panel })
    this.inspDesc = this.add.text(x + 12, descY + 12, 'Passe o mouse sobre um pacote para inspecioná-lo.', {
      fontFamily: FONT_BODY,
      fontSize: '13px',
      color: '#5a6072',
      wordWrap: { width: swatchW - 24 },
      lineSpacing: 3,
    })

    this.inspectorElements = [header, this.inspSwatch, this.inspIcon, envelope, l1, this.inspPort, l2, this.inspTarget, l3, this.inspClass, descCard, this.inspDesc]
    this.showInspector(null)
    this.inspectorElements.forEach((el) => el.setVisible(false))
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
    this.inspTarget.setText(packet.serviceKey === 'email' ? 'Servidor de E-mail' : 'Servidor Web')

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
      .setText(suspicious ? `Suspeito${packet.kind ? ' — ' + MALWARE_LABEL[packet.kind] : ''}` : 'Aparenta seguro')
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
    this.hudTitle.setText(`Fase 4 · Onda ${this.waveNumber || 0}/${PHASE_4.wavesToWin}`)
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
      delay: PHASE_4.packetIntervalMs,
      repeat: PHASE_4.packetsPerWave - 1,
      callback: () => this.spawnPacket(),
    })
    this.spawnPacket()
  }

  spawnPacket() {
    if (this.gameOver || this.packetsSpawned >= PHASE_4.packetsPerWave) return
    this.packetsSpawned++

    const port = Phaser.Utils.Array.GetRandom(PHASE_4.packetPorts)
    const malicious = PHASE_4.maliciousPorts.includes(port) && Math.random() < PHASE_4.maliciousChance
    const kind = malicious ? PHASE_4.threatByPort[port] : null
    let idsTag = malicious ? 'red' : 'green'
    if (Math.random() < PHASE_4.idsErrorChance) idsTag = idsTag === 'red' ? 'green' : 'red'
    const serviceKey = port === 25 ? 'email' : 'web'

    const start = NODES.internet
    const token = packetToken(this, start.x, start.y, port, COLORS.muted)

    const packet = { port, malicious, kind, idsTag, serviceKey, token, resolved: false, classified: false }
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
            const dest = this.serverTokens[serviceKey]
            this.tweens.add({
              targets: token,
              x: dest.x,
              y: dest.y,
              duration: 800,
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

    if (!packet.malicious) {
      this.score += 5
      this.refreshHud()
      this.resolvePacketCount()
      return
    }

    // servidor não está na DMZ: nada segura o ataque antes do segmento interno real
    const zoneKey = this.serverZone[packet.serviceKey]
    if (zoneKey !== 'dmz') {
      this.endPhase(false, 'internal-exposed', packet.serviceKey)
      return
    }

    this.score -= 15
    this.totalMissed++
    this.setServiceDown(packet.serviceKey)

    // banco de dados largado na DMZ ao lado de um serviço público comprometido = exposto junto
    if (this.serverZone.db === 'dmz') {
      this.endPhase(false, 'db-exposed')
      return
    }

    this.refreshHud()
    this.resolvePacketCount()
  }

  setServiceDown(key) {
    const t = this.serverTokens[key]
    if (!t || t.down) return
    t.down = true
    t.list[0].setFillStyle(COLORS.muted)
    this.time.delayedCall(PHASE_4.serverDownMs, () => {
      if (this.gameOver) return
      t.down = false
      t.list[0].setFillStyle(COLORS.white)
    })
  }

  resolvePacketCount() {
    this.packetsResolved++
    if (!this.gameOver && this.packetsSpawned >= PHASE_4.packetsPerWave && this.packetsResolved >= this.packetsSpawned) {
      this.finishWave()
    }
  }

  finishWave() {
    this.wavesSurvived++
    this.refreshHud()
    if (this.wavesSurvived >= PHASE_4.wavesToWin) {
      this.endPhase(true)
    } else {
      this.time.delayedCall(1200, () => this.startWave())
    }
  }

  endPhase(success, cause = null, serviceKey = null) {
    if (this.gameOver) return
    this.gameOver = true
    this.tweens.killAll()
    this.time.removeAllEvents()

    let reason = null
    if (!success) {
      if (cause === 'db-exposed') {
        reason = 'O banco de dados estava na DMZ, exposto à internet — um ataque à zona também o comprometeu. Banco de dados nunca deve ficar na DMZ.'
      } else if (cause === 'internal-exposed') {
        const label = serviceKey === 'email' ? 'servidor de e-mail' : 'servidor web'
        reason = `O ${label} não estava na DMZ e foi atingido diretamente — sem essa camada de isolamento, o ataque chegou direto ao segmento interno.`
      }
    }

    const correctDmz = this.serverZone.web === 'dmz' && this.serverZone.email === 'dmz' && this.serverZone.db !== 'dmz'

    this.time.delayedCall(700, () => {
      this.scene.start('Debriefing', {
        phaseId: PHASE_4.id,
        success,
        stars: this.wavesSurvived,
        reason,
        statCards: [
          { value: this.totalBlocked, label: 'Ataques bloqueados', color: '#4c7ef3' },
          { value: this.totalMissed, label: 'Ataques que passaram', color: '#e4573d' },
          { value: this.score, label: 'Pontuação final', color: '#f5a623' },
        ],
        achievement: success && correctDmz ? PHASE_4.achievement : null,
        funFact:
          'Em redes corporativas reais, servidores públicos ficam numa DMZ isolada por camadas de firewall próprias — mesmo que um deles seja comprometido, o atacante ainda esbarra em outra barreira antes de alcançar dados internos.',
      })
    })
  }
}
