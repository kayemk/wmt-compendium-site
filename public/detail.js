/* global WMT */
const elTitle = document.getElementById("title");
const elMeta = document.getElementById("meta");
const elContent = document.getElementById("content");
const elStatus = document.getElementById("status");

function setStatus(msg) {
  elStatus.textContent = msg;
}

function getIdParam() {
  const url = new URL(window.location.href);
  return url.searchParams.get("id") || "";
}

function pageKind() {
  const p = window.location.pathname.toLowerCase();
  if (p.endsWith("/unit.html")) return "unit";
  if (p.endsWith("/warband.html")) return "warband";
  // fallback
  return "unit";
}

async function main() {
  const id = getIdParam();
  const kind = pageKind();

  if (!id) {
    elTitle.textContent = "Missing id";
    setStatus("Example: ?id=swordsman");
    return;
  }

  setStatus("Loading…");

  const data = await WMT.loadAll();

  if (kind === "unit") {
    const u = data.unitById.get(id);
    if (!u) {
      elTitle.textContent = "Unit not found";
      setStatus(`No unit with id '${id}'.`);
      return;
    }
    document.title = `WMT Unit: ${u.name}`;
    elTitle.textContent = u.name;
    elMeta.textContent = `ID: ${u.id} · Type: ${u.type ?? ""}`;
    elContent.innerHTML = WMT.renderUnitDetail(u, data.warbandById);
  } else {
    const w = data.warbandById.get(id);
    if (!w) {
      elTitle.textContent = "Warband not found";
      setStatus(`No warband with id '${id}'.`);
      return;
    }
    document.title = `WMT Warband: ${w.name}`;
    elTitle.textContent = w.name;
    elMeta.textContent = `ID: ${w.id} · Game: ${w.game ?? ""}`;
    elContent.innerHTML = WMT.renderWarbandDetail(w, data.unitById);
  }

  setStatus("");
}

main().catch(err => {
  console.error(err);
  setStatus(`Error: ${err.message}`);
});
