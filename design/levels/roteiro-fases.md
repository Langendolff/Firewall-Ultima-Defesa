**🔥 FIREWALL**

**A Última Defesa**

*Game Design Document — Design de Fases e Roteiro Educacional*

Versão 1.0

# **1\. Visão Geral do Design Educacional**

Firewall: A Última Defesa é um tower defense educacional cujo objetivo central é ensinar conceitos de segurança de redes de forma progressiva e contextualizada. Cada fase não é apenas um desafio de gameplay — é uma aula estruturada disfarçada de jogo.

## **1.1 Princípios Pedagógicos**

* Aprendizado por consequência: o jogador aprende errando — uma porta mal configurada resulta em ataque real.

* Progressão em espiral: conceitos introduzidos em fases iniciais retornam com maior complexidade em fases avançadas.

* Contextualização profissional: cada fase simula um cenário do mundo real (residência, empresa, hospital, banco).

* Feedback imediato: o jogo explica o porquê de cada ataque que passa — não apenas que passou.

## **1.2 Estrutura da Progressão**

O jogo é dividido em 3 Arcos, cada um com cenário, ameaças e ferramentas próprias:

| Arco | Cenário | Fases | Foco Educacional |
| :---- | :---- | :---- | :---- |
| Arco 1 — Fundamentos | Rede Doméstica | 1 a 3 | Portas, firewall básico, tipos de pacotes |
| Arco 2 — Corporativo | Empresa / E-commerce | 4 a 7 | DMZ, segmentação, criptografia, IDS/IPS |
| Arco 3 — Missão Crítica | Hospital / Banco / Gov. | 8 a 10 | Defesa em profundidade, APTs, resposta a incidentes |

# **2\. Arco 1 — Fundamentos da Rede**

*Cenário: Rede Doméstica  |  Fases 1 a 3  |  Dificuldade: ★☆☆☆☆ a ★★☆☆☆*

O jogador assume o papel de alguém que acabou de contratar internet em casa e descobre que sua rede está completamente exposta. As primeiras fases funcionam como tutorial, apresentando os componentes básicos sem sobrecarregar o jogador.

## **Fase 1 — "Primeira Conexão"**

### **Contexto Narrativo**

Você acabou de instalar seu roteador. Um técnico virtual (personagem guia do jogo) aparece e explica: "Parabéns\! Você está online. Mas sabia que qualquer pessoa na internet pode tentar entrar na sua rede agora?"

| Aspecto | Detalhes |
| :---- | :---- |
| Rede | Residência simples: 1 roteador, 2 computadores, 1 servidor de arquivos pessoal |
| Objetivo | Configurar o firewall para bloquear portas não utilizadas e permitir apenas navegação web |
| Ameaças | Apenas pacotes cinzas (tráfego desconhecido) — sem malwares ativos ainda |
| Ferramentas | Firewall básico (apenas allow/block por porta) |
| Portas em foco | 80 (HTTP), 443 (HTTPS) — liberar; todas as demais — bloquear |
| Condição de vitória | Bloquear 100% dos pacotes em portas desnecessárias por 3 ondas seguidas |
| Condição de derrota | Não há derrota nesta fase — apenas pontuação para incentivar exploração |

### **Roteiro Educacional — Fase 1**

| 💡 Conceito ensinado: Portas de rede são como portas de uma casa. Você não deixa todas abertas — apenas as que precisa. A porta 80/443 é a porta da frente (navegação web). Deixar a porta 22 (SSH) aberta sem necessidade é como deixar a porta dos fundos destrancada. |
| :---- |

* **O técnico explica o que é uma porta de rede com analogia visual (casa com várias portas numeradas).** Briefing pré-fase:

* **Pacotes chegam e uma tooltip mostra em qual porta estão batendo e o que significa.** Durante a fase:

* **Relatório mostrando quantos pacotes foram bloqueados e por qual porta tentaram entrar.** Debriefing pós-fase:

* **"Porteiro Iniciante" — com mini-glossário de portas comuns (22, 25, 53, 80, 443, 3306).** Conquista desbloqueada:

## **Fase 2 — "Os Primeiros Ataques"**

### **Contexto Narrativo**

"Sua rede já tem um firewall, mas olha isso..." — o técnico mostra um log em tempo real com tentativas de conexão vindo da internet. Alguns pacotes são vermelhos. É hora de entender o que há dentro deles.

