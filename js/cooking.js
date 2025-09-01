// js/cooking.js
import {
  AS, items, T, scene, centerOf, dist,
  attachCarryIcon, clearCarryIcon
} from './engine.js';
import {
  world, DISH_PICK_RANGE,
  findNearestFreeDropSpot, placeDishSpriteAt
} from './world.js';
import { confirmTrash } from './modal.js';

/* ================== ORDERS ================== */
export let orders = [
  { id:1, name:'Nasi Kari',  cookTime:3500, img:AS.menu.nasi_kari },
  { id:2, name:'Mie Goreng', cookTime:3000, img:AS.menu.mie_goreng },
  { id:3, name:'Steak',      cookTime:5000, img:AS.menu.steak },
  { id:4, name:'Sup Jagung', cookTime:2800, img:AS.menu.sup_jagung },
];

export function addOrder({ name, img, cookTime }){
  const newId = (orders.reduce((m,o)=>Math.max(m,o.id),0) || 0) + 1;
  orders.push({ id:newId, name, cookTime, img });
}

/* ================== UTIL: Kunci & HUD Player ================== */
function ensurePlayerHUD(){
  if(world.hudWrap) return;
  const wrap = document.createElement('div');
  wrap.className = 'player-cookwrap';
  const bar = document.createElement('div');
  bar.className = 'player-cookbar';
  wrap.appendChild(bar);
  scene.appendChild(wrap);
  world.hudWrap = wrap;
  world.hudBar  = bar;
}
function lockPlayerFor(ms){
  ensurePlayerHUD();
  const now = performance.now();
  // jika belum terkunci, set start; kalau sudah, extend waktu
  if(!world.playerLocked){
    world.playerLocked = true;
    world.lockStart = now;
    world.lockUntil = now + ms;
  }else{
    world.lockUntil = Math.max(world.lockUntil, now + ms);
  }
  // inisialisasi bar
  world.hudBar.style.transform = 'scaleX(0)';
  positionHUDAbovePlayer(); // posisikan awal
}
function positionHUDAbovePlayer(){
  if(!world.player || !world.hudWrap) return;
  const p = world.player.el;
  world.hudWrap.style.left = p.style.left;
  world.hudWrap.style.top  = (p.offsetTop - 8) + 'px';
  world.hudWrap.style.width= p.style.width || (T()+'px');
}
function updatePlayerHUD(now){
  if(!world.playerLocked || !world.hudBar) return;
  // progress = (now - start) / (lockUntil - start)
  const total = Math.max(1, world.lockUntil - world.lockStart);
  const elapsed = Math.min(total, now - world.lockStart);
  const prog = Math.max(0, Math.min(1, elapsed/total));
  world.hudBar.style.transform = `scaleX(${prog})`;
  // meskipun player terkunci, kita tetap jaga posisi HUD (kalau window di-resize)
  positionHUDAbovePlayer();

  if(now >= world.lockUntil){
    // selesai semua masak → lepas kunci
    world.playerLocked = false;
    world.lockStart = 0; world.lockUntil = 0;
    if(world.hudWrap){ world.hudWrap.remove(); world.hudWrap = null; world.hudBar = null; }
  }
}

/* ================== DISH COUNTER ================== */
export function placeDishOnCounter(order){
  const tile = T();
  const startCol = 17;
  const col = startCol + (world.dishSlot % 4);

  const x = (col-1)*tile;
  const y = (7-1)*tile - tile*0.35;

  const dImg = new Image();
  dImg.src = order.img;
  dImg.className = 'sprite z5';
  dImg.style.left   = x + 'px';
  dImg.style.top    = y + 'px';
  dImg.style.width  = tile + 'px';
  dImg.style.height = tile + 'px';
  dImg.style.imageRendering = 'pixelated';
  dImg.style.cursor = 'pointer';
  scene.appendChild(dImg);

  const ref = { el:dImg, img:order.img, col, row:7, taken:false, x, y };
  world.dishes.push(ref);

  dImg.addEventListener('click', ()=>{
    if(world.player && !world.player.holding){
      attemptPickupDishRef(world.player, ref);
    }
  });

  world.dishSlot = (world.dishSlot + 1) % 4;
}

