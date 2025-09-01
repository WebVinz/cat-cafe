// js/main.js
import { layout, T, moveSmart, setFrame } from './engine.js';
import { buildWorld, world } from './world.js';
import { hookStoveClicks, updateCooking, setupPlayerInteraction, initTrashBin } from './cooking.js';
import { updateWaiter } from './ai.js';
import { initDockUI } from './ui.js';

const keys = new Set();
window.addEventListener('keydown', e=>{
  const k=e.key.toLowerCase();
  if(['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright'].includes(k)){
    keys.add(k); e.preventDefault();
  }
});
window.addEventListener('keyup', e=> keys.delete(e.key.toLowerCase()));

function loop(t){
  if(!loop.t) loop.t=t;
  const dt=(t-loop.t)/1000; loop.t=t;

  const tile = T();

  /* ===== Player movement (terkunci saat masak) ===== */
  const spP = tile*6;
  let dx=0, dy=0;
  if(!world.playerLocked){
    if(keys.has('a')||keys.has('arrowleft'))  dx-=1;
    if(keys.has('d')||keys.has('arrowright')) dx+=1;
    if(keys.has('w')||keys.has('arrowup'))    dy-=1;
    if(keys.has('s')||keys.has('arrowdown'))  dy+=1;
  }
  if(dx||dy){
    const len=Math.hypot(dx,dy)||1; dx/=len; dy/=len;
    moveSmart(world.player,dx,dy,spP,dt);
    if(Math.abs(dx)>Math.abs(dy)) world.player.dir=dx<0?'left':'right';
    else                          world.player.dir=dy<0?'up':'down';
    world._pacc=(world._pacc||0)+dt;
    const fps = world.player.sheet?.fps||10;
    if(world._pacc>=1/Math.max(1,fps)){
      world._pacc=0;
      const frames = world.player.sheet?.frames||4;
      world.player.frame=(world.player.frame+1)%frames;
    }
  }else{
    world.player.frame=0;
  }
  setFrame(
    world.player,
    world.player.frame,
    {down:world.player.sheet.rowDown,left:world.player.sheet.rowLeft,
     right:world.player.sheet.rowRight,up:world.player.sheet.rowUp}[world.player.dir]
     ?? world.player.sheet.rowDown
  );

  /* ===== Waiter AI ===== */
  updateWaiter(dt);

  /* ===== Cooking (update progress termasuk bar pemain) ===== */
  updateCooking(t);

  requestAnimationFrame(loop);
}

/* ===== Boot ===== */
buildWorld();
layout();
window.addEventListener('resize', layout);

hookStoveClicks();
setupPlayerInteraction();
initTrashBin();
initDockUI();

requestAnimationFrame(loop);
