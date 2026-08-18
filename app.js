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
let pulsoTimer = null;

function isEn() {
  return document.documentElement.lang === "en";
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
  if (isNew) tr.classList.add("is-new");
  if (["ofertas-agregado", "ayuda-bilateral-recibida", "santo-domingo"].includes(flow.id)) {
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
  line.textContent = isEn()
    ? `Almost none of the ${n} sourced figures name the municipality where people are waiting. None certify delivery to homes. Pereira: an aircraft arrival is verified.`
    : `Casi ninguna de las ${n} cifras con fuente nombra el municipio donde la gente espera. Ninguna certifica entrega a las casas. Pereira: sí se verificó la llegada de un avión.`;
}

async function loadFlows(options = {}) {
  const body = document.getElementById("flujos-body");
  if (!body) return;
  const res = await fetch(`data/flujos.json?t=${Date.now()}`, { cache: "no-store" });
  const data = await res.json();
  paintHueco(data.flows || []);
  paintTotals(data.flows || []);
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
  return data;
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
}

function startPulso() {
  verifyAid();
  if (pulsoTimer) clearInterval(pulsoTimer);
  pulsoTimer = setInterval(verifyAid, 60 * 1000);
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
    try {
      await navigator.clipboard.writeText(text);
      ayudaStatus.textContent = isEn()
        ? "Note copied. It does not certify that aid arrived."
        : "Nota copiada. No certifica que la ayuda haya llegado.";
    } catch {
      ayudaStatus.textContent = isEn()
        ? "Copy the note below."
        : "Copia la nota de abajo.";
    }
  });
}