/* ================== SHEET: PESANAN ================== */
let ordersSheet = null;

function ensureOrdersSheet(){
  if (ordersSheet) return ordersSheet;
  const el = document.createElement('div');
  el.className = 'sheet';
  el.innerHTML = `
    <div class="sheet-frame"></div>
    <div class="sheet-inner">
      <div class="sheet-head">
        <div class="sheet-title">PESANAN</div>
        <button class="sheet-close">✖</button>
      </div>
      <div class="sheet-body" id="ordersBody"></div>
    </div>`;
  document.getElementById('stage').appendChild(el);
  el.querySelector('.sheet-close').addEventListener('click', ()=> el.style.display='none');
  ordersSheet = el;
  return el;
}

function renderOrdersList(into, stoveRec){
  if (!into) return;
  if (orders.length === 0){
    into.innerHTML = `<div style="text-align:center;padding:16px;opacity:.85">Belum ada pesanan.</div>`;
    return;
  }

  const html = `
    <div class="shop-col">
      ${orders.map(o=>`
        <div class="shop-row">
          <div class="shop-left">
            <div class="chip">
              <img class="pix" src="${o.img}" alt="">
            </div>
            <div class="txts">
              <div class="ttl">${o.name}</div>
              <div class="sub">Time : ${(o.cookTime/1000).toFixed(1)}s</div>
            </div>
          </div>
          <button class="buy-btn cook-btn" data-oid="${o.id}">
            <span>COOK</span>
          </button>
        </div>
      `).join('')}
    </div>
  `;
  into.innerHTML = html;

  into.querySelectorAll('.cook-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = parseInt(btn.getAttribute('data-oid'),10);
      const order = orders.find(x=>x.id===id);
      if(!order) return;
      startCooking(stoveRec, order);
      renderOrdersList(into, stoveRec);
    });
  });
}

export function showOrdersFor(stoveRec){
  const sheet = ensureOrdersSheet();
  sheet.querySelector('.sheet-title').textContent = 'PESANAN';
  const body = sheet.querySelector('#ordersBody');
  renderOrdersList(body, stoveRec);
  sheet.style.display = 'block';
}

export function hookStoveClicks(){
  if (!world?.stoves?.length) return;
  world.stoves.forEach(st=>{
    if (st.el.dataset.hookedStove === '1') return;
    st.el.dataset.hookedStove = '1';
    st.el.addEventListener('click', () => showOrdersFor(st));
  });
}

/* ================== COOKING LOOP ================== */
export function startCooking(stoveRec, order){
  if(world.cookingMap.has(stoveRec.el)) return;

  orders = orders.filter(o=>o.id!==order.id);

  const wrap=document.createElement('div'); wrap.className='cookwrap';
  const bar=document.createElement('div');  bar.className='cookbar'; bar.style.transform='scaleX(0)';
  wrap.appendChild(bar);
  stoveRec.el.parentElement.appendChild(wrap);

  wrap.style.left = stoveRec.el.style.left;
  wrap.style.top  = (stoveRec.el.offsetTop-6)+'px';
  wrap.style.width= stoveRec.el.style.width;

  const start = performance.now();
  world.cookingMap.set(stoveRec.el,{start,dur:order.cookTime,bar,wrap,order});

  // ---- kunci player selama masak (boleh banyak kompor; pakai waktu terlama) ----
  lockPlayerFor(order.cookTime);
}

