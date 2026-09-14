/*
 * Master Games Arcade — Gerenciador de controles USB
 *
 * Este módulo NÃO intercepta nem reescreve os eventos dos controles.
 * Ele apenas observa a Gamepad API do navegador e informa quantos
 * controles estão conectados. A entrada continua sendo processada
 * pelo EmulatorJS, que já possui suporte a até 4 jogadores e seleção
 * de gamepads na versão 4.2.3.
 */
(function(){
  'use strict';

  const KEY='mga-gamepads-v1';
  const state={connected:0,players:[]};

  function snapshot(){
    if(!navigator.getGamepads)return [];
    return Array.from(navigator.getGamepads()).filter(Boolean);
  }

  function update(){
    const pads=snapshot();
    state.connected=pads.length;
    state.players=pads.slice(0,4).map((pad,index)=>({
      player:index+1,
      index:pad.index,
      id:pad.id||'Controle USB',
      mapping:pad.mapping||'unknown',
      buttons:pad.buttons?.length||0,
      axes:pad.axes?.length||0
    }));

    try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}
    window.dispatchEvent(new CustomEvent('mga-gamepads-update',{detail:state}));
  }

  window.MGA_Gamepads={
    get:()=>({connected:state.connected,players:state.players.slice()}),
    refresh:update
  };

  window.addEventListener('gamepadconnected',update);
  window.addEventListener('gamepaddisconnected',update);
  window.addEventListener('focus',update);
  setInterval(update,1500);
  update();
})();
