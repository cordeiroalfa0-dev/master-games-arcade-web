import assert from 'node:assert/strict';
import fs from 'node:fs';

const profiles = JSON.parse(fs.readFileSync(new URL('../difficulty-profiles.generated.json', import.meta.url), 'utf8'));
assert.equal(profiles.schema, 'mga-difficulty-profile-v1');
assert.ok(profiles.total_playable_roms > 0);
assert.ok(profiles.profiles.avsp);
assert.equal(profiles.profiles.avsp.family, 'cps2');
assert.equal(profiles.profiles.avsp.core, 'fbalpha2012_cps2');
assert.equal(profiles.profiles.avsp.bios, 'qsound.zip');
assert.equal(profiles.profiles.avsp.profile.difficulty, 'Easy');
assert.equal(profiles.profiles.avsp.modes.easy.difficulty, 'Easy');
assert.equal(profiles.profiles.avsp.modes.hard.difficulty, 'Hard');
assert.equal(profiles.profiles.avsp.modes.easy.suggested_dips.find((dip) => dip.label === 'Lives').value, '5');
assert.equal(profiles.profiles.avsp.modes.hard.suggested_dips.find((dip) => dip.label === 'Lives').value, '2');
assert.equal(profiles.profiles.avsp.modes.hard.suggested_dips.find((dip) => dip.label === 'Continue').value, 'Disabled');
assert.equal(profiles.profiles.avsp.apply.automatic, false);
console.log(`PASS difficulty-tool: ${profiles.total_playable_roms} perfis; avsp identificado como CPS2`);
