# Design: Substituir clique-em-pacote por regras + incidentes

Data: 2026-07-16
Status: proposto, aguardando revisão

## Problema

O jogo (10 fases) usa hoje um único loop de interação: pacotes nascem, viajam
pelo mapa via tween, e o jogador precisa clicar nos maliciosos antes que
cheguem ao alvo. Jogando as fases já prontas, ficou claro que esse loop:

- é repetitivo/mecânico (clicar pacote após pacote, sem variar a decisão);
- não parece estratégico (o resultado depende mais de reflexo de clique que
  de leitura da situação ou planejamento);
- interrompe o ritmo — o jogador precisa ficar com atenção/mouse em cima dos
  pacotes o tempo todo, sem poder só observar.

A ideia original do jogador era um tower defense com economia própria
(pontos, torres compráveis, mapa persistente). Ficou definido que **isso não
será feito agora** — a estrutura de 10 fases narrativas roteirizadas
continua. O que muda é o loop de interação *dentro* de cada fase.

## Objetivo

Trocar "clique em cada pacote" por um modelo de duas etapas por onda:

1. **Planejamento** (antes da onda / entre ondas): sem pressão de tempo, o
   jogador configura regras. É aqui que fica toda decisão de alto volume.
2. **Execução travada**: a onda roda sozinha aplicando as regras já
   configuradas. O jogador só é chamado a agir quando surge um **incidente**
   — algo que uma regra simples não resolve sozinho.

Isso é o modelo real de operação de segurança: firewall/IDS/IPS cuidam do
tráfego rotineiro automaticamente; um analista humano só entra quando algo é
sinalizado como anômalo ou não se resolveu sozinho.

### Não-objetivos

- Não é uma reescrita para tower defense com economia (pontos, torres
  posicionáveis, mapa persistente). Essa ideia foi discutida e adiada.
- Não muda o número de fases, a ordem, a história ou as condições de
  vitória/derrota de cada fase.
- Não muda os conceitos educacionais ensinados em cada fase.

## Modelo de regras

Toda fase já tem `portOpen` (abrir/fechar porta) — isso já é uma regra de
planejamento e não muda.

Nova regra genérica: **bloqueio automático por tipo de ameaça**. Quando
ativo para um `kind` (phishing, ddos, ransomware, mitm, trojan, worm...),
qualquer pacote malicioso que o IDS classificar como suspeito (`idsTag ===
'red'`) daquele tipo é bloqueado sozinho, sem clique.

Isso generaliza mecânicas que já existem espalhadas e ad hoc pelo jogo:

| Fase | Mecânica atual | Vira |
| :--- | :--- | :--- |
| 7 | IDS Nível 3 — 40% de auto-bloqueio pra qualquer malicioso | regra global, chance configurável |
| 8 | IPS — 50% de auto-bloqueio só pra ataques nos equipamentos IoT | regra escopada ao `kind: ddos` (a porta fixa) |
| 9 | MFA — 55% de auto-bloqueio só pra fraude (MITM/SWIFT), ligável a qualquer momento | regra escopada a `kind: mitm, swift`, toggle do jogador |
| 10 | Modo de Emergência — 40% de auto-bloqueio nos 2 sistemas não sacrificados, uso único | regra escopada, ativação de uso único (comportamento especial mantido) |

As Fases 4 e 6 hoje não têm nenhum mecanismo de auto-bloqueio — dependem
100% do clique. Sem um substituto, tirar a área clicável dos pacotes as
deixaria indefensáveis (nada pararia um pacote malicioso). Elas **ganham**
a regra de bloqueio automático como parte desta migração, mesmo não tendo
hoje — é a extensão natural da ferramenta que cada uma já introduz (Firewall
Avançado na Fase 4, Proxy Reverso/inspeção de certificado na Fase 6).

A Fase 5 já se encaixa quase sem mudança: todo pacote malicioso lá é
ransomware, e vira infecção (que já é tratada como incidente — contém a
tempo ou se espalha, ver seção seguinte). Não precisa de uma regra nova de
auto-bloqueio; o que ela ganha é só a unificação de UI dos incidentes.

Cada fase continua definindo **quais regras existem e com que força** (isso
já é dado em `PHASE_N` no `gameData.js` — não muda a estrutura de dados,
só como o motor de execução usa esses números).

**Falsos negativos continuam existindo.** Auto-bloqueio só age sobre o que o
IDS marcou vermelho (`idsErrorChance` ainda pode marcar malicioso como
verde). Isso preserva a lição de que o IDS erra — só que agora o erro se
manifesta como "esse pacote passou apesar da regra automática", não como
"você deixou passar clicando devagar".

### Duas fases do jogo, dois modelos de interação

Isso não se aplica igual a todas as 10 fases, e é proposital:

- **Arco 1 — Fundamentos (Fases 1-3)**: continuam como estão hoje. São as
  fases mais curtas (3-5 ondas), o papel delas é ensinar o jogador a
  reconhecer porta/pacote malicioso/IDS na mão antes de confiar em qualquer
  automação — clicar *é* a lição aqui, não um problema a remover. Fase 1
  nem tem pacote malicioso; Fase 2 é literalmente "o IDS erra, inspecione
  antes de confiar"; Fase 3 já é mais sobre posicionar o honeypot que sobre
  clicar.
