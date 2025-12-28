/* global window */
(() => {
  const DATA_BASE = "https://kayemk.github.io/wmt-compendium-data/api";

  function escapeHtml(s) {
    return (s ?? "").toString()
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalize(s) {
    return (s ?? "").toString().toLowerCase();
  }

  async function loadAll() {
    const [unitsRes, warbandsRes, metaRes] = await Promise.all([
      fetch(`${DATA_BASE}/units.json`, { cache: "no-cache" }),
      fetch(`${DATA_BASE}/warbands.json`, { cache: "no-cache" }),
      fetch(`${DATA_BASE}/index.json`, { cache: "no-cache" }),
    ]);

    if (!unitsRes.ok || !warbandsRes.ok || !metaRes.ok) {
      throw new Error(`Failed to load API: units=${unitsRes.status} warbands=${warbandsRes.status} meta=${metaRes.status}`);
    }

    const units = await unitsRes.json();
    const warbands = await warbandsRes.json();
    const meta = await metaRes.json();

    const warbandById = new Map(warbands.map(w => [w.id, w]));
    const unitById = new Map(units.map(u => [u.id, u]));

    return { units, warbands, meta, warbandById, unitById };
  }

  function warbandNames(ids, warbandById) {
    return (ids || []).map(id => warbandById.get(id)?.name || id);
  }

  function unitNames(ids, unitById) {
    return (ids || []).map(id => unitById.get(id)?.name || id);
  }

  function renderProfileTable(p = {}) {
    const cols = ["M","WS","BS","S","T","W","I","A","Ld","Sv"];
    const cells = cols.map(k => `<td class="small">${escapeHtml(p[k] ?? "")}</td>`).join("");
    const heads = cols.map(k => `<th class="small">${k}</th>`).join("");
    return `
      <div class="tableWrap">
        <table class="compact">
          <thead><tr>${heads}</tr></thead>
          <tbody><tr>${cells}</tr></tbody>
        </table>
      </div>
    `;
  }

  function renderList(items) {
    if (!items || items.length === 0) return `<p class="muted">—</p>`;
    return `<ul>${items.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`;
  }

  function renderUnitDetail(u, warbandById) {
    const warbands = warbandNames(u.warband_ids, warbandById);
    const gold = u?.cost?.gold ?? "";
    const upkeep = u?.cost?.upkeep ?? "";
    const keywords = u.keywords || [];
    const eqStart = u?.equipment?.starting || [];
    const eqOpt = u?.equipment?.options || [];

    const warbandLinks = (u.warband_ids || []).map(id => {
      const name = warbandById.get(id)?.name || id;
      return `<a href="./warband.html?id=${encodeURIComponent(id)}">${escapeHtml(name)}</a>`;
    });

    return `
      <div class="detailGrid">
        <div>
          <h3 class="detailH">${escapeHtml(u.name)} <span class="muted">(${escapeHtml(u.id)})</span></h3>
          <p class="muted">Type: <strong>${escapeHtml(u.type)}</strong></p>
          <p>Cost: <strong>${escapeHtml(gold)}</strong>${upkeep !== "" ? ` · Upkeep: <strong>${escapeHtml(upkeep)}</strong>` : ""}</p>
          <p>Warbands: ${warbandLinks.length ? warbandLinks.join(", ") : `<span class="muted">—</span>`}</p>
        </div>

        <div>
          <h4>Profile</h4>
          ${renderProfileTable(u.profile || {})}
        </div>
      </div>

      <div class="detailGrid">
        <div>
          <h4>Equipment (starting)</h4>
          ${renderList(eqStart)}
        </div>
        <div>
          <h4>Equipment (options)</h4>
          ${renderList(eqOpt)}
        </div>
      </div>

      <div>
        <h4>Keywords</h4>
        ${renderList(keywords)}
      </div>
    `;
  }

  function renderWarbandDetail(w, unitById) {
    const tags = w.tags || [];
    const unitLinks = (w.unit_ids || []).map(id => {
      const name = unitById.get(id)?.name || id;
      return `<a href="./unit.html?id=${encodeURIComponent(id)}">${escapeHtml(name)}</a>`;
    });

    const src = w.source ? `${w.source.name}${w.source.page != null ? `, p. ${w.source.page}` : ""}` : "";

    return `
      <div class="detailGrid">
        <div>
          <h3 class="detailH">${escapeHtml(w.name)} <span class="muted">(${escapeHtml(w.id)})</span></h3>
          <p class="muted">Game: <strong>${escapeHtml(w.game)}</strong></p>
          <p>Source: <strong>${escapeHtml(src)}</strong></p>
          ${w.summary ? `<p>${escapeHtml(w.summary)}</p>` : `<p class="muted">No summary.</p>`}
        </div>
        <div>
          <h4>Tags</h4>
          ${renderList(tags)}
        </div>
      </div>

      <div>
        <h4>Units (${(w.unit_ids || []).length})</h4>
        ${unitLinks.length ? `<p class="wrapLinks">${unitLinks.join(" · ")}</p>` : `<p class="muted">—</p>`}
      </div>
    `;
  }

  window.WMT = {
    DATA_BASE,
    escapeHtml,
    normalize,
    loadAll,
    renderUnitDetail,
    renderWarbandDetail,
  };
})();
