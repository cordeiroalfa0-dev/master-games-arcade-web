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

A execução WebAssembly usa o EmulatorJS/MAME no navegador.

Nesta etapa, quando o usuário inicia um jogo, o navegador solicita a ROM localmente e o arquivo selecionado é entregue ao núcleo MAME WebAssembly. Isso permite validar a execução sem colocar os aproximadamente 3 GB de ROMs no Vercel.

## Próxima etapa

Depois de validar a integração com a interface original, a próxima etapa é substituir a seleção manual por uma origem externa de ROMs/CDN/storage, mantendo o catálogo e sem transferir vários gigabytes para o repositório ou para o deploy da Vercel.
