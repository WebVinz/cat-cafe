// js/modal.js
// Popup konfirmasi generik pakai gaya overlay/popup yang sudah ada

let overlayEl = null;

function ensureOverlay() {
  if (overlayEl) return overlayEl;
  const ov = document.createElement('div');
  ov.className = 'sheet-overlay';      // sudah ada stylenya
  ov.style.display = 'none';
  ov.innerHTML = `
    <div class="popup">
      <div class="popup-head">
        <div class="popup-title">CONFIRM</div>
        <button class="sheet-close sm">✖</button>
      </div>
      <div class="popup-body">
        <div class="confirm-wrap">
          <div class="confirm-icon">🗑️</div>
          <div class="confirm-msg">Apakah kamu yakin?</div>
          <div class="btn-row">
            <button class="btn-secondary" data-act="cancel">Batal</button>
            <button class="btn-primary"  data-act="ok">Buang</button>
          </div>
        </div>
      </div>
    </div>`;
  document.getElementById('stage').appendChild(ov);
  overlayEl = ov;
  return ov;
}

/** Tampilkan modal confirm. return Promise<boolean> */
export function confirmTrash(message = 'Apakah yakin masukkan ke tempat sampah?') {
  const ov = ensureOverlay();
  ov.querySelector('.popup-title').textContent = 'KONFIRMASI';
  ov.querySelector('.confirm-msg').textContent = message;

  ov.style.display = 'grid';

  return new Promise(resolve => {
    const onCancel = () => { cleanup(); resolve(false); };
    const onOk     = () => { cleanup(); resolve(true);  };

    const btnCancel = ov.querySelector('[data-act="cancel"]');
    const btnOk     = ov.querySelector('[data-act="ok"]');
    const btnX      = ov.querySelector('.sheet-close');

    function onBackdrop(e){ if(e.target === ov) onCancel(); }
    function onKey(e){ if(e.key === 'Escape') onCancel(); }

    function cleanup(){
      ov.style.display = 'none';
      btnCancel.removeEventListener('click', onCancel);
      btnOk.removeEventListener('click', onOk);
      btnX.removeEventListener('click', onCancel);
      ov.removeEventListener('click', onBackdrop);
      document.removeEventListener('keydown', onKey);
    }

    btnCancel.addEventListener('click', onCancel);
    btnOk.addEventListener('click', onOk);
    btnX.addEventListener('click', onCancel);
    ov.addEventListener('click', onBackdrop);
    document.addEventListener('keydown', onKey);
  });
}