| Aspecto | Detalhes |
| :---- | :---- |
| Rede | Mesma residência \+ Wi-Fi ativado (vetor novo de entrada) |
| Objetivo | Identificar e bloquear pacotes maliciosos; manter computadores funcionando |
| Ameaças | Pacotes vermelhos com DDoS (desativa PC por 30 segundos), pacotes cinzas ambíguos |
| Ferramentas | Firewall \+ IDS nível 1 (marca pacotes em vermelho/verde) |
| Novo conceito | Falso positivo e falso negativo do IDS — alguns pacotes verdes são maliciosos |
| Condição de vitória | Sobreviver 5 ondas sem ter os 2 computadores desativados ao mesmo tempo |
| Condição de derrota | Ambos os computadores desativados simultaneamente |

### **Roteiro Educacional — Fase 2**

| 💡 Conceito ensinado: IDS (Sistema de Detecção de Intrusão) monitora o tráfego e sinaliza anomalias. Mas nenhum sistema é perfeito: falsos positivos bloqueiam tráfego legítimo; falsos negativos deixam ameaças passarem. O analista de segurança precisa interpretar os alertas, não apenas confiar cegamente neles. |
| :---- |

* **Animação mostrando o IDS "escaneando" um pacote — raio-X visual do conteúdo.** Briefing pré-fase:

* **O jogador pode clicar em qualquer pacote para ver detalhes (porta, protocolo, conteúdo suspeito).** Mecânica nova:

* **Um pacote verde passa e infecta um PC — o técnico explica: "Isso é um falso negativo. O IDS foi enganado."** Tensão educacional:

* **Gráfico de acurácia do IDS mostrando taxa de falsos positivos e negativos da rodada.** Debriefing:

## **Fase 3 — "Honeypot: A Armadilha"**

### **Contexto Narrativo**

"E se, em vez de só bloquear ataques, você pudesse atrair os atacantes para uma armadilha?" — o técnico apresenta o conceito de honeypot. Fase desafiadora que encerra o primeiro arco.

| Aspecto | Detalhes |
| :---- | :---- |
| Rede | Residência \+ servidor falso (honeypot) posicionável pelo jogador |
| Objetivo | Usar o honeypot para desviar ataques dos servidores reais |
| Ameaças | Trojan (transforma PC em vetor), DDoS, primeiros pacotes de Ransomware (aviso apenas) |
| Ferramentas | Firewall \+ IDS nível 1 \+ Honeypot (posicionamento livre) |
| Novo conceito | Honeypot como técnica de deception — engana o atacante e revela suas táticas |
| Condição de vitória | Desviar 60% dos ataques para o honeypot antes que ele esgote sua "vida" |
| Condição de derrota | Servidor de arquivos pessoal infectado por Trojan |

### **Roteiro Educacional — Fase 3**

| 💡 Conceito ensinado: Honeypots são sistemas intencionalmente vulneráveis usados para atrair atacantes. Ao interagir com o honeypot, o atacante revela suas técnicas sem causar dano real. São ferramentas de threat intelligence — aprender com o inimigo. |
| :---- |

* **Após o honeypot absorver ataques, ele gera um "relatório de inteligência" mostrando quais portas o atacante preferiu — o jogador pode usar isso para reconfigurar o firewall.** Mecânica especial:

* **Cinemática curta mostrando o técnico: "Você protegeu sua casa. Mas e se fosse uma empresa inteira?"** Encerramento do Arco 1:

# **3\. Arco 2 — Rede Corporativa**

*Cenário: Empresa de Médio Porte / E-commerce  |  Fases 4 a 7  |  Dificuldade: ★★★☆☆ a ★★★★☆*

O jogador agora é analista de segurança de uma empresa. A rede é mais complexa, há funcionários gerando tráfego legítimo o tempo todo, e o servidor de banco de dados é crítico — se cair, é game over.

## **Fase 4 — "Bem-vindo à Empresa"**

| Aspecto | Detalhes |
| :---- | :---- |
| Rede | Escritório: roteador, switch, 10 computadores de funcionários, servidor web, servidor de e-mail |
| Objetivo | Segmentar a rede usando o switch — criar VLANs para isolar setores |
| Ameaças | Phishing via e-mail (pacote disfarçado de legítimo), DDoS no servidor web |
| Ferramentas | Firewall avançado (regras por IP/segmento) \+ IDS nível 2 (identifica tipo de malware) |
| Novo conceito | Segmentação de rede e DMZ — por que isolar o servidor web dos computadores internos |
| Condição de vitória | Servidor web online por 8 ondas sem que o segmento interno seja comprometido |
| Game over especial | Se o servidor de banco de dados (em segmento crítico) for comprometido |

