import fs from 'node:fs';

const source = fs.readFileSync(new URL('../web/player.html', import.meta.url), 'utf8');

const requiredMappings = [
  "2:{value:'shift',value2:'SELECT'}",
  "3:{value:'enter',value2:'START'}",
  "2:{value:'c',value2:'SELECT'}",
  "3:{value:'v',value2:'START'}"
];

for (const mapping of requiredMappings) {
  if (!source.includes(mapping)) throw new Error(`Mapeamento ausente: ${mapping}`);
}

if (source.includes("1:{value:'shift',value2:'SELECT'}")) {
  throw new Error('O jogador 2 não pode compartilhar o crédito do jogador 1');
}

if (source.includes("1:{value:'enter',value2:'START'}")) {
  throw new Error('O jogador 2 não pode compartilhar o start do jogador 1');
}

if (!source.includes("CONTROL_PROFILE_VERSION='mga-players-credits-v2'")) {
  throw new Error('O perfil corrigido não invalida configurações antigas');
}

for (const feature of ["VISUAL_KEY='mga-video-profile-v2'", "pixelEnhancement=true", "'sabr'", "e.key==='F1'"]) {
  if (!source.includes(feature)) throw new Error(`Melhoria visual ausente: ${feature}`);
}

for (const key of ["shift:[0,2]", "enter:[0,3]", "'5':[0,2]", "'1':[0,3]", "c:[1,2]", "v:[1,3]", "'6':[1,2]", "'2':[1,3]"]) {
  if (!source.includes(key)) throw new Error(`Atalho arcade ausente: ${key}`);
}

console.log('PASS player-controls: créditos e starts independentes por jogador');
