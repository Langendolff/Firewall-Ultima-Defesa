import { COLORS, PORTS, FONT_HEADING, FONT_BODY } from './gameData.js'
import { card, chunkyButton, floatMark } from './ui.js'

// Painel-guia embaixo do mapa de cada fase, para quem não costuma jogar:
//   - "COMO JOGAR": os passos da fase (PHASE_N.howTo), sempre visíveis;
//   - botão "Começar": a primeira onda só sai quando a pessoa estiver pronta
//     (fases com etapa de preparação própria, como a 4, a 6 e a 8, não usam);
//   - "O QUE ACONTECEU": cada acerto e cada erro com o motivo, na hora.
// As cenas chamam guide.onBlock(packet) / guide.onDeliver(packet) ao resolver
// um pacote e guide.log(texto, tom) para eventos próprios.
//
// ?autostart=1 na URL começa sem esperar o clique (usado pelos testes).

const PANEL = { x: 260, y: 602, w: 920, h: 284 }
const COL_GAP = 28
const LEFT_W = 430
const FEED_MAX = 4

const TONES = {
  good: { icon: '✔', color: '#2e9863' },
  bad: { icon: '✖', color: '#e4573d' },
  warn: { icon: '⚠', color: '#c17e0f' },
  info: { icon: '•', color: '#3a4160' },
  // eventos da própria fase, que já trazem o próprio emoji
  event: { icon: '', color: '#1b2a55' },
}

const KIND_LABEL = {
  ddos: 'um DDoS',
  trojan: 'um Trojan',
  ransomware: 'um ransomware',
  phishing: 'um phishing',
  mitm: 'um certificado forjado (man-in-the-middle)',
  plaintext: 'uma transação sem criptografia',
  swift: 'uma mensagem SWIFT forjada',
  worm: 'um worm',
  supply: 'uma atualização falsa (cadeia de suprimentos)',
  apt: 'um APT',
}

const portName = (port) => (PORTS[port] ? `${port} (${PORTS[port].label})` : String(port))

/**
 * Monta o painel-guia.
 * @param {Phaser.Scene} scene
 * @param {{ phase: object, onStart?: () => void, legend?: boolean }} opts
 */
