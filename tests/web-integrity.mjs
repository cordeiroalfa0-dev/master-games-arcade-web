import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const player = fs.readFileSync(path.join(root, 'web/player.html'), 'utf8');
const bridge = fs.readFileSync(path.join(root, 'web/mame-web.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'roms-manifest.json'), 'utf8'));
const titles = JSON.parse(fs.readFileSync(path.join(root, 'game-titles.json'), 'utf8'));

assert.match(player, /EJS_pathtodata=['"]\/web\/emulatorjs-data\//);
assert.match(player, /fbneo|arcade/i);
assert.match(bridge, /\/api\/rom\//);
assert.ok(Array.isArray(manifest.files), 'roms-manifest.json precisa conter files');
assert.ok(manifest.files.length > 0, 'o catálogo não pode estar vazio');
assert.ok(Object.keys(titles).length > 0, 'game-titles.json não pode estar vazio');
assert.ok(fs.existsSync(path.join(root, 'web/emulatorjs-data/loader.js')));
assert.ok(fs.existsSync(path.join(root, 'web/emulatorjs-data/cores/fbneo-wasm.data')));
assert.ok(fs.existsSync(path.join(root, 'web/emulatorjs-data/cores/fbalpha2012_cps2-wasm.data')));
console.log(`PASS web-integrity: ${manifest.files.length} itens no catálogo, ${Object.keys(titles).length} títulos, assets FBNeo presentes`);
