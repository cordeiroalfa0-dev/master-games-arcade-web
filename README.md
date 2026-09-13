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
