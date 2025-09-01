// js/ui.js
import { AS } from './engine.js';
import { addOrder } from './cooking.js'; // ← gunakan helper, bukan import orders

let sheet = null;
let overlay = null;
let toastEl = null;

let hired = { waiter:false, chef:false };

function coinsEl(){ return document.getElementById('coin'); }
function getCoins(){ return parseInt(coinsEl()?.textContent||'0',10) || 0; }
function setCoins(v){ if(coinsEl()) coinsEl().textContent = Math.max(0,v); }

/* ---------- toast ---------- */
function ensureToast(){
  if(toastEl) return toastEl;
  toastEl = document.createElement('div');
  toastEl.className = 'toast';
  document.getElementById('stage').appendChild(toastEl);
  return toastEl;
}
function toast(msg){
  const t = ensureToast();
  t.textContent = msg;
  t.classList.remove('show'); void t.offsetWidth;
  t.classList.add('show');
}

/* ---------- SHEET (panel utama) ---------- */
function ensureSheet(){
  if(sheet) return sheet;
  sheet = document.createElement('div');
  sheet.className = 'sheet';
  sheet.innerHTML = `
    <div class="sheet-frame"></div>
    <div class="sheet-inner">
      <div class="sheet-head">
        <div class="sheet-title">TITLE</div>
        <button class="sheet-close">✖</button>
      </div>
      <div class="sheet-body"></div>
    </div>`;
  document.getElementById('stage').appendChild(sheet);
  sheet.querySelector('.sheet-close').addEventListener('click', closeSheet);
  // klik luar → tutup
  document.addEventListener('click', (e)=>{
    if(!sheet) return;
    const dock = document.querySelector('.dock');
    if(sheet.contains(e.target) || dock.contains(e.target)) return;
    closeSheet();
  });
  return sheet;
}
function openSheet(title, bodyHTML){
  const el = ensureSheet();
  el.querySelector('.sheet-title').textContent = title.toUpperCase();
  el.querySelector('.sheet-body').innerHTML = bodyHTML;
  el.style.display = 'block';
}
function closeSheet(){
  if(sheet) sheet.style.display = 'none';
  closeOverlay();
}

/* ---------- POPUP (overlay kecil) ---------- */
function ensureOverlay(){
  if(overlay) return overlay;
  overlay = document.createElement('div');
  overlay.className = 'sheet-overlay';
  overlay.innerHTML = `
    <div class="popup">
      <div class="popup-head">
        <div class="popup-title">TITLE</div>
        <button class="sheet-close sm">✖</button>
      </div>
      <div class="popup-body"></div>
    </div>`;
  document.getElementById('stage').appendChild(overlay);
  overlay.addEventListener('click',(e)=>{ if(e.target===overlay) closeOverlay(); });
  overlay.querySelector('.sheet-close').addEventListener('click', closeOverlay);
  return overlay;
}
function openOverlay(title, html){
  const ov = ensureOverlay();
  ov.querySelector('.popup-title').textContent = title.toUpperCase();
  ov.querySelector('.popup-body').innerHTML = html;
  ov.style.display = 'grid';
}
function closeOverlay(){ if(overlay) overlay.style.display='none'; }

/* ================== CONTENT RENDERERS ================== */
function renderHire(){
  const WORKER_IMG = AS.workerIcon || AS.sheetJamur; // fallback aman
  return `
    <div class="shop-col">
      ${shopRow({
        icon:`<img src="${WORKER_IMG}" class="pix clean" alt="">`,
        title:'Waiter Noob',
        sub:'Speed : 100',
        price:200,
        cta: hired.waiter ? 'HIRED ✓' : 'BUY',
        data:'hire-waiter',
        disabled: hired.waiter
      })}
      ${shopRow({
        icon:`<img src="${WORKER_IMG}" class="pix clean" alt="">`,
        title:'Chef Noob',
        sub:'Cook : 15s',
        price:200,
        cta: hired.chef ? 'HIRED ✓' : 'BUY',
        data:'hire-chef',
        disabled: hired.chef
      })}
    </div>`;
}

function renderTable(){
  return `
    <div class="shop-col">
      ${shopRow({
        icon:`<img src="${AS.table}" class="pix" alt="">`,
        title:'Table',
        sub:'Price : 20',
        price:20,
        cta:'BUY',
        data:'buy-table'
      })}
      ${shopRow({
        icon:`<img src="${AS.chair}" class="pix" alt="">`,
        title:'Chair',
        sub:'Price : 7',
        price:7,
        cta:'BUY',
        data:'buy-chair'
      })}
    </div>`;
}

function renderMenuGrid(){
  const items = [
    {k:'nasi_kari',  name:'Curry',   img:AS.menu.nasi_kari,  price:30, cook:3500},
    {k:'mie_goreng', name:'Noodles', img:AS.menu.mie_goreng, price:25, cook:3000},
    {k:'steak',      name:'Pizza',   img:AS.menu.steak,      price:30, cook:5000}, // pakai aset yang ada
    {k:'sup_jagung', name:'Soup',    img:AS.menu.sup_jagung, price:20, cook:2800},
  ];
  return `
    <div class="menu-grid">
      ${items.map(it=>`
        <button class="menu-item"
                data-key="${it.k}"
                data-name="${it.name}"
                data-price="${it.price}"
                data-cook="${it.cook}">
          <img src="${it.img}" alt="">
        </button>
      `).join('')}
    </div>
    <div class="hint">Click an item to see details</div>
  `;
}

