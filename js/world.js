// js/world.js
import { AS, addSprite, addSheetEntity, layout, T, scene } from './engine.js';

export const DISH_PICK_RANGE = 48;                 // jarak ambil
export const IDLE_POS = { col: 17, row: 7.5 };

export const world = {
  tables: [],
  stoves: [],
  counter: null,
  trash: null,
  player: null,
  waiter: null,
  cookingMap: new Map(),
  dishes: [],
  dishSlot: 0,

  // ---- lock & HUD masak ----
  playerLocked: false,
  lockStart: 0,
  lockUntil: 0,
  hudWrap: null,
  hudBar: null,
};


/* Kursi kosmetik di sekitar meja */
function addChairsAround(t,opt){
  const c=t.col, r=t.row, w=t.w||2, h=t.h||1;
  if(opt?.top)    for(let i=0;i<w;i++) addSprite({src:AS.chair,col:c+i,row:r-1});
  if(opt?.bottom) for(let i=0;i<w;i++) addSprite({src:AS.chair,col:c+i,row:r+1});
  if(opt?.left)   for(let i=0;i<h;i++) addSprite({src:AS.chair,col:c-1,row:r+i});
  if(opt?.right)  for(let i=0;i<h;i++) addSprite({src:AS.chair,col:c+w,row:r+i});
}

export function buildWorld(){
  // Meja kecil (tiap meja punya 2 slot atas)
  const tL2 = addSprite({src:AS.table,col:4,row:6,w:2,h:1}); addChairsAround(tL2,{top:true,bottom:true});
  const tL3 = addSprite({src:AS.table,col:4,row:9,w:2,h:1}); addChairsAround(tL3,{top:true,bottom:true});
  const tR2 = addSprite({src:AS.table,col:9,row:6,w:2,h:1}); addChairsAround(tR2,{top:true,bottom:true});
  const tR3 = addSprite({src:AS.table,col:9,row:9,w:2,h:1}); addChairsAround(tR3,{top:true,bottom:true});

  // Counter, kompor, trash
  addSprite({src:AS.tableLongV,col:15,row:3,w:1,h:3});
  const stove1 = addSprite({src:AS.stove,col:16,row:3,w:1,h:1,cursor:'pointer'});
  const stove2 = addSprite({src:AS.stove,col:17,row:3,w:1,h:1,cursor:'pointer'});
  const serveCounter = addSprite({src:AS.tableLongH,col:17,row:7,w:4,h:1});       // <— serving counter
  const trash        = addSprite({src:AS.trash,     col:20,row:8,w:1,h:1,cursor:'pointer'});

  world.stoves  = [stove1, stove2];
  world.counter = serveCounter;   // <— simpan entity-nya
  world.trash   = trash;

  // Entities
  const player = addSheetEntity({src:AS.sheetJamur,col:12,row:6,w:1,h:1,z:5});
  const waiter = addSheetEntity({src:AS.sheetJamur,col:13,row:6,w:1,h:1,z:5});
  world.player = player;
  world.waiter = waiter;

  // Register meja + 2 slot drop di sisi atas
  [tL2,tL3,tR2,tR3].forEach(t=>{
    const dropSpots = [];
    for(let i=0;i<t.w;i++){
      dropSpots.push({ col:t.col+i, row:t.row-1, occupied:false, el:null });
    }
    world.tables.push({ ent:t, w:t.w, h:t.h, dropSpots });
  });

  layout();
}

/* Cari slot meja kosong terdekat (input pixel px,py) */
export function findNearestFreeDropSpot(px,py){
  let best=null, bestD=1e9;
  const tile = T();
  for(const tbl of world.tables){
    for(const spot of tbl.dropSpots){
      if(spot.occupied) continue;
      const sx = (spot.col-0.5)*tile;
      const sy = (spot.row-0.5)*tile;
      const d = Math.hypot(px - sx, py - sy);
      if(d<bestD){ bestD=d; best={tbl, spot, x:sx, y:sy}; }
    }
  }
  return best;
}

/* Tempel sprite dish tepat di posisi pixel (untuk di meja) */
export function placeDishSpriteAt(img, x, y){
  const tile=T();
  const d=new Image();
  d.src=img; d.className='sprite z5';
  d.style.left=(x - tile/2)+'px';
  d.style.top =(y - tile/2)+'px';
  d.style.width=tile+'px'; d.style.height=tile+'px';
  d.style.imageRendering='pixelated';
  scene.appendChild(d);
  return d;
}

