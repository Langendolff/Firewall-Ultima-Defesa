// Nomes de fonte com espaço precisam de aspas dentro do shorthand CSS/canvas,
// senão o parser descarta o font-size inteiro e cai num fallback de 10px.
export const FONT_HEADING = '"Baloo 2", sans-serif'
export const FONT_BODY = 'Nunito, sans-serif'

// Paleta extraída do mockup em src/data/Firewall - Telas do Jogo (standalone).html
export const COLORS = {
  navy: 0x1b2a55,
  white: 0xffffff,
  panel: 0xedeff4,
  panelLine: 0xc7ccd9,
  green: 0x3fbf7f,
  greenDark: 0x2e9863,
  red: 0xe4573d,
  redDark: 0xb5432f,
  redSoft: 0xfcebe8,
  amber: 0xf5a623,
  amberDark: 0xc17e0f,
  blue: 0x4c7ef3,
  blueDark: 0x2f5bc7,
  blueDarker: 0x1e3f94,
  blueLight: 0x8fa5e8,
  sky: 0x8fc7f2,
  skyLight: 0xbfe3f5,
  grassLight: 0xddefdb,
  grass: 0xa9d9ae,
  grassGround: 0x7fbf7a,
  grassGroundLine: 0x58995a,
  muted: 0x8a8fa3,
  mutedText: 0x3a4160,
  cardShadow: 0xe4e8f0,
  pillShadow: 0xc9cfe0,
  cream: 0xfdf8f0,
}

export const PORTS = {
  22: { label: 'SSH', desc: 'Acesso remoto a servidores. Raramente necessário para navegação comum.' },
  25: { label: 'SMTP', desc: 'Envio de e-mail entre servidores.' },
  53: {
    label: 'DNS',
    desc: 'Traduz domínios em IPs. Não precisa abrir: a resposta volta sozinha.',
  },
  80: { label: 'HTTP', desc: 'Navegação web sem criptografia.' },
  443: { label: 'HTTPS', desc: 'Navegação web criptografada — a "porta da frente" da internet.' },
  445: { label: 'SMB', desc: 'Compartilhamento de arquivos do Windows. Alvo clássico de worms e ransomware.' },
  3306: { label: 'MySQL', desc: 'Acesso a banco de dados. Nunca deve ficar aberto para a internet.' },
  3389: { label: 'RDP', desc: 'Acesso remoto de área de trabalho. Muito visado por invasores.' },
}

const portsToGlossary = (portNumbers) => portNumbers.map((p) => ({ term: `Porta ${p} (${PORTS[p].label})`, desc: PORTS[p].desc }))

export const PHASE_1 = {
  id: 1,
  sceneKey: 'Phase1',
  title: 'Primeira Conexão',
  narrative: [
    'Você acabou de instalar seu roteador e conectou sua casa à internet. Um técnico aparece:',
    '"Parabéns, você está online! Só que agora a internet inteira pode bater na sua porta —',
    'literalmente. Um firewall funciona como um porteiro: para cada porta da sua rede, ele decide',
    'quem pode entrar e quem fica de fora."',
  ],
  objective:
    'Abra apenas as portas 80 (HTTP) e 443 (HTTPS) — as únicas que você precisa para navegar na web. Clique no ícone do firewall no mapa e feche todas as outras.',
  tip: 'Toda porta aberta é uma porta que alguém pode tentar usar para entrar. Se você não sabe por que uma porta está aberta, feche-a.',
  threats: [
    {
      name: 'Pacote Cinza',
      desc: 'Tráfego desconhecido tentando entrar por qualquer porta aberta. Porta fechada = pacote barrado.',
      level: 1,
    },
    {
      name: 'Portas Ociosas',
      desc: 'Serviços que você nunca usa (como acesso remoto), expostos à internet sem necessidade.',
      level: 1,
    },
  ],
  glossaryPorts: [22, 25, 53, 80, 443, 3306],
  allowedPorts: [80, 443],
  wavesToWin: 3,
  packetsPerWave: 8,
  packetIntervalMs: 900,
  achievement: {
    name: 'Porteiro Iniciante',
    text: 'Você aprendeu a diferença entre portas necessárias e desnecessárias.',
  },
}
PHASE_1.glossary = portsToGlossary(PHASE_1.glossaryPorts)

export const PHASE_2 = {
  id: 2,
  sceneKey: 'Phase2',
  title: 'Os Primeiros Ataques',
  narrative: [
    '"Sua rede já tem um firewall, mas olha isso..." O técnico mostra um log em',
    'tempo real com tentativas de conexão vindo da internet. Alguns pacotes são',
    'vermelhos. É hora de entender o que há dentro deles.',
  ],
  objective: 'Clique nos pacotes maliciosos para bloqueá-los antes que atinjam um computador.',
  tip: 'Nem todo pacote verde é seguro, e nem todo vermelho é perigoso. O IDS erra — desconfie.',
  threats: [
    { name: 'Pacote DDoS', desc: 'Desativa um computador por alguns segundos.', level: 2 },
    { name: 'Pacote Cinza Ambíguo', desc: 'Nem sempre é o que o IDS diz que é.', level: 1 },
  ],
  glossary: [
    { term: 'IDS', desc: 'Sistema que monitora tráfego e sinaliza anomalias.' },
    { term: 'Falso Negativo', desc: 'Ameaça real que passa despercebida pelo IDS.' },
    { term: 'Falso Positivo', desc: 'Tráfego legítimo marcado como perigoso por engano.' },
  ],
  packetPorts: [22, 80, 443, 445, 3389],
  maliciousPorts: [22, 445, 3389],
  wavesToWin: 5,
  packetsPerWave: 10,
  packetIntervalMs: 800,
  maliciousChance: 0.4,
  idsErrorChance: 0.25,
  pcDownMs: 6000,
  achievement: {
    name: 'Olho de Falcão',
    text: 'Você aprendeu a não confiar cegamente no IDS.',
  },
}

export const PHASES = { 1: PHASE_1, 2: PHASE_2 }
