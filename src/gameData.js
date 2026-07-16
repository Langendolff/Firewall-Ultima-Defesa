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
  2575: { label: 'HL7', desc: 'Protocolo de comunicação de equipamentos médicos. Precisa ficar sempre aberto.' },
  701: { label: 'SWIFT', desc: 'Rede de mensagens para transferências bancárias internacionais.' },
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

export const PHASE_3 = {
  id: 3,
  sceneKey: 'Phase3',
  title: 'Honeypot: A Armadilha',
  narrative: [
    '"E se, em vez de só bloquear ataques, você pudesse atrair os atacantes para uma armadilha?"',
    'O técnico instala um servidor falso na sua rede: um honeypot. Ele parece um alvo valioso e',
    'vulnerável, mas na verdade só existe para enganar quem tentar invadir — e revelar como atacam.',
  ],
  objective:
    'Arraste o honeypot para perto da rota até o Servidor de Arquivos: quanto mais perto do caminho, maior a chance de o ataque cair na armadilha em vez de acertar o alvo real.',
  tip: 'Um honeypot só funciona perto do alvo real — não perto da entrada. E fechar portas não é armadura completa: ameaças disfarçadas de tráfego que você precisa manter aberto (como HTTPS) ainda podem passar.',
  threats: [
    { name: 'Trojan (via SMB)', desc: 'Se infectar o Servidor de Arquivos, a fase é perdida na hora.', level: 3 },
    { name: 'DDoS', desc: 'Derruba o servidor por alguns segundos — sobrevivível, mas custa pontos.', level: 2 },
    { name: 'Sinal de Ransomware', desc: 'Ainda não causa dano real nesta fase — é um aviso do que vem a seguir.', level: 1 },
  ],
  glossary: [
    { term: 'Honeypot', desc: 'Sistema intencionalmente vulnerável para atrair e estudar atacantes.' },
    { term: 'Threat Intelligence', desc: 'Dados sobre táticas do atacante, usados para reforçar defesas reais.' },
    { term: 'Trojan', desc: 'Malware disfarçado de programa legítimo que abre uma porta dos fundos.' },
  ],
  packetPorts: [22, 80, 443, 445, 3306, 3389],
  maliciousPorts: [22, 443, 445, 3306, 3389],
  threatByPort: { 22: 'ddos', 443: 'ddos', 445: 'trojan', 3306: 'ddos', 3389: 'ransomware' },
  // 443 tem chance própria e bem menor: é a porta que o objetivo manda manter
  // aberta, então fechar tudo não pode ser uma forma de zerar o risco.
  maliciousChanceByPort: { 443: 0.15 },
  wavesToWin: 4,
  packetsPerWave: 8,
  packetIntervalMs: 800,
  maliciousChance: 0.35,
  idsErrorChance: 0.2,
  serverDownMs: 5000,
  honeypotHp: 10,
  diversionThreshold: 0.6,
  achievement: {
    name: 'Mestre da Armadilha',
    text: 'Você aprendeu a usar deception para desviar ataques e revelar as táticas do inimigo.',
  },
}

export const PHASE_4 = {
  id: 4,
  sceneKey: 'Phase4',
  title: 'Bem-vindo à Empresa',
  narrative: [
    'Você é o novo analista de segurança de uma empresa de médio porte. A rede tem dez computadores',
    'de funcionários, um servidor web e um servidor de e-mail — e, em algum lugar, o banco de dados',
    'que não pode, de jeito nenhum, ficar exposto direto à internet.',
  ],
  objective:
    'Antes de iniciar, arraste os 3 servidores no mapa até os segmentos corretos: web e e-mail vão na DMZ, o banco de dados fica fora dela. Depois, defenda a rede — o servidor web precisa sobreviver 8 ondas sem que o segmento interno seja comprometido.',
  tip: 'A DMZ existe para isolar quem fala com a internet de quem não deveria. Banco de dados nunca vai na DMZ.',
  threats: [
    { name: 'Phishing', desc: 'E-mail disfarçado de legítimo mirando o servidor de e-mail.', level: 2 },
    { name: 'DDoS no Servidor Web', desc: 'Sobrecarrega o servidor web até derrubá-lo temporariamente.', level: 2 },
  ],
  glossary: [
    { term: 'DMZ', desc: 'Segmento entre a internet e a rede interna, onde ficam servidores públicos.' },
    { term: 'VLAN', desc: 'Rede virtual que segmenta o tráfego por setor no mesmo switch físico.' },
    { term: 'Segmentação', desc: 'Dividir a rede em partes isoladas para conter um ataque a uma área específica.' },
  ],
  packetPorts: [25, 80, 443],
  maliciousPorts: [25, 80, 443],
  threatByPort: { 25: 'phishing', 80: 'ddos', 443: 'ddos' },
  wavesToWin: 8,
  packetsPerWave: 8,
  packetIntervalMs: 800,
  maliciousChance: 0.4,
  idsErrorChance: 0.2,
  serverDownMs: 5000,
  achievement: {
    name: 'Arquiteto de Redes',
    text: 'Você aprendeu a isolar servidores públicos numa DMZ, longe da rede interna e do banco de dados.',
  },
}