### **Roteiro Educacional — Fase 4**

| 💡 Conceito ensinado: DMZ (Zona Desmilitarizada) é um segmento de rede que fica entre a internet e a rede interna. Servidores públicos (web, e-mail) ficam na DMZ — se forem comprometidos, o atacante ainda tem uma barreira para chegar à rede interna. É como uma recepção antes do escritório principal. |
| :---- |

* **O jogador arrasta e solta servidores para diferentes segmentos (DMZ, rede interna, segmento crítico) antes de iniciar a fase.** Mecânica nova:

* **Se o jogador colocar o servidor de banco de dados na DMZ, o técnico avisa: "Cuidado\! Banco de dados nunca deve ficar exposto diretamente à internet."** Erro pedagógico intencional:

## **Fase 5 — "O Ransomware Chegou"**

| Aspecto | Detalhes |
| :---- | :---- |
| Rede | Empresa \+ servidor de backup (novo componente desbloqueado) |
| Objetivo | Conter um surto de ransomware antes que atinja o servidor de banco de dados |
| Ameaças | Ransomware em massa — infecta em cadeia se um PC não isolado for comprometido |
| Ferramentas | Todos anteriores \+ capacidade de isolar PCs infectados da rede (quarentena) |
| Novo conceito | Contenção de incidente, isolamento de sistemas infectados, importância de backups |
| Mecânica especial | Servidor de backup restaura um PC infectado após 60 segundos (custo: dinheiro) |
| Condição de vitória | Banco de dados intacto ao fim de 6 ondas |

### **Roteiro Educacional — Fase 5**

| 💡 Conceito ensinado: A resposta a um incidente de ransomware tem 3 fases: Contenção (isolar o que foi infectado), Erradicação (remover o malware) e Recuperação (restaurar de backup). A regra 3-2-1 de backup: 3 cópias dos dados, em 2 mídias diferentes, sendo 1 offsite. |
| :---- |

* **Em determinado ponto da fase, o ransomware tenta se mover lateralmente pela rede. O jogador tem 10 segundos (15 no modo Tranquilo) para cortar a conexão do PC infectado.** Momento dramático:

* **Linha do tempo do incidente mostrando exatamente como o ransomware se propagou — útil para discussão em sala de aula.** Debriefing:

## **Fase 6 — "HTTPS ou Morte"**

| Aspecto | Detalhes |
| :---- | :---- |
| Rede | E-commerce: servidor web de loja virtual com dados de clientes |
| Objetivo | Configurar certificado SSL/TLS no servidor web e detectar ataques Man-in-the-Middle |
| Ameaças | Man-in-the-Middle interceptando transações, pacotes falsificados com cabeçalho HTTP (sem S) |
| Ferramentas | Proxy reverso (novo) \+ IDS nível 2 \+ Firewall |
| Novo conceito | Criptografia em trânsito, SSL/TLS, diferença entre HTTP e HTTPS |
| Mecânica especial | Pacotes HTTPS aparecem "fechados" (cadeado); pacotes HTTP aparecem "abertos" — visualmente distintos |
| Condição de vitória | 0 transações de clientes interceptadas em 5 ondas |

### **Roteiro Educacional — Fase 6**

| 💡 Conceito ensinado: HTTPS usa TLS para criptografar o canal entre cliente e servidor. Sem isso, qualquer pessoa na mesma rede pode interceptar senhas e dados de cartão de crédito. O cadeado no navegador não é cosmético — é a diferença entre dados públicos e privados. |
| :---- |

## **Fase 7 — "IDS no Limite"**

| Aspecto | Detalhes |
| :---- | :---- |
| Rede | Empresa completa de Arco 2 com todas as ferramentas disponíveis |
| Objetivo | Sobreviver a uma onda de ataques mistos usando IDS nível 3 \+ todas as defesas |
| Ameaças | Mix de todos os malwares anteriores \+ primeiro APT (fica dormente, ataca no momento errado) |
| Ferramentas | Arsenal completo do Arco 2 \+ IDS nível 3 (bloqueia aleatoriamente malwares) |
| Novo conceito | APT — Ameaça Persistente Avançada; conceito de defesa em profundidade |
| Condição de vitória | Banco de dados intacto; pelo menos 70% dos serviços online ao fim |

### **Roteiro Educacional — Fase 7**

