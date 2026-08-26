const GAP = "Información no disponible";

function displayValue(value) {
  if (!value || value === GAP || value.startsWith("Sin fuente")) return "—";
  if (value.startsWith(GAP)) {
    const rest = value.slice(GAP.length).trim();
    return rest ? `— ${rest}` : "—";
  }
  return value.includes(GAP) ? value.replaceAll(GAP, "—") : value;
}

function cell(value, href) {
  const td = document.createElement("td");
  const shown = displayValue(value);
  if (href) {
    const a = document.createElement("a");
    a.href = href;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.textContent = shown;
    td.append(a);
    return td;
  }
  td.textContent = shown;
  if (shown === "—" || shown.startsWith("— ")) td.className = "gap";
  return td;
}

const pulsoStatusEl = document.getElementById("pulso-status");

let lastFlowsStamp = "";
let lastFlowIds = new Set();

function isEn() {
  return document.documentElement.lang === "en";
}

const MESES_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fechaCorta(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  const mes = (isEn() ? MESES_EN : MESES_ES)[Number(m[2]) - 1];
  return `${Number(m[3])} ${mes} ${m[1]}`;
}

function isGap(value) {
  const shown = displayValue(value);
  return shown === "—" || shown.startsWith("— ");
}

function originCell(flow) {
  const td = document.createElement("td");
  const name = document.createElement("div");
  name.textContent = displayValue(flow.origin);
  td.append(name);
  if (flow.status && flow.status.trim() && flow.status.trim() !== "—") {
    const st = document.createElement("div");
    st.className = "sub";
    st.textContent = displayValue(flow.status);
    td.append(st);
  }
  return td;
}

function renderFlowRow(flow, isNew) {
  const tr = document.createElement("tr");
  tr.id = `f-${flow.id}`;
  if (isNew) tr.classList.add("is-new");
  if (["ofertas-agregado", "sector-privado-agregado", "ayuda-bilateral-recibida", "dian-ingreso-aduanero", "cancilleria-especie-25ago", "santo-domingo"].includes(flow.id)) {
    tr.classList.add("is-note");
  }
  tr.dataset.id = flow.id;
  tr.append(
    originCell(flow),
    cell(flow.amount),
    cell(flow.route),
    cell(flow.territory),
    cell(flow.executed),
    flow.source.url ? cell(flow.source.name, flow.source.url) : cell(flow.source.name),
  );
  return tr;
}

function paintHueco(flows) {
  const line = document.getElementById("hueco-linea");
  if (!line || !Array.isArray(flows)) return;
  const n = flows.length;
  const conLugar = flows.filter((flow) => !isGap(flow.territory)).length;
  const sinLugar = n - conLugar;
  line.textContent = isEn()
    ? `${n} figures with a source. ${conLugar} name a place; ${sinLugar} are left as “—”. No source certifies delivery to homes. Pereira: an aircraft arrival is verified.`
    : `${n} cifras con fuente. ${conLugar} nombran un lugar; ${sinLugar} quedan en «—». Ninguna fuente certifica entrega a las casas. Pereira: sí se verificó la llegada de un avión.`;
}

function paintEstado(updated) {
  const el = document.getElementById("estado-registro");
  if (!el) return;
  const fecha = fechaCorta(updated);
  if (!fecha) {
    el.textContent = "";
    return;
  }
  el.textContent = isEn()
    ? `Record as of ${fecha}. Updated by hand, when there is a new source.`
    : `Registro al ${fecha}. Se actualiza a mano, cuando hay una fuente nueva.`;
}

async function loadFlows(options = {}) {
  const body = document.getElementById("flujos-body");
  if (!body) return;
  const res = await fetch(`data/flujos.json?t=${Date.now()}`, { cache: "no-store" });
  const data = await res.json();
  paintHueco(data.flows || []);
  paintTotals(data.flows || []);
  paintEstado(data.updated);
  window.LEDGER_FLOWS = data.flows || [];
  const ids = new Set((data.flows || []).map((flow) => flow.id));
  const stamp = JSON.stringify(data.flows);
  if (!options.force && stamp === lastFlowsStamp && lastFlowIds.size) return data;
  const firstPaint = lastFlowIds.size === 0;
  body.replaceChildren();
  for (const flow of data.flows) {
    const isNew = !firstPaint && !lastFlowIds.has(flow.id);
    body.append(renderFlowRow(flow, isNew));
  }
  lastFlowIds = ids;
  lastFlowsStamp = stamp;
  document.dispatchEvent(new CustomEvent("veeduria:flujos"));
  return data;
}

function cronologiaLine(className, text) {
  const p = document.createElement("p");
  p.className = className;
  p.textContent = text;
  return p;
}