export const PHASE_5 = {
  id: 5,
  sceneKey: 'Phase5',
  title: 'O Ransomware Chegou',
  narrative: [
    'Um surto de ransomware está se espalhando pela rede da empresa. Um computador infectado tenta',
    'contaminar outro em poucos segundos — e se nenhum host saudável restar, o próximo alvo é o banco',
    'de dados. Um servidor de backup foi instalado, mas restaurar um PC isolado custa dinheiro.',
  ],
  objective:
    'Clique em qualquer PC infectado dentro de 10 segundos para isolá-lo antes que o ransomware se espalhe. Use o servidor de backup para restaurar PCs isolados. Mantenha o banco de dados intacto por 6 ondas.',
  tip: 'Isolar rápido é mais barato que deixar o ransomware se espalhar — cada PC perdido aproxima o ataque do banco de dados.',
  threats: [{ name: 'Ransomware (SMB/RDP)', desc: 'Infecta um computador; se não for isolado em 10s, se espalha para outro.', level: 3 }],
  glossary: [
    { term: 'Contenção', desc: 'Isolar um sistema infectado da rede para impedir que o ataque se espalhe.' },
    { term: 'Quarentena', desc: 'Cortar a conexão de um host comprometido, mantendo-o offline até ser limpo.' },
    { term: 'Regra 3-2-1', desc: 'Backup: 3 cópias dos dados, em 2 mídias diferentes, sendo 1 fora do local.' },
  ],
  packetPorts: [80, 443, 445, 3389],
  maliciousPorts: [445, 3389],
  threatByPort: { 445: 'ransomware', 3389: 'ransomware' },
  pcKeys: ['pc1', 'pc2', 'pc3', 'pc4'],
  wavesToWin: 6,
  packetsPerWave: 8,
  packetIntervalMs: 800,
  maliciousChance: 0.45,
  idsErrorChance: 0.2,
  quarantineWindowMs: 10000,
  restoreMs: 8000,
  restoreCost: 15,
  achievement: {
    name: 'Bombeiro Digital',
    text: 'Você conteve todo surto de ransomware antes que se espalhasse — contenção rápida evita danos maiores.',
  },
}

export const PHASE_6 = {
  id: 6,
  sceneKey: 'Phase6',
  title: 'HTTPS ou Morte',
  narrative: [
    'Você assume a segurança da loja virtual da empresa. Todo dia, clientes digitam senhas e números',
    'de cartão de crédito nesse site — e qualquer transação que trafegar sem criptografia pode ser lida',
    'por qualquer um na mesma rede. Um proxy reverso foi instalado para lidar com os certificados TLS.',
  ],
  objective:
    'Feche a porta 80 (HTTP) no firewall — a loja só deve aceitar tráfego por HTTPS (443). Mesmo assim, alguns pacotes na porta 443 usam certificados forjados: inspecione e bloqueie-os antes que cheguem à loja. Nenhuma transação pode ser interceptada em 5 ondas.',
  tip: 'Um cadeado aberto (🔓) significa dado em texto puro — qualquer um na rede pode ler. Um cadeado fechado (🔒) nem sempre é confiável: certificados forjados também se disfarçam de HTTPS.',
  threats: [
    { name: 'Transação sem criptografia (HTTP)', desc: 'Qualquer transação na porta 80 pode ser lida por um atacante na mesma rede.', level: 3 },
    { name: 'Certificado Forjado (Man-in-the-Middle)', desc: 'Pacote na porta 443 finge ser HTTPS legítimo para interceptar a transação.', level: 3 },
  ],
  glossary: [
    { term: 'TLS/SSL', desc: 'Protocolo que criptografa a conexão entre cliente e servidor.' },
    { term: 'Man-in-the-Middle', desc: 'Ataque em que alguém intercepta a comunicação entre duas partes sem que elas percebam.' },
    { term: 'Proxy Reverso', desc: 'Servidor que fica na frente da aplicação, terminando conexões TLS antes de repassar o tráfego.' },
  ],
  packetPorts: [80, 443],
  maliciousPorts: [80, 443],
  threatByPort: { 80: 'plaintext', 443: 'mitm' },
  wavesToWin: 5,
  packetsPerWave: 8,
  packetIntervalMs: 800,
  maliciousChance: 0.35,
  idsErrorChance: 0.2,
  achievement: {
    name: 'Guardião do Cadeado',
    text: 'Você aprendeu que o cadeado no navegador não é cosmético — é a diferença entre dados públicos e privados.',
  },
}

