# Master Games Arcade Web

Camada web do Master Games Arcade, mantendo a interface original e substituindo somente a execução nativa por uma camada compatível com navegador.

## Estado atual

- O launcher original continua sendo usado como interface principal.
- `web/mame-web.js` agora é carregado antes do bundle original em `index.html`.
- As chamadas locais `/api/*` usadas pelo launcher são interceptadas pelo bridge web quando necessário.
- O catálogo de ROMs é exposto em `/roms-catalog.json` através do `roms-manifest.json` do repositório original.
- Os títulos são expostos em `/game-titles.json` através do arquivo original de títulos.
- O repositório original `master-games-arcade-system` permanece separado e não é alterado por esta migração.

## Execução das ROMs

A execução WebAssembly usa o build standalone do **MAME Plus! 0.168.2**, carregado por
`web/mame0168/mame.js`. O player não usa EmulatorJS nem RetroArch.

Quando o usuário inicia um jogo, o navegador baixa a ROM pelo endpoint configurado e a
monta em `/roms` no filesystem virtual do Emscripten. Isso permite manter os
aproximadamente 3 GB de ROMs fora do repositório e do deploy da Vercel.

## Próxima etapa

Depois de validar a integração com a interface original, a próxima etapa é substituir a seleção manual por uma origem externa de ROMs/CDN/storage, mantendo o catálogo e sem transferir vários gigabytes para o repositório ou para o deploy da Vercel.
