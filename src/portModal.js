import { COLORS, PORTS, FONT_BODY } from './gameData.js'
import { card, chunkyButton } from './ui.js'

// Modal de "gerenciar portas do firewall", aberto ao clicar no nó do firewall
// no mapa de rede. Cada porta diz em texto se está ABERTA ou FECHADA (não só
// pela cor), e a descrição aparece ao passar o mouse ou ao clicar.
export function buildPortModal(scene, { ports, portOpen, onClose }) {
  const { width: w, height: h } = scene.scale
  const panelW = 540
  const rowH = 52
  const panelH = 214 + ports.length * rowH
  const panelX = (w - panelW) / 2
  const panelY = Math.max(20, (h - panelH) / 2)

  const elements = []
  const backdrop = scene.add.rectangle(0, 0, w, h, 0x000000, 0.55).setOrigin(0).setInteractive().setDepth(50)
  const panel = card(scene, panelX, panelY, panelW, panelH, { radius: 20 }).setDepth(51)
  const title = scene.add
    .text(panelX + 24, panelY + 20, 'PORTAS DO FIREWALL', { fontFamily: FONT_BODY, fontSize: '15px', fontStyle: '800', color: '#1b2a55' })
    .setDepth(51)
  const help = scene.add
    .text(panelX + 24, panelY + 46, 'Clique numa porta para abrir ou fechar. Aberta: o tráfego entra. Fechada: o firewall barra tudo nela.', {
      fontFamily: FONT_BODY,
      fontSize: '13px',
      color: '#3a4160',
      wordWrap: { width: panelW - 90 },
    })
    .setDepth(51)
  const descY = panelY + 96 + ports.length * rowH
  const descBg = card(scene, panelX + 24, descY, panelW - 48, 46, { radius: 10, fill: COLORS.panel }).setDepth(51)
  const desc = scene.add
    .text(panelX + 36, descY + 8, 'Passe o mouse sobre uma porta para ver para que ela serve.', {
      fontFamily: FONT_BODY,
      fontSize: '13px',
      color: '#3a4160',
      wordWrap: { width: panelW - 72 },
    })
    .setDepth(51)
  elements.push(backdrop, panel, title, help, descBg, desc)

  const closeBtn = chunkyButton(scene, panelX + panelW - 52, panelY + 16, 32, 32, {
    radius: 8,
    fill: COLORS.red,
    shadow: 0xb5432f,
    fillHover: 0xea7a64,
    shadowOffset: 3,
    label: 'X',
    fontSize: '14px',
    onClick: () => onClose?.(),
  })
  closeBtn.graphics.setDepth(51)
  closeBtn.text.setDepth(52)
  elements.push(closeBtn.graphics, closeBtn.text)

  const doneBtn = chunkyButton(scene, panelX + panelW / 2 - 100, panelY + panelH - 62, 200, 44, {
    radius: 14,
    fill: COLORS.amber,
    fillHover: 0xf7b64d,
    shadow: COLORS.amberDark,
    shadowOffset: 5,
    label: 'Pronto',
    fontSize: '17px',
    textColor: '#1b2a55',
    onClick: () => onClose?.(),
  })
  doneBtn.graphics.setDepth(51)
  doneBtn.text.setDepth(52)
  elements.push(doneBtn.graphics, doneBtn.text)

  const label = (port) => `Porta ${port} · ${PORTS[port].label}  —  ${portOpen[port] ? 'ABERTA' : 'FECHADA'}`
  const showDesc = (port) => desc.setText(`${PORTS[port].label}: ${PORTS[port].desc}`)

  ports.forEach((port, i) => {
    const x = panelX + 24
    const y = panelY + 90 + i * rowH
    const btnW = panelW - 48
    const open = portOpen[port]
    const btn = chunkyButton(scene, x, y, btnW, 40, {
      radius: 12,
      fill: open ? COLORS.green : COLORS.red,
      shadow: open ? COLORS.greenDark : 0xb5432f,
      fillHover: open ? 0x52d492 : 0xea7a64,
      shadowOffset: 4,
      label: label(port),
      fontSize: '15px',
      onClick: () => {
        portOpen[port] = !portOpen[port]
        const nowOpen = portOpen[port]
        btn.setColors(nowOpen ? COLORS.green : COLORS.red, nowOpen ? COLORS.greenDark : 0xb5432f)
        btn.text.setText(label(port))
        showDesc(port)
      },
    })
    btn.graphics.setDepth(51)
    btn.text.setDepth(52)
    btn.graphics.on('pointerover', () => showDesc(port))
    elements.push(btn.graphics, btn.text)
  })

  elements.forEach((el) => el.setVisible(false))

  return { setVisible: (show) => elements.forEach((el) => el.setVisible(show)) }
}
