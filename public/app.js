const DATA_BASE = "https://kayemk.github.io/wmt-compendium-data/api";

const els = {
  tabUnits: document.getElementById("tabUnits"),
  tabWarbands: document.getElementById("tabWarbands"),
  panelUnits: document.getElementById("panelUnits"),
  panelWarbands: document.getElementById("panelWarbands"),
  qUnits: document.getElementById("qUnits"),
  qWarbands: document.getElementById("qWarbands"),
  filterWarband: document.getElementById("filterWarband"),
  filterType: document.getElementById("filterType"),
  unitsTbody: document.querySelector("#unitsTable tbody"),
  warbandsTbody: document.querySelector("#warbandsTable tbody"),
  status: document.getElementById("status"),
  detail: document.getElementById("detail"),
  detailTitle: document.getElementById("detailTitle"),
  detailBody: document.getElementById("detailBody"),
  detailClose: document.getElementById("detailClose"),
};

let units = [];
let warbands = [];
let warbandById = new Map();

function setStatus(msg) {
  els.status.textContent = msg;
}

function openDetail(title, obj) {
  els.detailTitle.textContent = title;
  els.detailBody.textContent = JSON.stringify(obj, null, 2);
  els.detail.showModal();
}

els.detailClose.addEventListener("click", () => els.detail.close());

function normalize(s) {
  return (s ?? "").toString().toLowerCase();
}

function matchesQuery(obj, q) {
  if (!q) return true;
  const hay = [
    obj.id, obj.name, obj.type,
    ...(obj.keywords || []),
    ...(obj.tags || []),
  ].map(normalize).join(" | ");
  return hay.includes(q);
}

function renderUnits() {
  const q = normalize(els.qUnits.value.trim());
  const warbandFilter = els.filterWarband.value;
  const typeFilter = els.filterType.value;

  const rows = units
    .filter(u => matchesQuery(u, q))
    .filter(u => !typeFilter || u.type === typeFilter)
    .filter(u => !warbandFilter || (u.warband_ids || []).includes(warbandFilter))
    .sort((a,b) => (a.name || "").localeCompare(b.name || ""));

  els.unitsTbody.innerHTML = "";
  for (const u of rows) {
    const tr = document.createElement("tr");
    tr.style.cursor = "pointer";
    tr.addEventListener("click", () => openDetail(`Unit: ${u.name} (${u.id})`, u));

    const gold = u?.cost?.gold ?? "";
    const wbNames = (u.warband_ids || [])
      .map(id => warbandById.get(id)?.name || id)
      .join(", ");

    const p = u.profile || {};
    tr.innerHTML = `
      <td><strong>${u.name ?? ""}</strong><br><small class="muted">${u.id ?? ""}</small></td>
      <td>${u.type ?? ""}</td>
      <td>${gold}</td>
      <td>${wbNames}</td>
      <td class="small">${p.M ?? ""}</td>
      <td class="small">${p.WS ?? ""}</td>
      <td class="small">${p.BS ?? ""}</td>
      <td class="small">${p.S ?? ""}</td>
      <td class="small">${p.T ?? ""}</td>
      <td class="small">${p.W ?? ""}</td>
      <td class="small">${p.I ?? ""}</td>
      <td class="small">${p.A ?? ""}</td>
      <td class="small">${p.Ld ?? ""}</td>
    `;
    els.unitsTbody.appendChild(tr);
  }

  setStatus(`Units: ${rows.length} / ${units.length}`);
}

function renderWarbands() {
  const q = normalize(els.qWarbands.value.trim());
  const rows = warbands
    .filter(w => matchesQuery(w, q))
    .sort((a,b) => (a.name || "").localeCompare(b.name || ""));

  els.warbandsTbody.innerHTML = "";
  for (const w of rows) {
    const tr = document.createElement("tr");
    tr.style.cursor = "pointer";
    tr.addEventListener("click", () => openDetail(`Warband: ${w.name} (${w.id})`, w));

    const tags = (w.tags || []).join(", ");
    const count = (w.unit_ids || []).length;
    const src = w.source ? `${w.source.name}${w.source.page != null ? `, p. ${w.source.page}` : ""}` : "";

    tr.innerHTML = `
      <td><strong>${w.name ?? ""}</strong><br><small class="muted">${w.id ?? ""}</small></td>
      <td>${count}</td>
      <td>${tags}</td>
      <td>${src}</td>
    `;
    els.warbandsTbody.appendChild(tr);
  }

  setStatus(`Warbands: ${rows.length} / ${warbands.length}`);
}

function showUnits() {
  els.tabUnits.classList.add("active");
  els.tabWarbands.classList.remove("active");
  els.panelUnits.hidden = false;
  els.panelWarbands.hidden = true;
  renderUnits();
}

function showWarbands() {
  els.tabWarbands.classList.add("active");
  els.tabUnits.classList.remove("active");
  els.panelWarbands.hidden = false;
  els.panelUnits.hidden = true;
  renderWarbands();
}

els.tabUnits.addEventListener("click", showUnits);
els.tabWarbands.addEventListener("click", showWarbands);

els.qUnits.addEventListener("input", renderUnits);
els.filterWarband.addEventListener("change", renderUnits);
els.filterType.addEventListener("change", renderUnits);

els.qWarbands.addEventListener("input", renderWarbands);

async function load() {
  setStatus("Loading data…");

  const [unitsRes, warbandsRes, metaRes] = await Promise.all([
    fetch(`${DATA_BASE}/units.json`, { cache: "no-cache" }),
    fetch(`${DATA_BASE}/warbands.json`, { cache: "no-cache" }),
    fetch(`${DATA_BASE}/index.json`, { cache: "no-cache" }),
  ]);

  if (!unitsRes.ok || !warbandsRes.ok || !metaRes.ok) {
    throw new Error(`Failed to load API: units=${unitsRes.status} warbands=${warbandsRes.status} meta=${metaRes.status}`);
  }

  units = await unitsRes.json();
  warbands = await warbandsRes.json();
  const meta = await metaRes.json();

  warbandById = new Map(warbands.map(w => [w.id, w]));

  // Populate warband filter
  const opts = warbands
    .slice()
    .sort((a,b) => (a.name || "").localeCompare(b.name || ""))
    .map(w => {
      const o = document.createElement("option");
      o.value = w.id;
      o.textContent = `${w.name} (${w.id})`;
      return o;
    });

  els.filterWarband.innerHTML = `<option value="">All</option>`;
  for (const o of opts) els.filterWarband.appendChild(o);

  setStatus(`Loaded: ${meta?.counts?.units ?? units.length} units, ${meta?.counts?.warbands ?? warbands.length} warbands`);
  showUnits();
}

load().catch(err => {
  console.error(err);
  setStatus(`Error: ${err.message}`);
});