async function loadCronologia() {
  const list = document.getElementById("cronologia-lista");
  if (!list) return;
  const res = await fetch("data/pulso.json", { cache: "no-cache" });
  const data = await res.json();
  const events = [...(data.events || [])].sort((a, b) => String(b.at).localeCompare(String(a.at)));
  list.replaceChildren();
  for (const evt of events) {
    const li = document.createElement("li");
    li.append(cronologiaLine("cron-fecha", fechaCorta(evt.at)));
    li.append(cronologiaLine("cron-que", `${evt.origin} · ${evt.amount}`));
    if (!isGap(evt.territory)) {
      li.append(cronologiaLine("cron-donde", displayValue(evt.territory)));
    }
    if (evt.note) li.append(cronologiaLine("cron-nota", evt.note));
    if (evt.source?.url) {
      const p = document.createElement("p");
      p.className = "cron-fuente";
      const a = document.createElement("a");
      a.href = evt.source.url;
      a.target = "_blank";
      a.rel = "noreferrer";
      a.textContent = evt.source.name || evt.source.url;
      p.append(a);
      li.append(p);
    }
    list.append(li);
  }
}

function setPulsoStatus(text) {
  if (!pulsoStatusEl) return;
  pulsoStatusEl.hidden = !text;
  pulsoStatusEl.textContent = text || "";
}

async function verifyAid() {
  try {
    await loadFlows();
    setPulsoStatus("");
  } catch {
    setPulsoStatus(
      isEn()
        ? "The record could not be read. No figure is shown without a source."
        : "No se pudo leer el registro. No se muestra ninguna cifra sin fuente.",
    );
  }
  try {
    await loadCronologia();
  } catch {
    // Si la cronología falla, el registro sigue en pie: no se borra la tabla por eso.
  }
}

function startPulso() {
  verifyAid();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") verifyAid();
  });
}

startPulso();
document.addEventListener("veeduria:lang", () => {
  verifyAid();
});

const ayudaForm = document.getElementById("form-ayuda");
if (ayudaForm) {
  const ayudaOut = document.getElementById("ayuda-out");
  const ayudaStatus = document.getElementById("ayuda-status");
  ayudaForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(ayudaForm);
    const kind = String(data.get("kind"));
    const url = String(data.get("url") || "").trim();
    const needsUrl = kind !== "testigo" && kind !== "disputa";
    if (needsUrl && !url) {
      ayudaStatus.textContent = isEn()
        ? "Without a URL, no figure is entered. Testimony may go without a URL; an announcement may not."
        : "Sin URL no entra cifra. Un testimonio puede ir sin URL; un anuncio, no.";
      return;
    }
    const kindLabel = ayudaForm.querySelector("[name=kind]")?.selectedOptions?.[0]?.textContent || kind;
    const origin = String(data.get("origin") || "").trim();
    const amount = String(data.get("amount") || "").trim() || "—";
    const territory = String(data.get("territory") || "").trim() || "—";
    const note = String(data.get("note") || "").trim();
    const text = isEn()
      ? `Did it arrive?\n${kindLabel}\nFrom: ${origin}\nAmount: ${amount}\nMunicipality: ${territory}${note ? `\nNote: ${note}` : ""}\nSource: ${url || "—"}\nThis note does not certify that the aid arrived.\n`
      : `¿Llegó?\n${kindLabel}\nOrigen: ${origin}\nMonto: ${amount}\nMunicipio: ${territory}${note ? `\nNota: ${note}` : ""}\nFuente: ${url || "—"}\nEsta nota no certifica que la ayuda haya llegado.\n`;
    ayudaOut.hidden = false;
    ayudaOut.textContent = text;
    const aviso = document.getElementById("aviso-publico");
    if (aviso) {
      const issue = new URL("https://github.com/eliospina/ojo-al-giro/issues/new");
      issue.searchParams.set("title", `${origin || "Aviso"} · ${territory}`);
      issue.searchParams.set("body", text);
      aviso.href = issue.href;
      aviso.hidden = false;
    }
    try {
      await navigator.clipboard.writeText(text);
      ayudaStatus.textContent = isEn()
        ? "Notice copied. You can paste it anywhere, or post it in public view. It does not certify that aid arrived."
        : "Aviso copiado. Puede pegarlo donde quiera, o dejarlo a la vista de todos. No certifica que la ayuda haya llegado.";
    } catch {
      ayudaStatus.textContent = isEn()
        ? "Copy the notice below, or post it in public view."
        : "Copie el aviso de abajo, o déjelo a la vista de todos.";
    }
  });
}
