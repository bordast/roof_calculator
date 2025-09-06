const selectEl = document.getElementById('plateSelect');
const detailsEl = document.getElementById('details');
const roofWidthEl = document.getElementById('roofWidth');
const tolEl = document.getElementById('tolerance');
const resultEl = document.getElementById('calcResult');

let currentUsefulWidth = null;   // U
let currentFullWidth = null;     // F
let currentMaxLength = null;

function getTolerance() {
  const t = parseFloat(tolEl.value);
  if (!Number.isFinite(t) || t < 0) return 0; // védőkorlát
  return t;
}

async function loadDB() {
  try {
    const res = await fetch('db.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Nem sikerült betölteni a db.json-t:', err);
    return [];
  }
}

function fillSelect(plates) {
  plates.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    selectEl.appendChild(opt);
  });
}

function renderDetails(plate) {
  if (!plate) {
    detailsEl.innerHTML = '<div class="muted">Nincs kiválasztva lemez.</div>';
    return;
  }
  detailsEl.innerHTML = `
    <h2>${plate.name}</h2>
    <div><strong>Teljes szélesség (F):</strong> ${plate.fullWidth} m</div>
    <div><strong>Hasznos szélesség (U):</strong> ${plate.usefullWidth} m</div>
    <div><strong>Ajánlott max hossz:</strong> ${plate.recommandedMaxLengt} m</div>
    <div class="muted">Képlet: n = 1 + ceil( max(0, (W - F - T) / U) )</div>
  `;
}

function calcSheetsAcross(W, U, F, T=0.10) {
  if (!Number.isFinite(W) || W <= 0) return null;
  if (!U || !F) return null;
  // Ha 1 db utolsó tábla fullWidth-je + tűrés elég, akkor 1 db
  if (W <= F + T) return 1;
  // Különben először lefoglaljuk az utolsó táblát (F), a maradékot U-val fedjük
  const n = 1 + Math.ceil(Math.max(0, (W - F - T) / U));
  return n;
}

function updateCalc() {
  const W = parseFloat(roofWidthEl.value);
  const T = getTolerance();
  if (!currentUsefulWidth || !currentFullWidth) {
    resultEl.textContent = "Először válassz lemezt.";
    return;
  }
  if (!Number.isFinite(W) || W <= 0) {
    resultEl.textContent = "Írd be a tető szélességét (pozitív szám).";
    return;
  }

  const U = currentUsefulWidth;
  const F = currentFullWidth;

  const n = calcSheetsAcross(W, U, F, T);
  if (n == null) {
    resultEl.textContent = "Hiányzó adatok a számításhoz.";
    return;
  }

  // Informatív visszajelzés: mennyit fedünk és mennyi a maradék
  const covered = (n - 1) * U + F;
  const shortfall = Math.max(0, W - covered);   // ennyivel maradunk rövidek (ha > 0)
  const withinTol = shortfall <= T;

  resultEl.innerHTML = `
    <div><strong>Szükséges lemezek száma:</strong> ${n} db</div>
    <div class="muted">Fedés: ${(covered).toFixed(2)} m, hiány: ${(shortfall).toFixed(2)} m ${withinTol ? '(tűrésen belül)' : '(túllépi a tűrést!)'}</div>
  `;
}

(async function init() {
  const plates = await loadDB();
  fillSelect(plates);

  selectEl.addEventListener('change', () => {
    const chosen = plates.find(p => String(p.id) === selectEl.value);
    renderDetails(chosen);

    if (chosen) {
      currentUsefulWidth = chosen.usefullWidth;       // U
      currentFullWidth   = chosen.fullWidth;          // F
      currentMaxLength   = chosen.recommandedMaxLengt;
      updateCalc();
    }
  });

  roofWidthEl.addEventListener('input', updateCalc);
  tolEl.addEventListener('input', updateCalc);
})();