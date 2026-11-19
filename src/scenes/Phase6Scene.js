import Phaser from 'phaser'
import { COLORS, PORTS, PHASE_6, FONT_HEADING, FONT_BODY } from '../gameData.js'
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
  internet: { x: MAP_X + 80, y: MAP_Y + MAP_H / 2, label: 'Internet' },
  firewall: { x: MAP_X + 190, y: MAP_Y + MAP_H / 2, label: 'Firewall' },
  ids: { x: MAP_X + 300, y: MAP_Y + MAP_H / 2, label: 'IDS' },
  proxy: { x: MAP_X + 410, y: MAP_Y + MAP_H / 2, label: 'Proxy Reverso' },
  store: { x: MAP_X + 530, y: MAP_Y + MAP_H / 2, label: 'Loja Virtual' },
}

const KIND_LABEL = { plaintext: 'Transação sem criptografia', mitm: 'Certificado forjado (MITM)' }

export default class Phase6Scene extends Phaser.Scene {
  constructor() {
    super('Phase6')
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
    for (let i = 0; i < PHASE_6.wavesToWin; i++) {
      this.waveSquares.push(this.add.rectangle(210 + i * 26, 26, 18, 18, COLORS.panelLine, 1))
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

    // painel inspetor de pacotes
    card(this, INSP_X, INSP_Y, INSP_W, INSP_H, { radius: 22 })
    this.inspTitle = this.add.text(INSP_X + 20, INSP_Y + 16, 'PACOTE SELECIONADO', { fontFamily: FONT_BODY, fontSize: '13px', fontStyle: '800', color: '#8a8fa3' })
    this.buildInspector()
    this.buildSetupPanel()

    this.portOpen = {}
    PHASE_6.packetPorts.forEach((p) => (this.portOpen[p] = true))
    this.portModal = buildPortModal(this, {
      ports: PHASE_6.packetPorts,
      portOpen: this.portOpen,
      onClose: () => this.toggleFirewallModal(false),
    })

    this.score = 0
    this.totalBlocked = 0
    this.totalOverblocked = 0
    this.totalSafe = 0
    this.wavesSurvived = 0
    this.waveNumber = 0

    this.packetsSpawned = 0
    this.packetsResolved = 0

    this.refreshHud()
    this.guide = buildGuide(this, { phase: PHASE_6 })
  }

  buildSetupPanel() {
    const x = INSP_X + 20
    const y = INSP_Y + 16
    const width = INSP_W - 40
    const els = []

    els.push(
      this.add.text(x, y + 4, 'Antes de iniciar as ondas, clique no firewall e feche a porta 80 (HTTP) — a loja só deve aceitar tráfego HTTPS.', {
        fontFamily: FONT_BODY,
        fontSize: '14px',
        color: '#3a4160',
        wordWrap: { width },
        lineSpacing: 5,
      }),
    )

    const btnY = y + 130
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
    g.lineBetween(NODES.ids.x, NODES.ids.y, NODES.proxy.x, NODES.proxy.y)
    g.lineBetween(NODES.proxy.x, NODES.proxy.y, NODES.store.x, NODES.store.y)

    this.add.circle(NODES.internet.x, NODES.internet.y, 28, COLORS.muted)
    this.add.text(NODES.internet.x, NODES.internet.y, '🌐', { fontSize: '22px' }).setOrigin(0.5)

    this.firewallNode = this.add.rectangle(NODES.firewall.x, NODES.firewall.y, 56, 56, COLORS.blue).setStrokeStyle(3, COLORS.navy)
    this.firewallNode.setInteractive({ useHandCursor: true })
    this.firewallNode.on('pointerover', () => this.firewallNode.setStrokeStyle(4, COLORS.amber))
    this.firewallNode.on('pointerout', () => this.firewallNode.setStrokeStyle(3, COLORS.navy))
    this.firewallNode.on('pointerdown', () => this.toggleFirewallModal(true))
    this.add.text(NODES.firewall.x, NODES.firewall.y, '⚙️', { fontSize: '20px' }).setOrigin(0.5)

    this.add.rectangle(NODES.ids.x, NODES.ids.y, 38, 64, COLORS.blueDark).setStrokeStyle(3, COLORS.navy)
    this.add.text(NODES.ids.x, NODES.ids.y, '🔍', { fontSize: '20px' }).setOrigin(0.5)

    this.add.rectangle(NODES.proxy.x, NODES.proxy.y, 60, 46, COLORS.amber).setStrokeStyle(3, COLORS.amberDark)
    this.add.text(NODES.proxy.x, NODES.proxy.y, '🔁', { fontSize: '20px' }).setOrigin(0.5)

    const storeRect = this.add.rectangle(NODES.store.x, NODES.store.y, 64, 50, COLORS.green).setStrokeStyle(4, COLORS.navy)
    const storeIcon = this.add.text(NODES.store.x, NODES.store.y, '🛒', { fontSize: '20px' }).setOrigin(0.5)
    this.storeNode = { rect: storeRect, statusText: storeIcon }

    Object.values(NODES).forEach((n) => {
      this.add
        .text(n.x, n.y + 42, n.label, {
          fontFamily: FONT_BODY,
          fontSize: '13px',
          fontStyle: '700',
          color: '#1b2a55',
          align: 'center',
          wordWrap: { width: 100 },
        })
        .setOrigin(0.5, 0)
    })
  }

  buildInspector() {
    const x = INSP_X + 20
    const swatchY = INSP_Y + 44
    const swatchW = INSP_W - 40
    const swatchH = 84

    this.inspSwatch = this.add.graphics()
    this.inspIcon = this.add.circle(x + swatchW / 2, swatchY + swatchH / 2, 22, COLORS.muted)
    this.inspIconText = this.add.text(x + swatchW / 2, swatchY + swatchH / 2, '', { fontSize: '18px' }).setOrigin(0.5)

    const rowY = swatchY + swatchH + 20
    const l1 = this.add.text(x, rowY, 'Porta', { fontFamily: FONT_BODY, fontSize: '14px', fontStyle: '700', color: '#8a8fa3' })
    this.inspPort = this.add.text(x + swatchW, rowY, '—', { fontFamily: FONT_BODY, fontSize: '14px', fontStyle: '800', color: '#1b2a55' }).setOrigin(1, 0)

    const l2 = this.add.text(x, rowY + 26, 'Criptografia', { fontFamily: FONT_BODY, fontSize: '14px', fontStyle: '700', color: '#8a8fa3' })
    this.inspCrypto = this.add.text(x + swatchW, rowY + 26, '—', { fontFamily: FONT_BODY, fontSize: '14px', fontStyle: '800', color: '#1b2a55' }).setOrigin(1, 0)

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

    this.inspectorElements = [
      this.inspTitle,
      this.inspSwatch,
      this.inspIcon,
      this.inspIconText,
      l1,
      this.inspPort,
      l2,
      this.inspCrypto,
      l3,
      this.inspClass,
      descCard,
      this.inspDesc,
    ]
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
      this.inspIconText.setText('')
      this.inspPort.setText('—')
      this.inspCrypto.setText('—')
      this.inspClass.setText('—')
      this.inspDesc.setText('Passe o mouse sobre um pacote para inspecioná-lo.')
      return
    }

    this.inspPort.setText(`${packet.port} (${PORTS[packet.port].label})`)
    this.inspIconText.setText(packet.port === 443 ? '🔒' : '🔓')
    this.inspCrypto.setText(packet.port === 443 ? 'Criptografado (TLS)' : 'Texto puro').setColor(packet.port === 443 ? '#2e9863' : '#e4573d')

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
      packet.port === 443
        ? `${PORTS[443].desc} ${suspicious ? 'O IDS suspeita de um certificado forjado — a conexão pode não ser confiável.' : 'Certificado válido — mas isso não é garantia absoluta.'}`
        : `${PORTS[80].desc} Qualquer dado nesta transação pode ser lido por quem estiver na mesma rede.`,
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
    this.hudTitle.setText(`Fase 6 · Onda ${this.waveNumber || 0}/${PHASE_6.wavesToWin}`)
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
      delay: PHASE_6.packetIntervalMs,
      repeat: PHASE_6.packetsPerWave - 1,
      callback: () => this.spawnPacket(),
    })
    this.spawnPacket()
  }

  spawnPacket() {
    if (this.gameOver || this.packetsSpawned >= PHASE_6.packetsPerWave) return
    this.packetsSpawned++

    const port = Phaser.Utils.Array.GetRandom(PHASE_6.packetPorts)
    // porta 80 nunca é segura — é o próprio conceito da fase, não uma chance
    const malicious = port === 80 ? true : Math.random() < PHASE_6.maliciousChance
    const kind = malicious ? PHASE_6.threatByPort[port] : null
    let idsTag = malicious ? 'red' : 'green'
    if (Math.random() < PHASE_6.idsErrorChance) idsTag = idsTag === 'red' ? 'green' : 'red'

    const start = NODES.internet
    const icon = port === 443 ? '🔒' : '🔓'
    const token = packetToken(this, start.x, start.y, port, COLORS.muted, icon)

    const packet = { port, malicious, kind, idsTag, token, resolved: false, classified: false }
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
      duration: 900,
      onComplete: () => {
        if (packet.resolved) return
        this.classifyPacket(packet)
        this.tweens.add({
          targets: token,
          x: NODES.proxy.x,
          y: NODES.proxy.y,
          duration: 500,
          onComplete: () => {
            if (packet.resolved) return
            this.tweens.add({
              targets: token,
              x: NODES.store.x,
              y: NODES.store.y,
              duration: 500,
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
      this.endPhase(false, packet.kind)
      return
    }

    this.score += 5
    this.totalSafe++
    this.refreshHud()
    this.resolvePacketCount()
  }

  resolvePacketCount() {
    this.packetsResolved++
    if (!this.gameOver && this.packetsSpawned >= PHASE_6.packetsPerWave && this.packetsResolved >= this.packetsSpawned) {
      this.finishWave()
    }
  }

  finishWave() {
    this.wavesSurvived++
    this.refreshHud()
    if (this.wavesSurvived >= PHASE_6.wavesToWin) {
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

    let reason = null
    if (!success) {
      reason =
        cause === 'plaintext'
          ? 'Uma transação sem criptografia (porta 80) chegou até a loja — qualquer pessoa na rede poderia ter lido os dados do cliente.'
          : 'Um certificado forjado (Man-in-the-Middle) passou pela inspeção e interceptou uma transação criptografada.'
    }

    this.time.delayedCall(700, () => {
      this.scene.start('Debriefing', {
        phaseId: PHASE_6.id,
        success,
        stars: this.wavesSurvived,
        reason,
        statCards: [
          { value: this.totalBlocked, label: 'Ataques bloqueados', color: '#4c7ef3' },
          { value: this.totalSafe, label: 'Transações seguras', color: '#3fbf7f' },
          { value: this.score, label: 'Pontuação final', color: '#f5a623' },
        ],
        achievement: success ? PHASE_6.achievement : null,
        funFact:
          'Certificados TLS forjados ou "typosquatted" são usados em ataques reais de phishing bancário — navegadores modernos alertam quando um certificado não é emitido por uma autoridade confiável, mas o cadeado sozinho nunca garante que o site é legítimo.',
      })
    })
  }
}
