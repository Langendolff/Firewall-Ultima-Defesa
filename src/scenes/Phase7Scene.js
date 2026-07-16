import Phaser from 'phaser'
import { COLORS, PORTS, PHASE_7, FONT_HEADING, FONT_BODY } from '../gameData.js'
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
  internet: { x: MAP_X + 55, y: MAP_Y + MAP_H / 2, label: 'Internet' },
  firewall: { x: MAP_X + 150, y: MAP_Y + MAP_H / 2, label: 'Firewall' },
  ids: { x: MAP_X + 245, y: MAP_Y + MAP_H / 2, label: 'IDS Nível 3' },
  switch: { x: MAP_X + 340, y: MAP_Y + MAP_H / 2, label: 'Switch' },
}

const SERVICE_POS = {
  web: { x: MAP_X + 470, y: MAP_Y + 110, icon: '🌐', label: 'Servidor Web' },
  email: { x: MAP_X + 580, y: MAP_Y + 110, icon: '✉️', label: 'Servidor de E-mail' },
  pcs: { x: MAP_X + 470, y: MAP_Y + 230, icon: '👥', label: 'Funcionários' },
  loja: { x: MAP_X + 580, y: MAP_Y + 230, icon: '🛒', label: 'Loja Virtual' },
}
const DB_POS = { x: MAP_X + 525, y: MAP_Y + 400, label: 'Banco de Dados' }

const KIND_TARGET = { phishing: 'email', ddos: 'web', mitm: 'loja', trojan: 'pcs', ransomware: 'pcs' }
const KIND_LABEL = {
  phishing: 'Phishing',
  ddos: 'DDoS',
  mitm: 'Certificado Forjado (MITM)',
  trojan: 'Trojan',
  ransomware: 'Ransomware',
  apt: 'APT (Ameaça Persistente)',
}

export default class Phase7Scene extends Phaser.Scene {
  constructor() {
    super('Phase7')
  }

