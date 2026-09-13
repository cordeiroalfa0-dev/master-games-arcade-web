# Master Games Arcade Web

Versão Web do Master Games Arcade.

## Objetivo

Migrar o launcher atual para execução no navegador com WebAssembly, preservando ao máximo a interface, imagens, identidade visual, catálogo e experiência original.

## Regra da migração

**Preservar primeiro, limpar depois.** Não redesenhar o launcher nem remover arquivos reutilizáveis sem necessidade.

### Será preservado quando tecnicamente possível

- Interface e layout atuais
- Logos, imagens, capas e fundos
- Cores, fontes e identidade visual
- Menus, botões, textos e animações
- Catálogo e dados reutilizáveis
- Controles e experiência de arcade

### Será substituído somente quando necessário

- MAME nativo `.exe` → emulação WebAssembly
- Electron/IPC → APIs do navegador
- Controles nativos → Keyboard/Gamepad API
- Persistência local nativa → IndexedDB/Cache quando necessário

## Emulador web

A execução principal no navegador usa o core **Arcade do EmulatorJS**, compatível com o
conjunto **FinalBurn Alpha (FBA) v0.2.97.42**. Esse core não é o MAME Plus! 0.168.2:
ROMs precisam pertencer ao conjunto FBA indicado e as BIOS exigidas precisam manter os
nomes esperados pelo core, como `neogeo.zip` e `pgm.zip`. Um ROM set do MAME 0.168.2
pode funcionar no aplicativo nativo, mas não deve ser misturado com o core Arcade web.

O player fornece as BIOS pela opção oficial `EJS_biosUrl`; não copia a mesma BIOS para
pastas internas do FBNeo. Para usar MAME Plus! 0.168.2 de verdade no navegador seria
necessário publicar e manter um build WebAssembly específico desse executável e usar um
ROM set correspondente, em vez do core Arcade atual.

## Hospedagem planejada

Frontend: Vercel.

ROMs: armazenamento separado/CDN, evitando colocar vários GB de ROMs dentro do repositório ou no deploy da Vercel.

## Fonte

O projeto reconstruído enviado anteriormente será usado como referência visual e funcional. O repositório original `master-games-arcade-system` permanece separado e não deve ser alterado durante esta migração.

## BIOS servidas na raiz (mesmo ajuste da Neo Geo para todas)

Toda BIOS é publicada na raiz do site com o nome exato do arquivo
(`/neogeo.zip`, `/pgm.zip`, `/qsound.zip`, ...) através dos rewrites de
`vercel.json` para `/api/bios`. O player usa esse caminho simples em
`EJS_biosUrl` e mantém `EJS_dontExtractBIOS=true`, para o FBNeo fazer o merge
do ZIP com o romset.

- `neogeo.zip` — jogos Neo Geo
- `qsound.zip` — CPS1 com QSound e todos os jogos CPS2 (Street Fighter Alpha,
  Marvel vs. Capcom, Vampire Savior, Dino, Punisher, ...)
- `pgm.zip` — placa PGM/IGS (Martial Masters, Knights of Valour, ...)
- CPS3 (Street Fighter III, JoJo, Warzard) **não** usa BIOS externa: no romset
  MAME/FBNeo o bios da placa já vem dentro do ZIP do próprio jogo. Se o jogo
  não iniciar, falta o set `nocd` completo ou o CHD do CD, não uma BIOS.

## Controles no celular

- Intro: um toque na tela substitui "pressione qualquer tecla".
- Launcher: mini-controle de toque (`web/mobile-nav.js`) que traduz os toques
  em setas, Enter e Escape para a interface original, sem alterá-la.
- Jogo: gamepad virtual do EmulatorJS forçado como ativado em telas de toque,
  com layout de fliperama (alavanca + 6 botões + START e COIN).
