/* ===== Basic Engine (grid, sprites, collision) ===== */
export const COLS = 20;
export const stage = document.getElementById('stage');
export const scene = document.getElementById('scene');
export const AS = window.ASSETS;

export const items = []; // all things with el
export let colliders = [];

export const T = () => stage.clientWidth / COLS;

export function addLabel(txt,c,r){
  const e=document.createElement('div');
  e.className='label'; e.textContent=txt;
  scene.appendChild(e);
  items.push({el:e,col:c,row:r,w:0,h:0,z:9,isLabel:true});
  return e;
}

export function addSprite({src,col,row,w=1,h=1,z=2, cursor=null}){
  const el=new Image();
  el.className=`sprite z${z}`; el.src=src;
  if(cursor) el.style.cursor=cursor;
  scene.appendChild(el);
  const r={el,col,row,w,h,z,isLabel:false,isPlayer:false,isSheet:false};
  items.push(r); return r;
}

const SHEET={cols:5,rows:5,frames:4,fps:10,rowDown:1,rowLeft:1,rowRight:2,rowUp:2};
export function addSheetEntity({src,col,row,w=1,h=1,z=5}){
  const el=document.createElement('div'); el.className=`sprite z${z}`;
  el.style.backgroundImage=`url("${src}")`; el.style.backgroundRepeat='no-repeat'; el.style.imageRendering='pixelated';
  scene.appendChild(el);
  const rec={el,col,row,w,h,z,isLabel:false,isPlayer:true,isSheet:true,sheet:SHEET,dir:'down',frame:0};
  items.push(rec); return rec;
}
function applyBGSize(ent){
  const tile=T(); ent.el.style.width=(ent.w*tile)+'px'; ent.el.style.height=(ent.h*tile)+'px';
  ent.el.style.backgroundSize=`${ent.sheet.cols*100}% ${ent.sheet.rows*100}%`;
}
export function setFrame(ent,frame,dirRow){
  const xPct=(frame/(ent.sheet.cols-1))*100;
  const yPct=(dirRow/(ent.sheet.rows-1))*100;
  ent.el.style.backgroundPosition = `${xPct}% ${yPct}%`;
}

export function layout(){
  const tile=T(); document.documentElement.style.setProperty('--tile',tile+'px');
  for(const it of items){
    const x=(it.col-1)*tile, y=(it.row-1)*tile;
    if(it.isLabel){ it.el.style.left=(x-10)+'px'; it.el.style.top=(y-20)+'px'; continue; }
    it.el.style.left=x+'px'; it.el.style.top=y+'px';
    it.el.style.width=(it.w*tile)+'px'; it.el.style.height=(it.h*tile)+'px'; it.el.style.zIndex=it.z;
    if(it.isSheet) applyBGSize(it);
  }
  rebuildColliders();
}

export const wallEl=document.querySelector('.wall');
export function rebuildColliders(){
  colliders = items.filter(it=>!it.isLabel && !it.isPlayer);
  if(wallEl) colliders.push({el:wallEl});
}
export const rect=r=>({x:r.el.offsetLeft,y:r.el.offsetTop,w:r.el.clientWidth,h:r.el.clientHeight});

/* robust centerOf (hindari 0,0) */
export function centerOf(el){
  const sceneRect = scene.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  if (r.width > 0 && r.height > 0) {
    return { x: r.left - sceneRect.left + r.width/2,
             y: r.top  - sceneRect.top  + r.height/2 };
  }
  const left = parseFloat(el.style.left || '0');
  const top  = parseFloat(el.style.top  || '0');
  const w    = parseFloat(el.style.width || el.clientWidth || 0);
  const h    = parseFloat(el.style.height|| el.clientHeight|| 0);
  return { x: left + w/2, y: top + h/2 };
}

export function tileCenter(col,row){
  const tile=T(); return { x:(col-0.5)*tile, y:(row-0.5)*tile };
}
export const dist = (a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

export function willCollide(nx,ny,pw,ph){
  for(const c of colliders){
    const r=rect(c);
    const overlap=!(nx+pw<=r.x||nx>=r.x+r.w||ny+ph<=r.y||ny>=r.y+r.h);
    if(overlap) return true;
  }
  return false;
}
export function tryMove(ent, dx, dy, speed, dt){
  const pw=ent.el.clientWidth, ph=ent.el.clientHeight;
  let nx=ent.el.offsetLeft+dx*speed*dt;
  let ny=ent.el.offsetTop +dy*speed*dt;
  nx=Math.max(0,Math.min(stage.clientWidth -pw,nx));
  ny=Math.max(0,Math.min(stage.clientHeight-ph,ny));
  if(!willCollide(nx,ny,pw,ph)){ ent.el.style.left=nx+'px'; ent.el.style.top=ny+'px'; return true; }
  return false;
}
export function moveSmart(ent, dx, dy, speed, dt){
  if(tryMove(ent,dx,dy,speed,dt)) return true;
  if(Math.abs(dx)>=Math.abs(dy)){ if(tryMove(ent,dx,0,speed,dt)) return true; if(tryMove(ent,0,dy,speed,dt)) return true; }
  else{ if(tryMove(ent,0,dy,speed,dt)) return true; if(tryMove(ent,dx,0,speed,dt)) return true; }
  return false;
}

/* carry icon */
export function attachCarryIcon(ent, imgSrc){
  if(ent.carryEl){ ent.carryEl.remove(); ent.carryEl=null; }
  const c = new Image(); c.className='carry'; c.src=imgSrc;
  ent.el.appendChild(c); ent.carryEl = c;
}
export function clearCarryIcon(ent){
  if(ent.carryEl){ ent.carryEl.remove(); ent.carryEl=null; }
}
