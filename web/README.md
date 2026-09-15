# Master Games Arcade Web

Camada web do Master Games Arcade, mantendo a interface original e substituindo a execução nativa por uma camada compatível com navegador.

## Estado atual

- O launcher original continua sendo usado como interface principal.
- `web/mame-web.js` é carregado antes do bundle original em `index.html`.
- As chamadas locais `/api/*` usadas pelo launcher são interceptadas pelo bridge web quando necessário.
- O catálogo é publicado localmente em `/roms-catalog.json`.
- Os títulos amigáveis são publicados localmente em `/game-titles.json`.
- O repositório original `master-games-arcade-system` permanece separado.

## Execução das ROMs

A execução principal usa o **EmulatorJS 4.2.3** com cores WebAssembly do **FBNeo** e do **FBAlpha 2012 CPS2**. Os arquivos do EmulatorJS são self-hosted em `web/emulatorjs-data/`; o CDN oficial é usado apenas como fallback caso um asset local falhe.

As ROMs continuam hospedadas separadamente e são baixadas por meio das APIs `/api/rom`. As BIOS são expostas na raiz com os nomes esperados pelo core, como `neogeo.zip`, usando os rewrites do Vercel. O conjunto de ROMs precisa ser compatível com o core FBNeo; arquivos destinados ao MAME 0.168.2 não devem ser misturados automaticamente.

## Validação

Execute o teste de integridade antes de publicar:

```bash
node tests/web-integrity.mjs
```

Esse teste confirma a presença do player, dos manifestos locais, dos cores FBNeo e das rotas essenciais.

## Melhorias integradas

1. Catálogo local com fallback externo.
2. Mapa local de títulos amigáveis.
3. Timeout de 12 segundos para carregamento de dados.
4. Cache controlado para evitar catálogo desatualizado.
5. Histórico dos jogos recentes no navegador.
6. Favoritos persistidos localmente.
7. API web para consultar favoritos e recentes.
8. Identificação estável de até quatro gamepads.
9. Eventos de conexão, desconexão e retorno da aba para controles.
10. Atalhos F9 para diagnóstico, F11 para tela cheia e Escape para sair do player.