| 💡 Conceito ensinado: APTs (Advanced Persistent Threats) são ataques sofisticados que se infiltram na rede e ficam dormentes por semanas ou meses antes de agir. Defesa em profundidade significa ter múltiplas camadas — se uma falha, a próxima ainda protege. Nenhuma defesa única é suficiente. |
| :---- |

* **"Você protegeu uma empresa. Mas e se os dados em jogo fossem vidas humanas?" — transição para o Arco 3\.** Encerramento do Arco 2:

# **4\. Arco 3 — Infraestrutura Crítica**

*Cenário: Hospital / Banco / Infraestrutura Governamental  |  Fases 8 a 10  |  Dificuldade: ★★★★☆ a ★★★★★*

O jogador agora protege infraestruturas onde falhas têm consequências humanas e societais. As fases são mais longas, os ataques são coordenados e o jogo introduz conceitos de resposta a incidentes e conformidade legal.

## **Fase 8 — "Código Azul" (Hospital)**

| Aspecto | Detalhes |
| :---- | :---- |
| Rede | Hospital: rede clínica (prontuários), rede administrativa, equipamentos médicos IoT em rede separada |
| Objetivo | Proteger o servidor de prontuários e manter equipamentos médicos online durante ataque |
| Ameaças | Ransomware direcionado a hospitais (padrão real), DDoS nos equipamentos IoT, Trojan em admin |
| Ferramentas | Arsenal completo \+ SIEM básico (mostra padrões de ataque em dashboard) |
| Novo conceito | Segurança de dispositivos IoT, LGPD aplicada à saúde, criticidade de sistemas de vida |
| Condição de vitória | Servidor de prontuários e todos os equipamentos médicos online ao fim de 8 ondas |
| Game over especial | Qualquer equipamento médico (marcapasso, ventilador) comprometido \= derrota imediata |

### **Roteiro Educacional — Fase 8**

| 💡 Conceito ensinado: Hospitais são alvos preferenciais de ransomware porque não podem parar. Em 2020, um hospital alemão teve paciente transferida após ataque — ela morreu. Dispositivos IoT médicos raramente têm patches de segurança, criando vetores de ataque críticos. A LGPD exige proteção especial para dados de saúde. |
| :---- |

* **Equipamentos IoT têm uma porta fixa que não pode ser bloqueada (pois precisam se comunicar) — o jogador precisa protegê-los com IPS, não firewall.** Mecânica especial:

## **Fase 9 — "Cofre Digital" (Banco)**

| Aspecto | Detalhes |
| :---- | :---- |
| Rede | Banco: core bancário, ATMs em rede separada, internet banking, SWIFT (transferências internacionais) |
| Objetivo | Proteger o core bancário enquanto mantém ATMs e internet banking funcionando para clientes |
| Ameaças | APT completo (entra dormentemente), fraude via Man-in-the-Middle no internet banking, ataque SWIFT |
| Ferramentas | Arsenal completo \+ autenticação multifator (MFA) como torre defensiva |
| Novo conceito | MFA, princípio do menor privilégio, segmentação extrema, monitoramento de anomalias |
| Condição de vitória | Core bancário intacto; menos de 3 transações fraudulentas completadas |

### **Roteiro Educacional — Fase 9**

| 💡 Conceito ensinado: O ataque ao SWIFT em 2016 desviou US$ 81 milhões do Banco Central de Bangladesh. MFA (autenticação multifator) exige algo que você sabe (senha), algo que você tem (token) e/ou algo que você é (biometria). O princípio do menor privilégio significa que cada sistema acessa apenas o que precisa — nada mais. |
| :---- |

## **Fase 10 — "Operação Última Defesa" (Boss Final)**

| Aspecto | Detalhes |
| :---- | :---- |
| Rede | Infraestrutura governamental: sistema eleitoral, usina de energia, rede de comunicação de emergência |
| Objetivo | Sobreviver a um ataque de estado (APT coordenado) por 10 ondas mantendo todos os 3 sistemas online |
| Ameaças | APT com múltiplos vetores simultâneos, worms autopropagantes, ataque à cadeia de suprimentos |
| Ferramentas | Arsenal completo \+ modo de emergência (sacrifica um sistema para fortalecer os outros) |
| Novo conceito | Guerra cibernética, resiliência de infraestrutura crítica, air gap, incident response completo |
| Condição de vitória | Ao menos 2 dos 3 sistemas críticos online ao fim das 10 ondas |
| Encerramento | Cinemática final com relatório completo de todos os conceitos aprendidos no jogo |

