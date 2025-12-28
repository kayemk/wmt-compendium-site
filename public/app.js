/* global WMT */
const els = {
  tabUnits: document.getElementById("tabUnits"),
  tabWarbands: document.getElementById("tabWarbands"),
  panelUnits: document.getElementById("panelUnits"),
  panelWarbands: document.getElementById("panelWarbands"),

  qUnits: document.getElementById("qUnits"),
  qWarbands: document.getElementById("qWarbands"),
  filterWarband: document.getElementById("filterWarband"),
  filterType: document.getElementById("filterType"),
  sortUnits: document.getElementById("sortUnits"),
  sortWarbands: document.getElementById("sortWarbands"),
  resetUnits: document.getElementById("resetUnits"),
  resetWarbands: document.getElementById("resetWarbands"),

  unitsTbody: document.querySelector("#unitsTable tbody"),
  warbandsTbody: document.querySelector("#warbandsTable tbody"),

  status: document.getElementById("status"),

  detail: document.getElementById("detail"),
  detailTitle: document.getElementById("detailTitle"),
  detailContent: document.getElementById("detailContent"),
  detailClose: document.getElementById("detailClose"),
  copyJson: document.getElementById("copyJson"),
  openPage: document.getElementById("openPage"),
};

let units = [];
let warbands = [];
let warbandById = new Map();
let unitById = new Map();

let lastDetailJson = null;

function setStatus(msg) {
  els.status.textContent = msg;
}

function parseSort(value) {
  const [key, dir] = (value || "name:asc").split(":");
  return { key, dir: dir === "desc" ? "desc" : "asc" };
}

function compareString(a, b) {
  return (a ?? "").toString().localeCompare((b ?? "").toString());
}

function openDetail(kind, obj) {
  lastDetailJson = obj;

  if (kind === "unit") {
    els.detailTitle.textContent = `Unit: ${obj.name} (${obj.id})`;
    els.detailContent.innerHTML = WMT.renderUnitDetail(obj, warbandById);
    els.openPage.href = `./unit.html?id=${encodeURIComponent(obj.id)}`;
  } else {
    els.detailTitle.textContent = `Warband: ${obj.name} (${obj.id})`;
    els.detailContent.innerHTML = WMT.renderWarbandDetail(obj, unitById);
    els.openPage.href = `./warband.html?id=${encodeURIComponent(obj.id)}`;
  }

  els.detail.showModal();
}

els.detailClose.addEventListener("click", () => els.detail.close());

els.copyJson.addEventListener("click", async () => {
  if (!lastDetailJson) return;
  const text = JSON.stringify(lastDetailJson, null, 2);
  try {
    await navigator.clipboard.writeText(text);
    setStatus("Copied JSON to clipboard.");
  } catch {
    // fallback
    window.prompt("Copy JSON:", text);
  }
});

function matchesQuery(obj, q) {
  if (!q) return true;
  const hay = [
    obj.id, obj.name, obj.type,
    ...(obj.keywords || []),
    ...(obj.tags || []),
  ].map(WMT.normalize).join(" | ");
  return hay.includes(q);
}

function sortUnitsFn(a, b, sort) {
  if (sort.key === "gold") {
    const av = Number(a?.cost?.gold ?? 0);
    const bv = Number(b?.cost?.gold ?? 0);
    return av - bv;
  }
  if (sort.key === "type") {
    return compareString(a.type, b.type) || compareString(a.name, b.name);
  }
  return compareString(a.name, b.name);
}

function sortWarbandsFn(a, b, sort) {
  if (sort.key === "units") {
    const av = (a.unit_ids || []).length;
    const bv = (b.unit_ids || []).length;
    return av - bv || compareString(a.name, b.name);
  }
  return compareString(a.name, b.name);
}

