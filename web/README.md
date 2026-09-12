# Camada WebAssembly

Esta pasta contém somente a camada nova de execução no navegador.

## Teste atual

`/web-emulator.html` carrega uma ROM local no EmulatorJS usando o core MAME via WebAssembly.

A interface principal continua usando os assets e o bundle visual original. A camada WebAssembly será integrada ao botão de jogar depois que o teste isolado for validado.

## Princípio

Não substituir a interface original por uma interface nova. O objetivo é conectar a interface existente ao novo executor web.

## Emulação

O EmulatorJS fornece o carregador e os cores WebAssembly. A documentação/projeto atual mostra `EJS_gameUrl`, `EJS_gameName`, `EJS_core` e `EJS_pathtodata` como pontos de configuração, e o core `mame` está disponível. citeturn0search1turn0search2