- **Arco 2 em diante (Fases 4-10)**: ganham o modelo de regras +
  incidentes. Essas são as fases mais longas (5-10 ondas) e onde a maior
  parte do volume de clique repetitivo realmente acontece — é também onde
  o jogo já introduz uma ferramenta nova por fase (DMZ, quarentena, TLS,
  IDS Nível 3, IPS, MFA, Modo de Emergência), que se encaixa naturalmente
  como regra configurável em vez de mecânica solta.

Isso segue a progressão que a história já conta: nas primeiras fases você
aprende a olhar pacote por pacote; a partir da empresa (Fase 4) você passa a
configurar defesas como um analista de verdade faria, e só intervém quando
algo foge da regra.

## Incidentes: a única interação durante a onda

Um **incidente** é uma ameaça que uma regra simples estruturalmente não
resolve:

- **Foge da classificação do IDS de propósito** (APT disfarçado, ataque à
  cadeia de suprimentos) — bloqueio automático por `idsTag==='red'` nunca
  vai pegar isso, porque nunca fica vermelho.
- **Tem estado contínuo que exige uma decisão sob prazo** (worm infectando
  um sistema — contém a tempo ou ele se espalha).

Isso já existe no jogo hoje, só que espalhado e com UI ad hoc por fase:

- APT dormente (Fases 7, 9, 10): pousa no alvo, pulsa, precisa ser clicado
  antes do temporizador estourar.
- Worm em quarentena (Fases 5, 10): infecta um alvo, precisa ser contido
  antes de se espalhar.

**Mudança**: esses casos passam a aparecer numa lista/painel comum de
"Incidentes" na tela (em vez de só um ícone pulsando sobre o pacote no
mapa), com o mesmo clique-para-resolver de hoje. É uma unificação de UI, não
uma mecânica nova — o comportamento por trás (temporizador, contenção,
propagação) não muda.

**Exceção intencional**: o ataque à cadeia de suprimentos (Fase 10) não gera
incidente algum — ele é, por design, indistinguível de tráfego benigno. Não
tem alerta, IDS não marca, nada pulsa. É a lição da fase (nem toda ameaça dá
sinal) e continua sendo um risco residual mesmo com as regras bem
configuradas. Isso é aceito como comportamento correto, não um bug a
corrigir.

## O que muda visualmente (Fases 4-10)

Pacotes continuam nascendo e viajando pelo mapa — isso é o feedback visual
de "a rede está funcionando" e vale a pena manter (é parte do que torna a
tela viva, não do que irrita). O que muda:

- Pacotes comuns (não-incidente) deixam de ter área clicável. Não há mais
  "janela de tempo pra acertar o clique".
- A resolução (bloqueado pela regra / passou e causou consequência) acontece
  no fim da viagem do pacote, automaticamente.
- Controles de velocidade (pausa/normal/rápido) continuam existindo — agora
  servem pra observar no ritmo que o jogador quiser, sem a urgência de
  "preciso ser rápido pra clicar".

## Escopo da migração

O loop de pacote (spawn → tween até IDS → classificar → tween até destino →
resolver) está hoje duplicado, com pequenas variações, nas 10 cenas de fase.
Isso já causou bugs reais por divergência entre cópias (`setupDone` não
resetado só na Fase 6; ícone da zona IoT vazando só na Fase 8). Reescrever
esse loop pra funcionar por regra é o momento certo de extrair a parte comum
pra um módulo compartilhado (proposta: `src/waveEngine.js`), usado pelas
Fases 4-10, cobrindo:

- aplicar a regra de porta (já existe) e a nova regra de auto-bloqueio por
  `kind`;
- tween de spawn → IDS → destino, e resolução automática no fim;
- registro/resolução de incidentes (API simples: `registerIncident(packet,
  {onTimeout, timeoutMs})` / o clique resolve).

Cada cena de fase continua responsável pelo que já é específico dela: quais
alvos existem, o que acontece quando um alvo é atingido (derrota
instantânea, servidor cai temporariamente, contador de fraude, etc.), e
mecânicas próprias de planejamento (arrastar servidor pra DMZ na Fase 4,
MFA/Modo de Emergência).

Fases 1-3 não usam `waveEngine.js` — continuam com o loop atual de clique,
sem mudanças neste trabalho.

**Migração incremental, não tudo de uma vez.** Mesmo limitando a 7 arquivos
(Fases 4-10), é trabalho grande pra uma tacada só. Proposta: migrar a Fase 4
primeiro como prova de conceito (é a primeira do grupo, mais simples que as
fases com múltiplos alvos/incidentes das fases 8-10), validar que o
resultado parece bom jogando, só então migrar o resto na ordem 5→10.

## Fora de escopo desta rodada

- Extrair `waveEngine.js` e migrar as Fases 4-10 é trabalho grande. Este
  documento define a arquitetura-alvo; a ordem exata e o tamanho de cada
  etapa ficam pro plano de implementação (via skill de writing-plans), não
  aqui.
- Fases 1-3 não mudam nesta rodada — se depois de jogar as fases 4-10
  atualizadas o clique ainda incomodar nas 3 primeiras, é uma decisão
  separada (elas são curtas, mas dá pra reavaliar).