function renderUnits() {
  const q = WMT.normalize(els.qUnits.value.trim());
  const warbandFilter = els.filterWarband.value;
  const typeFilter = els.filterType.value;
  const sort = parseSort(els.sortUnits.value);

  let rows = units
    .filter(u => matchesQuery(u, q))
    .filter(u => !typeFilter || u.type === typeFilter)
    .filter(u => !warbandFilter || (u.warband_ids || []).includes(warbandFilter));

  rows.sort((a,b) => {
    const v = sortUnitsFn(a,b,sort);
    return sort.dir === "desc" ? -v : v;
  });

  els.unitsTbody.innerHTML = "";

  for (const u of rows) {
    const tr = document.createElement("tr");
    tr.style.cursor = "pointer";
    tr.addEventListener("click", () => openDetail("unit", u));

    const gold = u?.cost?.gold ?? "";
    const wbNames = (u.warband_ids || [])
      .map(id => warbandById.get(id)?.name || id)
      .join(", ");

    const p = u.profile || {};
    const nameLink = `
      <a class="nameLink" href="./unit.html?id=${encodeURIComponent(u.id)}" title="Open shareable page" onclick="event.stopPropagation();">
        ${WMT.escapeHtml(u.name ?? "")}
      </a>
      <br><small class="muted">${WMT.escapeHtml(u.id ?? "")}</small>
    `;

    tr.innerHTML = `
      <td>${nameLink}</td>
      <td>${WMT.escapeHtml(u.type ?? "")}</td>
      <td>${WMT.escapeHtml(gold)}</td>
      <td>${WMT.escapeHtml(wbNames)}</td>
      <td class="small">${WMT.escapeHtml(p.M ?? "")}</td>
      <td class="small">${WMT.escapeHtml(p.WS ?? "")}</td>
      <td class="small">${WMT.escapeHtml(p.BS ?? "")}</td>
      <td class="small">${WMT.escapeHtml(p.S ?? "")}</td>
      <td class="small">${WMT.escapeHtml(p.T ?? "")}</td>
      <td class="small">${WMT.escapeHtml(p.W ?? "")}</td>
      <td class="small">${WMT.escapeHtml(p.I ?? "")}</td>
      <td class="small">${WMT.escapeHtml(p.A ?? "")}</td>
      <td class="small">${WMT.escapeHtml(p.Ld ?? "")}</td>
    `;
    els.unitsTbody.appendChild(tr);
  }

  setStatus(`Units: ${rows.length} / ${units.length}`);
}

function renderWarbands() {
  const q = WMT.normalize(els.qWarbands.value.trim());
  const sort = parseSort(els.sortWarbands.value);

  let rows = warbands
    .filter(w => matchesQuery(w, q));

  rows.sort((a,b) => {
    const v = sortWarbandsFn(a,b,sort);
    return sort.dir === "desc" ? -v : v;
  });

  els.warbandsTbody.innerHTML = "";

  for (const w of rows) {
    const tr = document.createElement("tr");
    tr.style.cursor = "pointer";
    tr.addEventListener("click", () => openDetail("warband", w));

    const tags = (w.tags || []).join(", ");
    const count = (w.unit_ids || []).length;
    const src = w.source ? `${w.source.name}${w.source.page != null ? `, p. ${w.source.page}` : ""}` : "";

    const nameLink = `
      <a class="nameLink" href="./warband.html?id=${encodeURIComponent(w.id)}" title="Open shareable page" onclick="event.stopPropagation();">
        ${WMT.escapeHtml(w.name ?? "")}
      </a>
      <br><small class="muted">${WMT.escapeHtml(w.id ?? "")}</small>
    `;

    tr.innerHTML = `
      <td>${nameLink}</td>
      <td>${count}</td>
      <td>${WMT.escapeHtml(tags)}</td>
      <td>${WMT.escapeHtml(src)}</td>
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
els.sortUnits.addEventListener("change", renderUnits);

els.qWarbands.addEventListener("input", renderWarbands);
els.sortWarbands.addEventListener("change", renderWarbands);

els.resetUnits.addEventListener("click", () => {
  els.qUnits.value = "";
  els.filterWarband.value = "";
  els.filterType.value = "";
  els.sortUnits.value = "name:asc";
  renderUnits();
});

els.resetWarbands.addEventListener("click", () => {
  els.qWarbands.value = "";
  els.sortWarbands.value = "name:asc";
  renderWarbands();
});

async function load() {
  setStatus("Loading data…");

  const data = await WMT.loadAll();
  units = data.units;
  warbands = data.warbands;
  warbandById = data.warbandById;
  unitById = data.unitById;

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

  setStatus(`Loaded: ${data?.meta?.counts?.units ?? units.length} units, ${data?.meta?.counts?.warbands ?? warbands.length} warbands`);
  showUnits();
}

load().catch(err => {
  console.error(err);
  setStatus(`Error: ${err.message}`);
});
