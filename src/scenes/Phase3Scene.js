import Phaser from 'phaser'
import { COLORS, PORTS, PHASE_3, FONT_HEADING, FONT_BODY } from '../gameData.js'
import { card, packetToken, backButton } from '../ui.js'
import { buildSpeedControls } from '../speedControl.js'
import { buildPortModal } from '../portModal.js'

const MAP_X = 20
const MAP_Y = 66
const MAP_W = 620
const MAP_H = 520
const INSP_X = MAP_X + MAP_W + 16
const INSP_Y = 66
const INSP_W = 960 - INSP_X - 20
const INSP_H = 520

const NODES = {
  internet: { x: MAP_X + 80, y: MAP_Y + MAP_H / 2, label: 'Internet' },
  firewall: { x: MAP_X + 190, y: MAP_Y + MAP_H / 2, label: 'Firewall' },
  ids: { x: MAP_X + 300, y: MAP_Y + MAP_H / 2, label: 'IDS' },
  router: { x: MAP_X + 410, y: MAP_Y + MAP_H / 2, label: 'Roteador' },
  files: { x: MAP_X + 530, y: MAP_Y + MAP_H / 2, label: 'Servidor de Arquivos' },
}

// distância de um ponto até o segmento router→servidor — usada pra saber o
// quão "no caminho do ataque" o honeypot está posicionado
function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1
  const dy = y2 - y1
  const lenSq = dx * dx + dy * dy
  const t = Phaser.Math.Clamp(lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq, 0, 1)
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}

export default class Phase3Scene extends Phaser.Scene {
  constructor() {
    super('Phase3')
  }