export const PHASE_7 = {
  id: 7,
  sceneKey: 'Phase7',
  title: 'IDS no Limite',
  narrative: [
    'A empresa está sob um ataque coordenado: phishing, DDoS, ransomware e certificados forjados chegam',
    'juntos, misturados no mesmo tráfego. O IDS foi atualizado para nível 3 e agora bloqueia sozinho parte',
    'das ameaças que reconhece — mas nenhuma defesa isolada é suficiente contra tudo.',
  ],
  objective:
    'Mantenha o banco de dados intacto e pelo menos 70% dos serviços online até o fim de 7 ondas. O IDS nível 3 bloqueia automaticamente parte dos ataques reconhecidos, mas ainda depende de você para o resto.',
  tip: 'Nem todo pacote que chega ao destino desaparece. Um APT pode ficar dormente esperando o momento certo — se algo continuar parado onde não deveria, inspecione.',
  threats: [
    { name: 'Ataques mistos', desc: 'Phishing, DDoS, ransomware e certificados forjados chegam misturados na mesma onda.', level: 2 },
    { name: 'APT (Ameaça Persistente Avançada)', desc: 'Se infiltra sem ser detectado e fica dormente até atacar o banco de dados.', level: 3 },
  ],
  glossary: [
    { term: 'APT', desc: 'Se infiltra na rede e fica dormente até atacar.' },
    { term: 'Defesa em Profundidade', desc: 'Camadas de defesa: se uma falha, a próxima protege.' },
    { term: 'IDS Nível 3 / IPS', desc: 'Detecta e bloqueia sozinho parte das ameaças reconhecidas.' },
  ],
  packetPorts: [25, 80, 443, 445, 3389],
  maliciousPorts: [25, 80, 443, 445, 3389],
  threatByPort: { 25: 'phishing', 80: 'ddos', 443: 'mitm', 445: 'trojan', 3389: 'ransomware' },
  wavesToWin: 7,
  packetsPerWave: 8,
  packetIntervalMs: 750,
  maliciousChance: 0.4,
  idsErrorChance: 0.2,
  autoBlockChance: 0.4,
  serviceDownMs: 6000,
  aptSpawnDelayMs: 2500,
  aptDormancyMinMs: 9000,
  aptDormancyMaxMs: 16000,
  serviceOnlineRatio: 0.7,
  achievement: {
    name: 'Caçador de APTs',
    text: 'Você percebeu a ameaça dormente antes que ela agisse — nenhuma defesa isolada é suficiente sem vigilância.',
  },
}

