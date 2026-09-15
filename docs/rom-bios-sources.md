# Fontes públicas consultadas para ROMs e BIOS

## Componentes considerados

A integração usa apenas padrões de código e metadados compatíveis com o projeto web. Nenhuma ROM, BIOS ou firmware de terceiros foi copiada para este repositório.

| Projeto | Uso consultado | Licença/status | Decisão |
|---|---|---|---|
| [EmulatorJS](https://github.com/EmulatorJS/EmulatorJS) | Carregamento web, cores e configuração de BIOS | GPL-3.0 | Manter os assets EmulatorJS já versionados e a configuração FBNeo local. |
| [FBNeo](https://github.com/finalburnneo/FBNeo) | Referência de compatibilidade e estrutura de drivers | Licença própria/múltiplos componentes | Usar como referência técnica; não copiar ROMs nem firmware. |
| [IGIR](https://github.com/emmercm/igir) | Práticas de identificação, verificação e relatórios de coleções | GPL-3.0 | Adaptar apenas a ideia de filtragem, duplicatas e relatórios; não incorporar o aplicativo inteiro. |
| [RetroHub](https://github.com/Ramaerel/RetroHub) | Organização de biblioteca EmulatorJS | Sem licença declarada no GitHub | Não copiar código; usar somente como referência funcional. |
| [retrobios](https://github.com/Abdess/retrobios) | Verificação por plataforma de BIOS/firmware | Sem licença declarada/NOASSERTION | Não copiar pacotes; usar a separação entre verificação e distribuição como princípio. |

## Melhorias trazidas para este projeto

1. Itens `skipDownload` e duplicatas deixam de ser tratados como jogos jogáveis.
2. Duplicatas com `duplicateOf` são resolvidas para o arquivo original.
3. `/api/roms/check?name=...` informa disponibilidade, duplicata, core e BIOS esperada.
4. `/api/bios/status` informa quais BIOS conhecidas estão presentes no manifesto.
5. A API de ROMs agora suporta `HEAD`, `Range`, preflight CORS, extensão validada e nome de arquivo sanitizado.

As ROMs e BIOS continuam em armazenamento externo controlado pelo catálogo do projeto. A presença de um arquivo no manifesto não constitui validação legal de redistribuição; o operador deve possuir os direitos ou dumps autorizados.
