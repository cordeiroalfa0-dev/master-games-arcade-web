import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../web/player.html', import.meta.url), 'utf8');
assert.match(source, /@media \(hover:none\) and \(pointer:coarse\)[\s\S]*backdrop-filter:none/);
assert.match(source, /window\.EJS_startOnLoaded=!isTouchDevice/);
assert.match(source, /if\(!isTouchDevice\)setInterval\(/);
assert.match(source, /setTimeout\(\(\)=>loadProgress\(\),isTouchDevice\?3500:2500\)/);
assert.match(source, /\[300,1200\]\.forEach\(ms=>setTimeout\(enableGameAudio,ms\)\)/);
assert.match(source, /\[0,250,1000\]\.forEach\(ms=>setTimeout\(fitMobileGameViewport,ms\)/);
assert.match(source, /if\(!didStart\)showManualStart\(\)/);
console.log('PASS mobile-performance: modo leve e inicialização por toque configurados');