export const PHASE_8 = {
  id: 8,
  sceneKey: 'Phase8',
  title: 'Código Azul',
  narrative: [
    'Você agora protege um hospital. A rede clínica guarda prontuários de pacientes, a rede',
    'administrativa toca o dia a dia do hospital, e equipamentos médicos — marca-passo, ventilador,',
    'monitor cardíaco — dependem de uma porta que precisa ficar sempre aberta para funcionar.',
  ],
  objective:
    'Mantenha o servidor de prontuários online ao fim de 8 ondas. A porta dos equipamentos médicos não pode ser fechada — proteja-a inspecionando e bloqueando pacotes manualmente. Qualquer equipamento comprometido é derrota imediata.',
  tip: 'Hospitais não podem simplesmente parar. Um equipamento médico comprometido não tem segunda chance — fique de olho nos pacotes que miram a porta 2575, mesmo que o IDS não os marque como suspeitos.',
  threats: [
    { name: 'Ransomware Hospitalar', desc: 'Ataca o servidor de prontuários — hospitais raramente podem parar para se recuperar.', level: 3 },
    { name: 'DDoS em Equipamentos IoT', desc: 'Compromete um equipamento médico. Qualquer um comprometido é derrota imediata.', level: 3 },
    { name: 'Trojan na Rede Administrativa', desc: 'Compromete PCs administrativos — importante, mas não coloca vidas em risco.', level: 2 },
  ],
  glossary: [
    { term: 'IoT', desc: 'Dispositivos conectados com pouco patch de segurança.' },
    { term: 'LGPD', desc: 'Lei que exige proteção especial para dados de saúde.' },
    { term: 'IPS', desc: 'Bloqueia ameaças automaticamente, sem depender do firewall.' },
  ],
  packetPorts: [80, 445, 3389, 2575],
  maliciousPorts: [445, 3389, 2575],
  threatByPort: { 445: 'ransomware', 3389: 'trojan', 2575: 'ddos' },
  iotPort: 2575,
  wavesToWin: 8,
  packetsPerWave: 8,
  packetIntervalMs: 800,
  maliciousChance: 0.35,
  idsErrorChance: 0.15,
  iotAutoBlockChance: 0.5,
  recordsDownMs: 6000,
  adminDownMs: 6000,
  achievement: {
    name: 'Guardião da Vida',
    text: 'Você entendeu que alguns sistemas não podem falhar — proteger vidas exige vigilância mesmo onde o firewall não alcança.',
  },
}

export const PHASE_9 = {
  id: 9,
  sceneKey: 'Phase9',
  title: 'Cofre Digital',
  narrative: [
    'Você protege um banco. O core bancário guarda o dinheiro de verdade, os ATMs atendem clientes',
    'na rua, o internet banking processa transações de casa, e o SWIFT move transferências entre',
    'países. Uma autenticação multifator foi instalada — mas só ajuda enquanto estiver ativa.',
  ],
  objective:
    'Ative o MFA no mapa para reforçar a proteção do internet banking e do SWIFT. Mantenha o core bancário intacto e menos de 3 transações fraudulentas completadas ao fim de 8 ondas.',
  tip: 'MFA não impede um invasor de tentar — impede que ele complete a fraude sem o segundo fator. O core bancário só é alcançado por uma ameaça que finge ser tráfego comum: fique de olho no que não desaparece.',
  threats: [
    { name: 'Fraude via Man-in-the-Middle', desc: 'Intercepta o internet banking para roubar uma transação.', level: 3 },
    { name: 'Ataque SWIFT', desc: 'Mensagem forjada tenta desviar uma transferência internacional.', level: 3 },
    { name: 'DDoS nos ATMs', desc: 'Derruba caixas eletrônicos por um tempo — recuperável, mas custa pontos.', level: 2 },
    { name: 'APT no Core Bancário', desc: 'Se infiltra disfarçado e fica dormente até comprometer o core.', level: 3 },
  ],
  glossary: [
    { term: 'MFA', desc: 'Exige senha + token ou biometria antes de autorizar acesso.' },
    { term: 'Menor Privilégio', desc: 'Cada sistema acessa só o que precisa — nada além disso.' },
    { term: 'SWIFT', desc: 'Rede de mensagens para transferências internacionais.' },
  ],
  packetPorts: [80, 443, 701, 3389],
  maliciousPorts: [443, 701, 3389],
  threatByPort: { 443: 'mitm', 701: 'swift', 3389: 'ddos' },
  wavesToWin: 8,
  packetsPerWave: 8,
  packetIntervalMs: 800,
  maliciousChance: 0.35,
  idsErrorChance: 0.15,
  mfaAutoBlockChance: 0.55,
  atmDownMs: 6000,
  fraudLimit: 3,
  aptSpawnDelayMs: 2500,
  aptDormancyMinMs: 9000,
  aptDormancyMaxMs: 16000,
  achievement: {
    name: 'Guardião do Cofre',
    text: 'Você completou a fase sem nenhuma fraude — MFA e vigilância constante fecharam toda porta que o atacante tentou usar.',
  },
}

export const PHASES = { 1: PHASE_1, 2: PHASE_2, 3: PHASE_3, 4: PHASE_4, 5: PHASE_5, 6: PHASE_6, 7: PHASE_7, 8: PHASE_8, 9: PHASE_9 }