function renderSettings(){
  return `
    <div class="settings">
      <div class="sec-title">AUDIO</div>
      <div class="slider-row">
        <span class="ico">🎵</span>
        <label>Music Volume</label>
        <input type="range" min="0" max="100" value="70">
      </div>
      <div class="slider-row">
        <span class="ico">🔊</span>
        <label>Sound Effect Volume</label>
        <input type="range" min="0" max="100" value="80">
      </div>

      <div class="sec-title" style="margin-top:14px;">SYSTEM</div>
      <div class="center">
        <button class="btn-primary wide" data-act="save">Save Game</button>
      </div>
    </div>
  `;
}

/* ---------------- small templates ---------------- */
function shopRow({icon,title,sub,price,cta,data,disabled=false}){
  return `
    <div class="shop-row${disabled?' disabled':''}">
      <div class="shop-left">
        <div class="chip">${icon}</div>
        <div class="txts">
          <div class="ttl">${title}</div>
          <div class="sub">${sub}</div>
        </div>
      </div>
      <button class="buy-btn" data-act="${data}" ${disabled?'disabled':''}>
        <span class="coin">🪙</span>
        <span>${cta}</span>
      </button>
    </div>`;
}

/* ================== WIRING ================== */
function wireCommonActions(){
  if(!sheet) return;
  const body = sheet.querySelector('.sheet-body');

  // HIRE
  body.querySelectorAll('[data-act="hire-waiter"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const price = 200; if(getCoins()<price){ toast('Not enough coins'); return; }
      setCoins(getCoins()-price);
      hired.waiter = true; toast('Hired Waiter ✓');
      openSheet('Hire Worker', renderHire()); wireCommonActions();
    });
  });
  body.querySelectorAll('[data-act="hire-chef"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const price = 200; if(getCoins()<price){ toast('Not enough coins'); return; }
      setCoins(getCoins()-price);
      hired.chef = true; toast('Hired Chef ✓');
      openSheet('Hire Worker', renderHire()); wireCommonActions();
    });
  });

  // TABLE SHOP
  body.querySelectorAll('[data-act="buy-table"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{ buyGeneric(20,'Table purchased (mock)'); });
  });
  body.querySelectorAll('[data-act="buy-chair"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{ buyGeneric(7,'Chair purchased (mock)'); });
  });

  // MENU GRID → POPUP detail + BUY
  body.querySelectorAll('.menu-item').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const name = btn.getAttribute('data-name');
      const price = parseInt(btn.getAttribute('data-price'),10);
      const cook = parseInt(btn.getAttribute('data-cook'),10);
      const img = btn.querySelector('img').getAttribute('src');

      openOverlay(name, `
        <div class="menu-popup">
          <img src="${img}" alt="">
          <div class="menu-title">${name}</div>
          <div class="menu-price">${price} COIN</div>
          <button class="btn-primary" data-buy="${name}" data-price="${price}" data-cook="${cook}" data-img="${img}">
            <span class="coin">🪙</span> BUY
          </button>
        </div>
      `);

      const buyBtn = document.querySelector('.sheet-overlay [data-buy]');
      if(buyBtn){
        buyBtn.addEventListener('click', ()=>{
          const p = parseInt(buyBtn.getAttribute('data-price'),10);
          if(getCoins()<p){ toast('Not enough coins'); return; }
          setCoins(getCoins()-p);

          addOrder({
            name: buyBtn.getAttribute('data-buy'),
            img:  buyBtn.getAttribute('data-img'),
            cookTime: parseInt(buyBtn.getAttribute('data-cook'),10)
          });

          toast(`${name} added to orders`);
          closeOverlay();
        }, { once:true });
      }
    });
  });

  // SETTINGS
  body.querySelectorAll('[data-act="save"]').forEach(btn=>{
    btn.addEventListener('click', ()=> toast('Game saved (mock)'));
  });
}

function buyGeneric(price, message){
  if(getCoins()<price){ toast('Not enough coins'); return; }
  setCoins(getCoins()-price);
  toast(message);
}

/* ================== PUBLIC ================== */
export function initDockUI(){
  const btnTable    = document.getElementById('btnTable');
  const btnHire     = document.getElementById('btnHire');
  const btnMenu     = document.getElementById('btnMenu');
  const btnSettings = document.getElementById('btnSettings');

  if(btnTable) btnTable.addEventListener('click',(e)=>{
    e.stopPropagation();
    openSheet('Hire Worker', renderTable()); // sesuai mockup pertama
    wireCommonActions();
  });
  if(btnHire) btnHire.addEventListener('click',(e)=>{
    e.stopPropagation();
    openSheet('Hire Worker', renderHire());
    wireCommonActions();
  });
  if(btnMenu) btnMenu.addEventListener('click',(e)=>{
    e.stopPropagation();
    openSheet('Add Menu', renderMenuGrid());
    wireCommonActions();
  });
  if(btnSettings) btnSettings.addEventListener('click',(e)=>{
    e.stopPropagation();
    openSheet('Settings', renderSettings());
    wireCommonActions();
  });
}