export function buildGuide(scene, { phase, onStart, legend = true }) {
  const { x, y, w, h } = PANEL
  card(scene, x, y, w, h, { radius: 22 })

  // ---- coluna da esquerda: como jogar ----
  const lx = x + 24
  scene.add.text(lx, y + 18, 'COMO JOGAR', { fontFamily: FONT_BODY, fontSize: '13px', fontStyle: '800', color: '#8a8fa3' })
  let ty = y + 44
  ;(phase.howTo ?? []).forEach((step, i) => {
    scene.add.circle(lx + 11, ty + 10, 11, COLORS.blue)
    scene.add.text(lx + 11, ty + 10, String(i + 1), { fontFamily: FONT_HEADING, fontSize: '13px', fontStyle: '800', color: '#ffffff' }).setOrigin(0.5)
    const t = scene.add.text(lx + 32, ty, step, {
      fontFamily: FONT_BODY,
      fontSize: '15px',
      color: '#1b2a55',
      wordWrap: { width: LEFT_W - 36 },
      lineSpacing: 2,
    })
    ty += Math.max(t.height, 22) + 10
  })

  if (legend) {
    const ly = y + h - 30
    const dot = (cx, color, sym) => {
      scene.add.circle(cx, ly, 9, color).setStrokeStyle(2, COLORS.navy)
      if (sym) scene.add.text(cx, ly, sym, { fontFamily: FONT_HEADING, fontSize: '11px', fontStyle: '800', color: '#ffffff' }).setOrigin(0.5)
    }
    const label = (lxx, text) =>
      scene.add.text(lxx, ly, text, { fontFamily: FONT_BODY, fontSize: '13px', fontStyle: '700', color: '#3a4160' }).setOrigin(0, 0.5)
    dot(lx + 9, COLORS.muted)
    label(lx + 24, 'não inspecionado')
    dot(lx + 160, COLORS.green, '✓')
    label(lx + 175, 'IDS: parece seguro')
    dot(lx + 320, COLORS.red, '!')
    label(lx + 335, 'IDS: suspeito')
  }

  // ---- coluna da direita: o que aconteceu ----
  const rx = x + 24 + LEFT_W + COL_GAP
  const rw = w - (rx - x) - 24
  scene.add.text(rx, y + 18, 'O QUE ACONTECEU', { fontFamily: FONT_BODY, fontSize: '13px', fontStyle: '800', color: '#8a8fa3' })
  card(scene, rx, y + 42, rw, h - 60, { radius: 14, fill: COLORS.panel })
  const placeholder = scene.add.text(rx + 14, y + 56, 'Cada acerto e cada erro aparecem aqui, com o motivo.', {
    fontFamily: FONT_BODY,
    fontSize: '14px',
    color: '#8a8fa3',
    wordWrap: { width: rw - 28 },
  })
  const entries = []

  const log = (text, tone = 'info') => {
    if (!scene.sys.isActive()) return
    placeholder.setVisible(false)
    const style = TONES[tone] ?? TONES.info
    const row = scene.add.text(rx + 14, 0, style.icon ? `${style.icon}  ${text}` : text, {
      fontFamily: FONT_BODY,
      fontSize: '14px',
      fontStyle: tone === 'info' ? '400' : '700',
      color: style.color,
      wordWrap: { width: rw - 28 },
      lineSpacing: 1,
    })
    entries.unshift(row)
    while (entries.length > FEED_MAX) entries.pop().destroy()
    let ey = y + 54
    const bottom = y + 42 + (h - 60) - 8
    entries.forEach((e, i) => {
      e.setY(ey).setAlpha(i === 0 ? 1 : 0.65)
      e.setVisible(ey + e.height <= bottom)
      ey += e.height + 8
    })
    row.setAlpha(0)
    scene.tweens.add({ targets: row, alpha: 1, duration: 250 })
  }

  // ---- começar ----
  let started = !onStart
  let startBtn = null
  const start = () => {
    if (started) return
    started = true
    startBtn?.graphics.destroy()
    startBtn?.text.destroy()
    startHint?.destroy()
    log('Fase começou. Use "Pausar" no topo sempre que precisar pensar.', 'info')
    onStart()
  }
  let startHint = null
  if (onStart) {
    // o botão fica sobre o feed até a fase começar: é a primeira coisa a fazer
    startHint = scene.add
      .text(rx + rw / 2, y + 78, 'Leia os passos ao lado e prepare a rede.\nQuando estiver pronto:', {
        fontFamily: FONT_BODY,
        fontSize: '15px',
        color: '#3a4160',
        align: 'center',
      })
      .setOrigin(0.5)
    placeholder.setVisible(false)
    startBtn = chunkyButton(scene, rx + rw / 2 - 130, y + 120, 260, 58, {
      radius: 18,
      fill: COLORS.amber,
      fillHover: 0xf7b64d,
      shadow: COLORS.amberDark,
      shadowOffset: 6,
      label: '▶  Começar a fase',
      fontSize: '21px',
      textColor: '#1b2a55',
      onClick: start,
    })
    scene.tweens.add({ targets: [startBtn.text], scale: 1.06, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    if (new URLSearchParams(location.search).get('autostart') === '1') scene.time.delayedCall(0, start)
  }

  // ---- explicações padrão para pacotes ----
  const onBlock = (packet) => {
    const t = packet.token
    if (t) floatMark(scene, t.x, t.y, packet.malicious)
    const kind = packet.kind && KIND_LABEL[packet.kind] ? `: era ${KIND_LABEL[packet.kind]}` : ''
    if (packet.malicious) {
      log(`Ataque barrado na porta ${portName(packet.port)}${kind}.`, 'good')
    } else {
      const idsWrong = packet.idsTag === 'red' ? ' O IDS errou ao marcá-lo como suspeito.' : ''
      log(`O pacote da porta ${portName(packet.port)} era tráfego normal. Bloquear o que é legítimo também tira pontos.${idsWrong}`, 'bad')
    }
  }

  const onDeliver = (packet) => {
    if (!packet.malicious) return
    const t = packet.token
    if (t) floatMark(scene, t.x, t.y, false)
    const kind = packet.kind && KIND_LABEL[packet.kind] ? ` (${KIND_LABEL[packet.kind]})` : ''
    const why =
      packet.idsTag === 'green'
        ? ' O IDS marcou como seguro: ele às vezes erra, então confira a porta.'
        : packet.idsTag === 'red'
          ? ' Ele estava marcado com "!": da próxima vez, clique nele antes que chegue.'
          : ''
    log(`Um ataque${kind} passou pela porta ${portName(packet.port)} e chegou ao alvo.${why}`, 'bad')
  }

  return {
    log,
    onBlock,
    onDeliver,
    start,
    get started() {
      return started
    },
  }
}

/**
 * Destaque pulsante em volta de um elemento do mapa, com um balão de texto.
 * Devolve uma função que remove o destaque.
 */
export function coach(scene, x, y, text, { radius = 46, above = true } = {}) {
  const ring = scene.add.circle(x, y, radius).setStrokeStyle(5, COLORS.amber).setDepth(30)
  scene.tweens.add({ targets: ring, scale: 1.18, alpha: 0.35, duration: 750, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
  const by = above ? y - radius - 34 : y + radius + 34
  const bubble = scene.add
    .text(x, by, text, {
      fontFamily: FONT_BODY,
      fontSize: '15px',
      fontStyle: '800',
      color: '#1b2a55',
      backgroundColor: '#f5a623',
      padding: { x: 14, y: 8 },
      align: 'center',
    })
    .setOrigin(0.5)
    .setDepth(31)
  scene.tweens.add({ targets: bubble, y: by - 6, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
  return () => {
    ring.destroy()
    bubble.destroy()
  }
}
