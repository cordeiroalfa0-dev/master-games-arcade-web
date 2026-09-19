import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../web/player.html', import.meta.url), 'utf8');
const early = source.indexOf("const earlySavesButton=document.getElementById('btn-save')");
const firstAwait = source.indexOf('difficulty=await chooseDifficulty');
const laterWire = source.indexOf('// Wire up saves controls');
assert.ok(early >= 0, 'ativação antecipada do botão Saves ausente');
assert.ok(firstAwait >= 0 && early < firstAwait, 'Saves precisa ser ativado antes do primeiro await');
assert.ok(laterWire > early, 'bloco posterior de saves não encontrado');
assert.equal((source.match(/addEventListener\('click',earlyOpenSaves\)/g) || []).length, 1, 'listener do botão Saves duplicado');
assert.match(source, /window\.MGA_refreshSaves=renderSlotsList/);
console.log('PASS saves-regression: botão e janela são ativados antes do primeiro await');