  create() {
    const { width: w } = this.scale
    this.cameras.main.setBackgroundColor(COLORS.grassLight)
    this.gameOver = false

    // HUD
    card(this, 0, 0, w, 52, { radius: 0, fill: COLORS.navy })
    this.hudTitle = this.add.text(20, 17, '', { fontFamily: FONT_HEADING, fontSize: '15px', color: '#ffffff' })
    this.waveSquares = []
    for (let i = 0; i < PHASE_3.wavesToWin; i++) {
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
    PHASE_3.packetPorts.forEach((p) => (this.portOpen[p] = true))
    this.portModal = buildPortModal(this, {
      ports: PHASE_3.packetPorts,
      portOpen: this.portOpen,
      onClose: () => this.toggleFirewallModal(false),
    })

    this.serverUp = true
    this.score = 0
    this.totalBlocked = 0
    this.totalMissed = 0
    this.totalOverblocked = 0
    this.totalDiverted = 0
    this.maliciousTotal = 0
    this.portDivertCount = {}
    this.ransomwareWarned = false
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
    g.lineBetween(NODES.router.x, NODES.router.y, NODES.files.x, NODES.files.y)

    // linha pontilhada-ish até o honeypot é redesenhada a cada drag (buildHoneypot)
    this.honeypotLine = this.add.graphics()

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

    this.add.rectangle(NODES.router.x, NODES.router.y, 60, 46, COLORS.navy)
    this.add.text(NODES.router.x, NODES.router.y, '📡', { fontSize: '20px' }).setOrigin(0.5)

    const filesRect = this.add.rectangle(NODES.files.x, NODES.files.y, 64, 50, COLORS.green).setStrokeStyle(4, COLORS.navy)
    const filesIcon = this.add.text(NODES.files.x, NODES.files.y, '🗄️', { fontSize: '20px' }).setOrigin(0.5)
    this.filesNode = { rect: filesRect, statusText: filesIcon }

    Object.values(NODES).forEach((n) => {
      this.add
        .text(n.x, n.y + 42, n.label, {
          fontFamily: FONT_BODY,
          fontSize: '12px',
          fontStyle: '700',
          color: '#1b2a55',
          align: 'center',
          wordWrap: { width: 100 },
        })
        .setOrigin(0.5, 0)
    })

    this.buildHoneypot()
  }

  buildHoneypot() {
    // nasce a ~70px da rota (chance inicial já perceptível, ~45%) em vez de
    // fora do raio de efeito — jogador que nunca arrasta ainda vê a armadilha
    // funcionar de vez em quando, e só percebe a melhora ao aproximar.
    const startX = MAP_X + 470
    const startY = MAP_Y + MAP_H / 2 + 70

    this.honeypotHp = PHASE_3.honeypotHp
    this.honeypotContainer = this.add.container(startX, startY)

    const pulse = this.add.circle(0, 0, 34).setStrokeStyle(3, COLORS.amber)
    this.tweens.add({ targets: pulse, alpha: 0.15, scale: 1.3, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

    this.honeypotBox = this.add.rectangle(0, 0, 54, 54, COLORS.panel).setStrokeStyle(4, COLORS.amberDark)
    this.honeypotIcon = this.add.text(0, 0, '🍯', { fontSize: '24px' }).setOrigin(0.5)
    this.honeypotChanceText = this.add
      .text(0, 20, '', { fontFamily: FONT_BODY, fontSize: '11px', fontStyle: '800', color: '#1b2a55' })
      .setOrigin(0.5)
    const label = this.add
      .text(0, 46, 'Honeypot (arraste)', { fontFamily: FONT_BODY, fontSize: '11px', fontStyle: '700', color: '#1b2a55' })
      .setOrigin(0.5, 0)
    this.honeypotContainer.add([pulse, this.honeypotBox, this.honeypotIcon, this.honeypotChanceText, label])

    this.honeypotPips = []
    for (let i = 0; i < PHASE_3.honeypotHp; i++) {
      const pip = this.add.circle(-24 + i * 10, -40, 3, COLORS.amber)
      this.honeypotContainer.add(pip)
      this.honeypotPips.push(pip)
    }

    this.honeypotContainer.setInteractive(new Phaser.Geom.Rectangle(-27, -27, 54, 54), Phaser.Geom.Rectangle.Contains)
    this.honeypotContainer.input.cursor = 'grab'
    this.input.setDraggable(this.honeypotContainer)

    this.updateHoneypotVisual()
    this.input.on('drag', (pointer, obj, dragX, dragY) => {
      obj.x = Phaser.Math.Clamp(dragX, MAP_X + 40, MAP_X + MAP_W - 40)
      obj.y = Phaser.Math.Clamp(dragY, MAP_Y + 50, MAP_Y + MAP_H - 30)
      this.updateHoneypotVisual()
    })
  }

  updateHoneypotVisual() {
    this.honeypotLine.clear()
    this.honeypotLine.lineStyle(3, COLORS.amber, 0.5)
    this.honeypotLine.lineBetween(NODES.router.x, NODES.router.y, this.honeypotContainer.x, this.honeypotContainer.y)
    if (this.honeypotHp > 0) this.honeypotChanceText.setText(`${Math.round(this.diversionChance() * 100)}%`)
  }

  diversionChance() {
    const d = distToSegment(this.honeypotContainer.x, this.honeypotContainer.y, NODES.router.x, NODES.router.y, NODES.files.x, NODES.files.y)
    const MAX_D = 180
    const MIN_C = 0.15
    const MAX_C = 0.8
    const t = Phaser.Math.Clamp(d / MAX_D, 0, 1)
    return MAX_C - (MAX_C - MIN_C) * t
  }

  exhaustHoneypot() {
    this.honeypotBox.setFillStyle(COLORS.panel).setStrokeStyle(4, COLORS.panelLine)
    this.honeypotIcon.setAlpha(0.35)
    this.honeypotChanceText.setText('Esgotado').setFontSize('9px')
    this.honeypotContainer.disableInteractive()
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
    this.hudTitle.setText(`Fase 3 · Onda ${this.waveNumber || 0}/${PHASE_3.wavesToWin}`)
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
      delay: PHASE_3.packetIntervalMs,
      repeat: PHASE_3.packetsPerWave - 1,
      callback: () => this.spawnPacket(),
    })
    this.spawnPacket()
  }

  spawnPacket() {
    if (this.gameOver || this.packetsSpawned >= PHASE_3.packetsPerWave) return
    this.packetsSpawned++

    const port = Phaser.Utils.Array.GetRandom(PHASE_3.packetPorts)
    const chance = PHASE_3.maliciousChanceByPort?.[port] ?? PHASE_3.maliciousChance + 0.2
    const malicious = PHASE_3.maliciousPorts.includes(port) && Math.random() < chance
    const kind = malicious ? PHASE_3.threatByPort[port] : null
    let idsTag = malicious ? 'red' : 'green'
    if (Math.random() < PHASE_3.idsErrorChance) idsTag = idsTag === 'red' ? 'green' : 'red'

    const start = NODES.internet
    // pacote nasce cinza — só ganha cor ao passar pela torre do IDS
    const token = packetToken(this, start.x, start.y, port, COLORS.muted)

    const packet = { port, malicious, kind, idsTag, token, resolved: false, classified: false }
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

    // só conta pra taxa de desvio quem de fato entrou na rede — pacote barrado
    // por porta fechada nunca teve chance de chegar perto do honeypot
    if (malicious) this.maliciousTotal++

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
            const diverted = packet.malicious && this.honeypotHp > 0 && Math.random() < this.diversionChance()
            const dest = diverted ? { x: this.honeypotContainer.x, y: this.honeypotContainer.y } : NODES.files
            this.tweens.add({
              targets: token,
              x: dest.x,
              y: dest.y,
              duration: 800,
              onComplete: () => (diverted ? this.absorbByHoneypot(packet) : this.deliverPacket(packet)),
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

  absorbByHoneypot(packet) {
    if (packet.resolved || this.gameOver) return
    packet.resolved = true
    this.totalDiverted++
    this.portDivertCount[packet.port] = (this.portDivertCount[packet.port] || 0) + 1
    this.score += 20
    this.honeypotHp--
    if (this.honeypotPips[this.honeypotHp]) this.honeypotPips[this.honeypotHp].setFillStyle(COLORS.panelLine)

    this.tweens.add({
      targets: packet.token,
      scale: 0,
      alpha: 0,
      duration: 250,
      onComplete: () => packet.token.destroy(),
    })

    if (this.honeypotHp <= 0) this.exhaustHoneypot()
    this.refreshHud()
    this.resolvePacketCount()
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
      this.score += 10
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
    } else if (packet.kind === 'trojan') {
      this.endPhase(false, 'trojan')
      return
    } else if (packet.kind === 'ddos') {
      this.score -= 15
      this.totalMissed++
      this.setServerDown()
    } else if (packet.kind === 'ransomware') {
      this.score -= 10
      this.totalMissed++
      this.warnRansomware()
    }
    this.refreshHud()
    this.resolvePacketCount()
  }

  setServerDown() {
    if (this.gameOver || !this.serverUp) return
    this.serverUp = false
    this.filesNode.rect.setFillStyle(COLORS.muted)
    this.filesNode.statusText.setText('OFFLINE').setFontSize('9px').setFontStyle('800').setColor('#ffffff')

    this.time.delayedCall(PHASE_3.serverDownMs, () => {
      if (this.gameOver) return
      this.serverUp = true
      this.filesNode.rect.setFillStyle(COLORS.green)
      this.filesNode.statusText.setText('🗄️').setFontSize('20px').setFontStyle('normal').setColor('#ffffff')
    })
  }

  warnRansomware() {
    if (this.ransomwareWarned) return
    this.ransomwareWarned = true
    const { width: w } = this.scale
    const toast = this.add
      .text(w / 2, 60, '⚠️ Sinal de ransomware detectado — ainda não causa dano nesta fase, mas fique de olho.', {
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

  resolvePacketCount() {
    this.packetsResolved++
    if (!this.gameOver && this.packetsSpawned >= PHASE_3.packetsPerWave && this.packetsResolved >= this.packetsSpawned) {
      this.finishWave()
    }
  }

  finishWave() {
    this.wavesSurvived++
    this.refreshHud()
    if (this.wavesSurvived >= PHASE_3.wavesToWin) {
      const rate = this.maliciousTotal > 0 ? this.totalDiverted / this.maliciousTotal : 1
      this.endPhase(rate >= PHASE_3.diversionThreshold)
    } else {
      this.time.delayedCall(1200, () => this.startWave())
    }
  }

  endPhase(success, cause = 'low-diversion') {
    if (this.gameOver) return
    this.gameOver = true
    // pacotes ainda em voo têm tweens/timers pendentes; sem isso, eles disparam
    // depois do restart e corrompem o estado da nova partida (mesma instância de Scene).
    this.tweens.killAll()
    this.time.removeAllEvents()

    const rate = this.maliciousTotal > 0 ? this.totalDiverted / this.maliciousTotal : 1
    const topPortEntry = Object.entries(this.portDivertCount).sort((a, b) => b[1] - a[1])[0]

    let reason = null
    if (!success) {
      reason =
        cause === 'trojan'
          ? 'O Trojan chegou ao Servidor de Arquivos sem ser desviado — a rede real foi comprometida.'
          : `Você só desviou ${Math.round(rate * 100)}% dos ataques para o honeypot — a meta era 60%. Tente posicioná-lo mais perto da rota de ataque.`
    }

    this.time.delayedCall(700, () => {
      this.scene.start('Debriefing', {
        phaseId: PHASE_3.id,
        success,
        stars: this.wavesSurvived,
        reason,
        statCards: [
          { value: this.totalDiverted, label: 'Ataques desviados p/ honeypot', color: '#4c7ef3' },
          { value: `${Math.round(rate * 100)}%`, label: 'Taxa de desvio (meta: 60%)', color: success ? '#3fbf7f' : '#e4573d' },
          { value: topPortEntry ? `${topPortEntry[0]} (${PORTS[topPortEntry[0]].label})` : '—', label: 'Porta mais visada pelo atacante', color: '#f5a623' },
        ],
        achievement: success ? PHASE_3.achievement : null,
        funFact: success
          ? 'Honeypots reais (como o Honeynet Project) coletam amostras de malware ainda desconhecidas ao atrair atacantes automatizados. Você protegeu sua casa. Mas e se fosse uma empresa inteira?'
          : 'Honeypots reais (como o Honeynet Project) coletam amostras de malware ainda desconhecidas ao atrair atacantes automatizados.',
      })
    })
  }
}
