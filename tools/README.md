# Ferramenta de dificuldade

`difficulty_tool.py` analisa `roms-manifest.json` e `game-titles.json`, identifica a família do jogo, o core e a BIOS esperada e gera perfis sugeridos de modo fácil.

## Uso

Na raiz do projeto:

```bash
python3 tools/difficulty_tool.py generate
python3 tools/difficulty_tool.py inspect avsp
python3 tools/difficulty_tool.py list
```

O comando `generate` cria `difficulty-profiles.generated.json`. Para Alien vs Predator, o perfil é associado ao core `fbalpha2012_cps2` e à BIOS `qsound.zip`.

## Limitação importante

Os perfis descrevem os DIP switches desejados, mas não os aplicam cegamente. A dificuldade, número de vidas e continues variam por driver e por ROM. O core web atual não expõe uma API segura para alterar DIP switches em tempo de execução; aplicar um valor universal poderia causar comportamento incorreto. O arquivo gerado é, portanto, a camada de análise/auditoria para uma futura aplicação por menu de serviço ou core recompilado.

A ferramenta não modifica ROMs nem BIOS.