export function updateCooking(t){
  if(world.cookingMap.size){
    for(const [el,info] of Array.from(world.cookingMap.entries())){
      const prog = Math.min(1,(t-info.start)/info.dur);
      info.bar.style.transform=`scaleX(${prog})`;
      info.wrap.style.left = el.style.left;
      info.wrap.style.top  = (el.offsetTop-6)+'px';
      info.wrap.style.width= el.style.width;

      if(prog>=1){
        info.wrap.remove();
        world.cookingMap.delete(el);
        placeDishOnCounter(info.order);
      }
    }
  }
  // update HUD & buka kunci jika waktunya habis
  updatePlayerHUD(performance.now());
}

/* ================== PLAYER INTERAKSI ================== */
function attemptPickupDishRef(ent, d){
  if(!d || d.taken || !d.el || !d.el.isConnected) return false;
  const ec = centerOf(ent.el);
  const dc = centerOf(d.el);
  if(dist(ec, dc) <= DISH_PICK_RANGE){
    d.taken = true;
    d.el.remove();
    ent.holding = { img: d.img };
    attachCarryIcon(ent, d.img);
    return true;
  }
  return false;
}

function findNearestAvailableDishFrom(px,py){
  let best=null, bestD=1e9;
  for(const d of world.dishes){
    if(d.taken || !d.el || !d.el.isConnected) continue;
    const dc = centerOf(d.el);
    const dd = Math.hypot(px - dc.x, py - dc.y);
    if(dd<bestD){ bestD=dd; best=d; }
  }
  return best;
}

async function attemptDropNearest(ent){
  if(!ent.holding) return false;
  const pc = centerOf(ent.el);
  const target = findNearestFreeDropSpot(pc.x, pc.y);
  if(target && dist(pc, {x:target.x,y:target.y}) <= DISH_PICK_RANGE+12){
    const dishEl = placeDishSpriteAt(ent.holding.img, target.x, target.y);
    target.spot.occupied = true;
    target.spot.el = dishEl;
    ent.holding = null;
    clearCarryIcon(ent);
    return true;
  }

  // dekat trash → konfirmasi
  const trashEnt = world.trash;
  if(trashEnt){
    const tc = centerOf(trashEnt.el);
    if(dist(pc, tc) <= DISH_PICK_RANGE+10){
      const ok = await confirmTrash('Apakah yakin masukkan ke tempat sampah?');
      if(ok){ ent.holding = null; clearCarryIcon(ent); }
      return ok;
    }
  }
  return false;
}

let lastInteract=0;
export function setupPlayerInteraction(){
  window.addEventListener('keydown', async (e)=>{
    const key=e.key.toLowerCase();
    const now = performance.now();
    if(now - lastInteract < 120) return;
    if(key!=='e' && key!=='q') return;
    lastInteract = now;

    const p = world.player;

    if(key==='e' && !p.holding){
      const pc = centerOf(p.el);
      const best = findNearestAvailableDishFrom(pc.x, pc.y);
      if(best) attemptPickupDishRef(p, best);
      return;
    }
    if(key==='q' && p.holding){
      await attemptDropNearest(p);
    }
  });

  // Klik player → toggle ambil/taruh
  world.player.el.addEventListener('click', async ()=>{
    const p = world.player;
    if(!p.holding){
      const pc = centerOf(p.el);
      const best = findNearestAvailableDishFrom(pc.x, pc.y);
      if(best) attemptPickupDishRef(p, best);
    }else{
      await attemptDropNearest(p);
    }
  });
}

/* ================== TRASH: klik asset untuk buang ================== */
export function initTrashBin(){
  if(!world.trash || !world.trash.el) return;
  if(world.trash.el.dataset.hookedTrash === '1') return;
  world.trash.el.dataset.hookedTrash = '1';
  world.trash.el.style.cursor = 'pointer';

  world.trash.el.addEventListener('click', async (e)=>{
    e.stopPropagation();
    const p = world.player;
    if(!p || !p.holding) return;
    const ok = await confirmTrash('Apakah yakin masukkan ke tempat sampah?');
    if(ok){
      p.holding = null;
      clearCarryIcon(p);
    }
  });
}