  create() {
    const { width: w } = this.scale
    this.cameras.main.setBackgroundColor(COLORS.grassLight)
    this.gameOver = false

    // HUD
    card(this, 0, 0, w, 52, { radius: 0, fill: COLORS.navy })
    this.hudTitle = this.add.text(20, 17, '', { fontFamily: FONT_HEADING, fontSize: '15px', color: '#ffffff' })
    this.waveSquares = []
    for (let i = 0; i < PHASE_7.wavesToWin; i++) {
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

    // painel inspetor de pacotes
    card(this, INSP_X, INSP_Y, INSP_W, INSP_H, { radius: 22 })
    this.add.text(INSP_X + 20, INSP_Y + 16, 'PACOTE SELECIONADO', { fontFamily: FONT_BODY, fontSize: '11px', fontStyle: '800', color: '#8a8fa3' })
    this.buildInspector()

    this.portOpen = {}
    PHASE_7.packetPorts.forEach((p) => (this.portOpen[p] = true))
    this.portModal = buildPortModal(this, {
      ports: PHASE_7.packetPorts,
      portOpen: this.portOpen,
      onClose: () => this.toggleFirewallModal(false),
    })

    this.serviceDown = {}
    Object.keys(SERVICE_POS).forEach((k) => (this.serviceDown[k] = false))
    this.aptNeutralized = false
    this.aptWarned = false

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
    this.startWave()
    this.time.delayedCall(PHASE_7.aptSpawnDelayMs, () => this.spawnApt())
  }

  buildNetworkMap() {
    const g = this.add.graphics()
    g.lineStyle(4, COLORS.panelLine, 1)
    g.lineBetween(NODES.internet.x, NODES.internet.y, NODES.firewall.x, NODES.firewall.y)
    g.lineBetween(NODES.firewall.x, NODES.firewall.y, NODES.ids.x, NODES.ids.y)
    g.lineBetween(NODES.ids.x, NODES.ids.y, NODES.switch.x, NODES.switch.y)
    Object.values(SERVICE_POS).forEach((p) => g.lineBetween(NODES.switch.x, NODES.switch.y, p.x, p.y))
    g.lineStyle(3, COLORS.red, 0.5)
    g.lineBetween(NODES.switch.x, NODES.switch.y, DB_POS.x, DB_POS.y)

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

    this.serviceNodes = {}
    Object.entries(SERVICE_POS).forEach(([key, s]) => {
      const rect = this.add.rectangle(s.x, s.y, 56, 44, COLORS.green).setStrokeStyle(4, COLORS.navy)
      const icon = this.add.text(s.x, s.y, s.icon, { fontSize: '18px' }).setOrigin(0.5)
      this.add.text(s.x, s.y + 32, s.label, { fontFamily: FONT_BODY, fontSize: '10px', fontStyle: '700', color: '#1b2a55', align: 'center', wordWrap: { width: 90 } }).setOrigin(0.5, 0)
      this.serviceNodes[key] = { rect, icon }
    })

    this.add.rectangle(DB_POS.x, DB_POS.y, 64, 50, COLORS.panel).setStrokeStyle(4, COLORS.red)
    this.dbIcon = this.add.text(DB_POS.x, DB_POS.y, '🗄️', { fontSize: '20px' }).setOrigin(0.5)
    this.add.text(DB_POS.x, DB_POS.y + 32, DB_POS.label, { fontFamily: FONT_BODY, fontSize: '11px', fontStyle: '700', color: '#1b2a55' }).setOrigin(0.5, 0)
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
    this.inspTarget.setText(packet.isApt ? 'Banco de Dados' : SERVICE_POS[packet.target].label)

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
    this.hudTitle.setText(`Fase 7 · Onda ${this.waveNumber || 0}/${PHASE_7.wavesToWin}`)
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
      delay: PHASE_7.packetIntervalMs,
      repeat: PHASE_7.packetsPerWave - 1,
      callback: () => this.spawnPacket(),
    })
    this.spawnPacket()
  }

  spawnPacket() {
    if (this.gameOver || this.packetsSpawned >= PHASE_7.packetsPerWave) return
    this.packetsSpawned++

    const port = Phaser.Utils.Array.GetRandom(PHASE_7.packetPorts)
    const malicious = PHASE_7.maliciousPorts.includes(port) && Math.random() < PHASE_7.maliciousChance
    const kind = malicious ? PHASE_7.threatByPort[port] : null
    let idsTag = malicious ? 'red' : 'green'
    if (Math.random() < PHASE_7.idsErrorChance) idsTag = idsTag === 'red' ? 'green' : 'red'
    const target = malicious ? KIND_TARGET[kind] : Phaser.Utils.Array.GetRandom(Object.keys(SERVICE_POS))

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
            const dest = SERVICE_POS[target]
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

  // IDS nível 3 — além de classificar, bloqueia sozinho parte do que reconhece
  // como malicioso. Não ajuda com falsos negativos: só age quando idsTag='red'.
  maybeAutoBlock(packet) {
    if (packet.malicious && packet.idsTag === 'red' && Math.random() < PHASE_7.autoBlockChance) {
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

    if (packet.malicious) {
      this.score -= 15
      this.totalMissed++
      this.setServiceDown(packet.target)
    } else {
      this.score += 5
    }
    this.refreshHud()
    this.resolvePacketCount()
  }

  setServiceDown(key) {
    if (this.gameOver || this.serviceDown[key]) return
    this.serviceDown[key] = true
    const n = this.serviceNodes[key]
    n.rect.setFillStyle(COLORS.muted)
    n.icon.setText('❌').setFontSize('16px')

    this.time.delayedCall(PHASE_7.serviceDownMs, () => {
      if (this.gameOver) return
      this.serviceDown[key] = false
      n.rect.setFillStyle(COLORS.green)
      n.icon.setText(SERVICE_POS[key].icon).setFontSize('18px')
    })
  }

  resolvePacketCount() {
    this.packetsResolved++
    if (!this.gameOver && this.packetsSpawned >= PHASE_7.packetsPerWave && this.packetsResolved >= this.packetsSpawned) {
      this.finishWave()
    }
  }

  finishWave() {
    this.wavesSurvived++
    this.refreshHud()
    if (this.wavesSurvived >= PHASE_7.wavesToWin) {
      const onlineCount = Object.values(this.serviceDown).filter((down) => !down).length
      const threshold = Math.ceil(Object.keys(SERVICE_POS).length * PHASE_7.serviceOnlineRatio)
      this.endPhase(onlineCount >= threshold, 'services-low')
    } else {
      this.time.delayedCall(1200, () => this.startWave())
    }
  }

  // O APT entra disfarçado de tráfego comum (nunca marcado suspeito pelo IDS),
  // pousa no banco de dados e não se resolve — fica dormente até ser clicado
  // ou até o temporizador de ativação estourar.
  spawnApt() {
    if (this.gameOver) return
    const start = NODES.internet
    const token = packetToken(this, start.x, start.y, 443, COLORS.muted, '📦')

    const packet = { port: 443, malicious: true, kind: 'apt', idsTag: 'green', token, resolved: false, classified: false, isApt: true }
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
              x: DB_POS.x,
              y: DB_POS.y,
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
      this.showToast('🕵️ Um pacote chegou ao banco de dados e continua lá. Isso não é normal — inspecione.')
    }

    const dormancyMs = Phaser.Math.Between(PHASE_7.aptDormancyMinMs, PHASE_7.aptDormancyMaxMs)
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
    this.aptNeutralized = true
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
          ? 'Um APT ficou dormente no banco de dados sem ser detectado e ativou o ataque — infiltrações silenciosas são o ponto forte desse tipo de ameaça.'
          : 'Menos de 70% dos serviços estavam online ao fim da última onda — várias camadas de defesa falharam ao mesmo tempo.'
    }

    this.time.delayedCall(700, () => {
      this.scene.start('Debriefing', {
        phaseId: PHASE_7.id,
        success,
        stars: this.wavesSurvived,
        reason,
        statCards: [
          { value: this.totalBlocked, label: 'Ataques bloqueados', color: '#4c7ef3' },
          { value: this.totalAutoBlocked, label: 'Bloqueios automáticos do IDS', color: '#3fbf7f' },
          { value: this.score, label: 'Pontuação final', color: '#f5a623' },
        ],
        achievement: success ? PHASE_7.achievement : null,
        funFact: success
          ? 'APTs reais, como o Stuxnet, ficam meses infiltrados antes de agir. Você protegeu uma empresa inteira. Mas e se os dados em jogo fossem vidas humanas?'
          : 'APTs reais, como os expostos em campanhas de espionagem industrial, costumam ficar meses infiltrados antes de qualquer ação visível — a detecção depende de vigilância contínua, não de uma única defesa.',
      })
    })
  }
}
