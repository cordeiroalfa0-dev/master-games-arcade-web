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

A execução WebAssembly usa o build standalone do **MAME Plus! 0.168.2**, sem EmulatorJS
ou RetroArch. O artefato é publicado em `web/mame0168/` pelo workflow do GitHub Actions.

## Hospedagem planejada

Frontend: Vercel.

ROMs: armazenamento separado/CDN, evitando colocar vários GB de ROMs dentro do repositório ou no deploy da Vercel.

## Fonte

O projeto reconstruído enviado anteriormente será usado como referência visual e funcional. O repositório original `master-games-arcade-system` permanece separado e não deve ser alterado durante esta migração.