### **Roteiro Educacional — Fase 10**

| 💡 Conceito ensinado: Ataques a infraestruturas críticas são atos de guerra cibernética. O ataque Stuxnet (2010) destruiu centrífugas nucleares iranianas sem disparar um tiro. Air gap é o isolamento físico total de uma rede — o sistema não está conectado à internet de forma alguma. Mesmo assim, o Stuxnet chegou via pendrive. |
| :---- |

# **5\. Sistema de Briefings e Debriefings**

Cada fase possui três momentos educacionais estruturados. Este sistema é o coração do aprendizado do jogo.

## **5.1 Pré-Fase: O Briefing**

Aparece antes de cada fase como uma tela de "Relatório de Inteligência" — simulando o que um analista de segurança real receberia. Contém:

* Contexto do cenário (3-4 linhas narrativas)

* Ameaças identificadas (com ícone e nível de perigo)

* Dica estratégica do técnico (sem dar a resposta — apenas orientação)

* Glossário da fase (2-3 termos novos com definição em 1 linha)

## **5.2 Durante a Fase: Tooltips Contextuais**

* Ao passar o mouse sobre qualquer componente: explicação do que é na vida real.

* Ao clicar em pacote interceptado: detalhes técnicos do ataque (porta, protocolo, tipo de malware).

* Alertas do IDS com explicação: "Este pacote foi marcado como suspeito porque usa porta 445 (SMB) de forma incomum."

* Pop-up educacional em momentos dramáticos: quando um ataque passa pela primeira vez, pausa opcional com explicação.

## **5.3 Pós-Fase: O Debriefing**

Tela de relatório pós-fase com:

* Linha do tempo do ataque — mostrando exatamente como os pacotes se moveram

* Estatísticas: pacotes bloqueados, falsos positivos, custo dos ataques que passaram

* Erros cometidos com explicação educacional (sem punição — apenas aprendizado)

* Conquista desbloqueada \+ mini-artigo sobre o conceito da fase (opcional, leitura voluntária)

* "Sabia que no mundo real..." — fato real relacionado ao ataque da fase

## **5.4 Conquistas Educacionais (por Arco)**

| Conquista | Como desbloquear | Conceito reforçado |
| :---- | :---- | :---- |
| Porteiro Iniciante | Bloquear 100% das portas não utilizadas | Portas de rede |
| Olho de Falcão | Identificar 5 falsos negativos do IDS | Limitações do IDS |
| Arquiteto de Redes | Criar DMZ corretamente na fase 4 | Segmentação |
| Bombeiro Digital | Conter ransomware em menos de 30s | Resposta a incidentes |
| Detetive de Pacotes | Clicar e inspecionar 20 pacotes | Análise de tráfego |
| Guardião do Cofre | Completar fase 9 sem fraudes | Segurança bancária |
| Última Defesa | Completar fase 10 | Defesa em profundidade |

# **6\. Uso em Sala de Aula**

Firewall: A Última Defesa foi projetado para funcionar tanto como jogo individual quanto como ferramenta pedagógica em ambiente educacional.

## **6.1 Sugestão de Sequência Didática**

* **Professor apresenta o conceito da fase (10 min)** Pré-jogo:

* **Alunos jogam individualmente ou em duplas (20-30 min)** Jogo:

* **Professor para a turma e discute um erro comum que todos cometeram (10 min)** Pausa reflexiva:

* **Alunos leem o debriefing e o mini-artigo da conquista (10 min)** Pós-jogo:

* **Quiz rápido de 3 perguntas sobre o conceito da fase (5 min)** Fechamento:

## **6.2 Alinhamento com Conteúdo de Redes**

| Fase | Conteúdo curricular abordado | Nível recomendado |
| :---- | :---- | :---- |
| Fases 1-2 | Modelo OSI camadas 3-4, portas TCP/UDP, firewalls | Técnico em TI, início |
| Fase 3 | Honeypots, threat intelligence, segurança perímetro | Técnico em TI, médio |
| Fases 4-5 | VLANs, DMZ, resposta a incidentes, backup | Técnico em Redes |
| Fase 6 | TLS/SSL, criptografia simétrica e assimétrica | Técnico em Redes |
| Fases 7-8 | APT, IoT security, LGPD, defesa em profundidade | Superior/Pós-técnico |
| Fases 9-10 | Guerra cibernética, frameworks NIST/ISO 27001 | Superior em Segurança |

*Firewall: A Última Defesa — Game Design Document v1.0*