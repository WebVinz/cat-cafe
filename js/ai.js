import { T, moveSmart, setFrame, centerOf, dist, attachCarryIcon, clearCarryIcon } from './engine.js';
import { world, IDLE_POS, findNearestFreeDropSpot, placeDishSpriteAt, DISH_PICK_RANGE } from './world.js';

const waiterState = {
  mode: 'idle',           // 'idle' | 'toDish' | 'toTable' | 'toIdle'
  target: null,           // {x,y}
  targetDish: null,       // ref dish (di counter)
  targetSpot: null        // {tbl, spot, x, y}
};

function setTargetTo(col,row){
  const tile=T();
  waiterState.target = { x:(col-0.5)*tile, y:(row-0.5)*tile };
}
const spW = ()=>T()*3.6*(world.waiterSpeed || 1);

function findNearestAvailableDish(from){
  let best=null, bestD=1e9;
  for(const d of world.dishes){
    if(d.taken) continue;
    if(!d.el || !d.el.isConnected) continue;
    const dc = centerOf(d.el);
    const dd = dist(from, dc);
    if(dd<bestD){ bestD=dd; best=d; }
  }
  return best;
}

export function updateWaiter(dt){
  if(!world.waiterEnabled){ return; } // mati → jangan jalan
  const waiter = world.waiter;

  // Cari pekerjaan (kalau tidak pegang)
  if(!waiter.holding){
    const wc = centerOf(waiter.el);
    const best = findNearestAvailableDish(wc);
    if(best && waiterState.mode!=='toDish'){
      waiterState.mode='toDish';
      waiterState.targetDish=best;
      waiterState.target = centerOf(best.el);
    } else if(!best && waiterState.mode!=='idle' && waiterState.mode!=='toIdle' && waiterState.mode!=='toTable'){
      waiterState.mode='toIdle';
      setTargetTo(IDLE_POS.col, IDLE_POS.row);
    }
  }

  // Kalau sedang pegang tapi belum punya tujuan meja → cari slot kosong
  if(waiter.holding && (!waiterState.targetSpot || waiterState.mode!=='toTable')){
    const wc = centerOf(waiter.el);
    const spot = findNearestFreeDropSpot(wc.x, wc.y);
    if(spot){
      waiterState.mode='toTable';
      waiterState.targetSpot = spot;
      waiterState.target = {x:spot.x, y:spot.y};
    }else{
      waiterState.mode='toIdle';
      setTargetTo(IDLE_POS.col, IDLE_POS.row);
    }
  }

  // Gerak
  if(waiterState.target){
    const cx=waiter.el.offsetLeft+waiter.el.clientWidth/2;
    const cy=waiter.el.offsetTop +waiter.el.clientHeight/2;
    let vx=waiterState.target.x - cx, vy=waiterState.target.y - cy;
    const len=Math.hypot(vx,vy)||1; vx/=len; vy/=len;

    if(Math.abs(vx)>Math.abs(vy)) waiter.dir=vx<0?'left':'right'; else waiter.dir=vy<0?'up':'down';
    moveSmart(waiter, vx, vy, spW(), dt);

    // Pickup berbasis jarak (counter itu collider)
    if(waiterState.mode==='toDish' && waiterState.targetDish){
      const wc = centerOf(waiter.el);
      const d  = waiterState.targetDish;
      if(d && !d.taken && d.el && d.el.isConnected){
        const dc = centerOf(d.el);
        if(dist(wc, dc) <= DISH_PICK_RANGE){
          d.taken = true;
          d.el.remove();
          waiter.holding = { img: d.img };
          attachCarryIcon(waiter, d.img);
          waiterState.targetDish = null;

          const spot = findNearestFreeDropSpot(wc.x, wc.y);
          if(spot){
            waiterState.mode='toTable';
            waiterState.targetSpot = spot;
            waiterState.target = {x:spot.x, y:spot.y};
          }else{
            waiterState.mode='toIdle';
            setTargetTo(IDLE_POS.col, IDLE_POS.row);
          }
        }
      } else {
        // dish invalid → retarget/idle
        const best = findNearestAvailableDish(wc);
        if(best){
          waiterState.targetDish = best;
          waiterState.target = centerOf(best.el);
        }else{
          waiterState.mode='toIdle';
          waiterState.targetDish = null;
          setTargetTo(IDLE_POS.col, IDLE_POS.row);
        }
      }
    } else {
      const arrived = Math.hypot(waiterState.target.x - (waiter.el.offsetLeft+waiter.el.clientWidth/2),
                                 waiterState.target.y - (waiter.el.offsetTop +waiter.el.clientHeight/2)) < 10;
      if(arrived){
        if(waiterState.mode==='toTable' && waiter.holding && waiterState.targetSpot){
          const el = placeDishSpriteAt(waiter.holding.img, waiterState.targetSpot.x, waiterState.targetSpot.y);
          waiterState.targetSpot.spot.occupied = true;
          waiterState.targetSpot.spot.el = el;
          waiter.holding = null; clearCarryIcon(waiter);

          waiterState.mode='toIdle'; waiterState.targetSpot=null;
          setTargetTo(IDLE_POS.col, IDLE_POS.row);
        } else if(waiterState.mode==='toIdle'){
          waiterState.target=null; waiterState.mode='idle';
        }
      }
    }
  }

  // set frame
  const w = world.waiter;
  setFrame(w, w.frame, {down:w.sheet.rowDown,left:w.sheet.rowLeft,right:w.sheet.rowRight,up:w.sheet.rowUp}[w.dir] ?? w.sheet.rowDown);
}

/* ===== API buat UI ===== */
export function setWaiterEnabled(enabled){
  world.waiterEnabled = !!enabled;
  const el = world.waiter?.el;
  if(el){ el.style.display = enabled ? 'block' : 'none'; }
  if(!enabled){
    // reset carry
    if(world.waiter?.holding){ world.waiter.holding=null; clearCarryIcon(world.waiter); }
    waiterState.mode='idle'; waiterState.target=null; waiterState.targetDish=null; waiterState.targetSpot=null;
  }
}
export function setWaiterSpeed(mult=1){
  world.waiterSpeed = Math.max(.5, Math.min(2, Number(mult)||1));
}
