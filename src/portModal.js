import { COLORS, PORTS, FONT_BODY } from './gameData.js'
import { card, chunkyButton } from './ui.js'

// Modal de "gerenciar portas do firewall" — usado tanto na Fase 1 quanto na
// Fase 2, aberto ao clicar no nó do firewall no mapa de rede.
export function buildPortModal(scene, { ports, portOpen, onClose }) {
  const { width: w, height: h } = scene.scale
  const panelW = 460
  const panelH = 140 + ports.length * 54
  const panelX = (w - panelW) / 2
  const panelY = (h - panelH) / 2

  const elements = []
  const backdrop = scene.add.rectangle(0, 0, w, h, 0x000000, 0.55).setOrigin(0).setInteractive().setDepth(50)
  const panel = card(scene, panelX, panelY, panelW, panelH, { radius: 20 }).setDepth(51)
  const title = scene.add
    .text(panelX + 24, panelY + 20, 'PORTAS DO FIREWALL', { fontFamily: FONT_BODY, fontSize: '13px', fontStyle: '800', color: '#8a8fa3' })
    .setDepth(51)
  const desc = scene.add
    .text(panelX + 24, panelY + panelH - 34, 'Passe o mouse sobre uma porta para ver a descrição.', {
      fontFamily: FONT_BODY,
      fontSize: '11px',
      color: '#5a6072',
      wordWrap: { width: panelW - 48 },
    })
    .setDepth(51)
  elements.push(backdrop, panel, title, desc)

  const closeBtn = chunkyButton(scene, panelX + panelW - 48, panelY + 16, 28, 28, {
    radius: 8,
    fill: COLORS.red,
    shadow: 0xb5432f,
    fillHover: 0xea7a64,
    shadowOffset: 3,
    label: 'X',
    fontSize: '13px',
    onClick: () => onClose?.(),
  })
  closeBtn.graphics.setDepth(51)
  closeBtn.text.setDepth(52)
  elements.push(closeBtn.graphics, closeBtn.text)

  ports.forEach((port, i) => {
    const x = panelX + 24
    const y = panelY + 58 + i * 54
    const btnW = panelW - 48
    const open = portOpen[port]
    const btn = chunkyButton(scene, x, y, btnW, 40, {
      radius: 12,
      fill: open ? COLORS.green : COLORS.red,
      shadow: open ? COLORS.greenDark : 0xb5432f,
      fillHover: open ? 0x52d492 : 0xea7a64,
      shadowOffset: 4,
      label: `Porta ${port} · ${PORTS[port].label}`,
      fontSize: '13px',
      onClick: () => {
        portOpen[port] = !portOpen[port]
        const nowOpen = portOpen[port]
        btn.setColors(nowOpen ? COLORS.green : COLORS.red, nowOpen ? COLORS.greenDark : 0xb5432f)
      },
    })
    btn.graphics.setDepth(51)
    btn.text.setDepth(52)
    btn.graphics.on('pointerover', () => desc.setText(`${PORTS[port].label}: ${PORTS[port].desc}`))
    elements.push(btn.graphics, btn.text)
  })

  elements.forEach((el) => el.setVisible(false))

  return { setVisible: (show) => elements.forEach((el) => el.setVisible(show)) }
}
