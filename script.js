// script.js
let plates = [];
let selectedPlate = null;

document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector(".plate_type_items");

  fetch("db.json")
    .then(r => r.json())
    .then(data => {
      plates = data || [];
      if (!container) return;

      plates.forEach((item, i) => {
        const btn = document.createElement("button");
        btn.className = "btn btn--pill btn--default--outline";
        btn.textContent = item.name.replace(" Trapézlemez", "");
        btn.addEventListener("click", () => selectPlate(btn, item));
        container.appendChild(btn);

        if (i === 0) selectPlate(btn, item); // első legyen aktív
      });
    })
    .catch(err => console.error("db.json betöltési hiba:", err));
});

function selectPlate(button, item) {
  const container = button.parentElement;
  container.querySelectorAll("button").forEach(b => {
    b.classList.remove("btn--primary--outline");
    b.classList.add("btn--default--outline");
  });
  button.classList.remove("btn--default--outline");
  button.classList.add("btn--primary--outline");
  selectedPlate = item;
}

function mmFromMeters(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 1000) : 0;
}
function mmFromCm(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 10) : 0;
}

window.calc = function calc() {
  const widthEl = document.getElementById("width");
  const lengthEl = document.getElementById("length");
  const tolEl = document.getElementById("tolerance");
  const summary = document.querySelector(".summary");

  if (!summary) return;
  if (!selectedPlate) {
    summary.innerHTML = `<h1>Eredmény</h1><p>Válassz lemezt először.</p>`;
    return;
  }

  const width_m = Number(widthEl?.value || 0);
  const length_m = Number(lengthEl?.value || 0);
  const tol_cm = Number(tolEl?.value || 0);

  if (!(width_m > 0) || !(length_m > 0)) {
    summary.innerHTML = `<h1>Eredmény</h1><p>Add meg a szélességet és a hosszt (m).</p>`;
    return;
  }

  const usefulWidth_mm = Number(selectedPlate.usefullWidth); // db.json mm
  if (!(usefulWidth_mm > 0)) {
    summary.innerHTML = `<h1>Eredmény</h1><p>A kiválasztott lemeznél hiányzik a hasznos szélesség.</p>`;
    return;
  }

  const width_mm = mmFromMeters(width_m);
  const tol_mm = mmFromCm(tol_cm);

  const full = Math.floor(width_mm / usefulWidth_mm);
  const rem = width_mm % usefulWidth_mm;

  const needExtra = rem > 0 && rem > tol_mm ? 1 : 0;
  const sheetsAcross = full + needExtra;

  const maxLen_mm = Number(selectedPlate.recommandedMaxLengt) || 0;
  const length_mm = mmFromMeters(length_m);

  // Hossz irány (opcionális bontás az ajánlott max hossz szerint)
  let segmentsPerSheet = 1;
  if (maxLen_mm > 0 && length_mm > maxLen_mm) {
    segmentsPerSheet = Math.ceil(length_mm / maxLen_mm);
  }

  const totalSheets = sheetsAcross;
  const perSheetLength_m = length_m / segmentsPerSheet;

  // új: csavarok
  const roofArea_m2 = width_m * length_m;
  const screwsNeeded = roofArea_m2 * 6;
  const screwsRounded = Math.ceil(screwsNeeded / 10) * 10;

  summary.innerHTML = `
    <h1>Eredmény</h1>
    <div class="summary__content">
      <div><strong>Kiválasztott lemez:</strong> ${selectedPlate.name}</div>
      <div><strong>Hasznos szélesség:</strong> ${usefulWidth_mm} mm</div>
      <div><strong>Tető szélesség:</strong> ${width_m} m</div>
      <div><strong>Tető hossz:</strong> ${length_m} m</div>
      <div><strong>Tűrés:</strong> ${tol_cm || 0} cm</div>
      <div><strong>Lemezek száma (szélesség mentén):</strong> ${totalSheets} db</div>
      <div><strong>Lemez hossza darabonként:</strong> ${perSheetLength_m.toFixed(2)} m${segmentsPerSheet>1 ? 
        ` ( ${segmentsPerSheet} szegmensre bontva, ajánlott max: ${(maxLen_mm/1000).toFixed(2)} m )` : ''}</div>
      <div><strong>Maradék a szélességen:</strong> ${rem === 0 ? '0 mm' : `${rem} mm`} (tűrés: ${tol_mm} mm)</div>
      <div><strong>Szükséges csavar:</strong> ${screwsRounded} db (≈ ${screwsNeeded.toFixed(0)} db számolva)</div>
    </div>
  `;
};