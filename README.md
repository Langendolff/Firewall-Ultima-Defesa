<div align="center">

# 🔥 Firewall: A Última Defesa

**Um tower defense educativo sobre segurança de redes.**

Configure portas, leia o IDS e contenha ataques, da rede de casa até a infraestrutura crítica de um país.

[▶ **Jogar no navegador**](https://firewall-virid.vercel.app)

![Phaser](https://img.shields.io/badge/Phaser-4-8B5CF6?style=flat-square)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)

</div>

## Sobre

Cada fase é uma aula disfarçada de jogo. Você aprende errando: uma porta mal configurada vira um ataque de verdade, e o jogo explica **por que** aquele pacote passou. Antes de cada fase há um briefing com o cenário, as ameaças e um mini-glossário. Depois, um debriefing com o que aconteceu.

## Fases

São 10 fases divididas em 3 arcos, e os conceitos voltam com mais complexidade conforme o jogo avança.

| Arco | Cenário | Fases | O que se aprende |
| --- | --- | --- | --- |
| **1. Fundamentos** | Rede doméstica | 1 a 3 | Portas, firewall allow/block, IDS, falsos positivos, honeypot |
| **2. Corporativo** | Empresa e e-commerce | 4 a 7 | Segmentação e DMZ, ransomware e isolamento, HTTPS e man-in-the-middle, APTs |
| **3. Missão crítica** | Hospital, banco e governo | 8 a 10 | Defesa em profundidade, IoT, fraude bancária, worms, ataques à cadeia de suprimentos |

## Rodando localmente

```bash
npm install
npm run dev      # servidor de desenvolvimento
npm run build    # build de produção em dist/
```

O progresso das fases fica salvo no navegador (`localStorage`).

## Documentação

O roteiro pedagógico completo, com objetivos, ameaças e conceitos de cada fase, está em [`src/data/Firewall_Fases_Roteiro.md`](src/data/Firewall_Fases_Roteiro.md).
