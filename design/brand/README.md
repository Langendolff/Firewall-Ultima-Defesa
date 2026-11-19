# Marca do Firewall

**Ideia:** um pacote (o círculo laranja) parado diante de um muro de tijolos: o firewall
barrando o tráfego, que é a mecânica do jogo. O laranja é o mesmo dos pacotes e botões
do jogo; o tile segue a família de ícones dos outros projetos (TidyFlow, Quitado).

## Arquivos

| Arquivo | Quando usar |
|---|---|
| `firewall-icon.svg` | Ícone principal (1024 px): README, loja, perfil, app |
| `firewall-icon-small.svg` | Até 32 px: favicon, abas, listas. Menos tijolos, maiores |
| `firewall-logo-horizontal.svg` / `.png` | Ícone + nome, em fundo claro |
| `firewall-logo-horizontal-dark.svg` / `.png` | Ícone + nome, em fundo escuro |
| `firewall-banner.svg` | Banner 1280×640 (topo de página, preview social em `public/og-image.png`) |
| `firewall-symbol-color.svg` | Só o símbolo, sem tile, em azul-marinho + laranja |
| `firewall-symbol-black.svg` / `-white.svg` / `-mono-1b2a55.svg` | Uma cor: impressão, carimbo, gravação |

Os textos da logo estão convertidos em curvas: não dependem de fonte instalada.

## Cores

| Cor | HEX | Uso |
|---|---|---|
| Azul (topo do tile) | `#4C7EF3` | gradiente do tile |
| Azul profundo (base do tile) | `#1E3F94` | gradiente do tile |
| Azul-marinho | `#1B2A55` | nome em fundo claro, fundos escuros |
| Laranja | `#F5A623` | o pacote, "A ÚLTIMA DEFESA" em fundo escuro |
| Laranja escuro | `#C17E0F` | "A ÚLTIMA DEFESA" em fundo claro (contraste) |

## Regras

- **Área de respiro:** em volta da logo, deixe livre ao menos a largura de um tijolo
  (≈ 17 % do lado do ícone).
- **Tamanho mínimo:** ícone a partir de 16 px (use `firewall-icon-small.svg` até 32 px);
  logo horizontal a partir de 120 px de largura.
- **Não faça:** trocar a cor do pacote, girar ou distorcer, separar o pacote do muro,
  colocar o tile sobre fundo do mesmo azul sem respiro, refazer o nome em outra fonte.

## Tipografia

Nome: **Baloo 2 ExtraBold**. Subtítulo e textos: **Nunito ExtraBold / SemiBold**. As duas são
do Google Fonts (SIL Open Font License), as mesmas do jogo.

## Gerar de novo

`tools/brand/build_brand.py` desenha todos os SVGs a partir da geometria (tijolos, pacote,
gradiente) e converte os textos em curvas:

```sh
pip install fonttools
# baixe Baloo2[wght].ttf e Nunito[wght].ttf de github.com/google/fonts (pasta ofl/)
# e salve como Baloo2.ttf e Nunito.ttf numa pasta
python tools/brand/build_brand.py <pasta-das-fontes> design/brand
```

Os PNGs (`public/`, `docs/images/icon.png`, `docs/images/banner.png`) saem dos SVGs com
`rsvg-convert`, por exemplo `rsvg-convert -w 512 -h 512 design/brand/firewall-icon.svg -o docs/images/icon.png`.

A busca de marca registrada não foi feita: antes de registrar a marca, faça uma busca no INPI.
