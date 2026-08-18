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

const pulsoEl = document.getElementById("pulso");
const pulsoStatusEl = document.getElementById("pulso-status");
const pulsoClockEl = document.getElementById("pulso-clock");
const pulsoEventsEl = document.getElementById("pulso-events");

let lastCheckAt = null;
let lastFlowsStamp = "";
let lastFlowIds = new Set();
let ledgerUpdatedLabel = "";
let pulsoEventCount = 0;
let pulsoTimer = null;
let clockTimer = null;

function isEn() {
  return document.documentElement.lang === "en";
}

function formatBogota(date) {
  return new Intl.DateTimeFormat(isEn() ? "en-GB" : "es-CO", {
    timeZone: "America/Bogota",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function eventWhen(at) {
  if (!at) return "";
  const locale = isEn() ? "en-GB" : "es-CO";
  if (/^\d{4}-\d{2}-\d{2}$/.test(at)) {
    return new Intl.DateTimeFormat(locale, {
      timeZone: "America/Bogota",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(`${at}T12:00:00-05:00`));
  }
  return formatBogota(new Date(at));
}

function agoLabel(from) {
  if (!from) return "";
  const sec = Math.max(0, Math.round((Date.now() - from.getTime()) / 1000));
  if (isEn()) {
    if (sec < 60) return `${sec} s ago`;
    return `${Math.floor(sec / 60)} min ago`;
  }
  if (sec < 60) return `hace ${sec} s`;
  return `hace ${Math.floor(sec / 60)} min`;
}

function kindLabel(kind) {
  if (isEn()) {
    if (kind === "desembolso") return "Disbursement";
    if (kind === "credito") return "Credit";
    if (kind === "especie") return "In-kind";
    if (kind === "anuncio") return "Announcement";
    if (kind === "testigo") return "Testimony";
    if (kind === "disputa") return "Dispute";
    return kind || "Record";
  }
  if (kind === "desembolso") return "Desembolso";
  if (kind === "credito") return "Crédito";
  if (kind === "especie") return "En especie";
  if (kind === "anuncio") return "Anuncio";
  if (kind === "testigo") return "Testigo";
  if (kind === "disputa") return "Disputa";
  return kind || "Registro";
}

function renderPulsoEvents(events) {
  if (!pulsoEventsEl) return;
  pulsoEventsEl.replaceChildren();
  const rows = Array.isArray(events) ? [...events].reverse().slice(0, 8) : [];
  for (const event of rows) {
    const li = document.createElement("li");
    const when = document.createElement("div");
    when.className = "when";
    when.textContent = eventWhen(event.at);
    const body = document.createElement("div");
    body.append(
      `${kindLabel(event.kind)} · ${event.origin || (isEn() ? "Origin unnamed" : "Origen no nombrado")} · ${displayValue(event.amount)} · ${displayValue(event.territory)}`,
    );
    if (event.note) {
      const note = document.createElement("div");
      note.className = "pulso-note";
      note.textContent = event.note;
      body.append(note);
    }
    if (event.source?.url) {
      const a = document.createElement("a");
      a.href = event.source.url;
      a.target = "_blank";
      a.rel = "noreferrer";
      a.textContent = event.source.name || "Fuente";
      body.append(" · ");
      body.append(a);
    } else if (event.source?.name) {
      body.append(` · ${event.source.name}`);
    }
    li.append(when, body);
    pulsoEventsEl.append(li);
  }
}

function renderFlowRow(flow, isNew) {
  const tr = document.createElement("tr");
  if (isNew) tr.className = "is-new";
  tr.dataset.id = flow.id;
  tr.append(
    cell(flow.origin),
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
  const noMuni = flows.filter((flow) => !flow.territory || flow.territory.trim() === "—").length;
  const noExec = flows.filter((flow) => !flow.executed || flow.executed.trim() === "—").length;
  line.textContent = isEn()
    ? `Of ${n} sourced rows, ${noMuni} still name no municipality. ${noExec} have no verified execution.`
    : `De ${n} líneas con fuente, ${noMuni} aún no nombran municipio. ${noExec} no tienen ejecución verificada.`;
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

async function loadPulso() {
  const res = await fetch(`data/pulso.json?t=${Date.now()}`, { cache: "no-store" });
  return res.json();
}

function setPulsoStatus(text, live) {
  if (pulsoStatusEl) pulsoStatusEl.textContent = text;
  pulsoEl?.classList.toggle("is-live", live);
  pulsoEl?.classList.toggle("is-stale", !live);
}

function tickClock() {
  if (!pulsoClockEl || !lastCheckAt) return;
  const ledger = ledgerUpdatedLabel
    ? isEn()
      ? `Figures with a source as of ${ledgerUpdatedLabel}.`
      : `Cifras con fuente al ${ledgerUpdatedLabel}.`
    : "";
  let novedad;
  if (pulsoEventCount === 0) {
    novedad = isEn()
      ? "The ledger contains no verified disbursements."
      : "El tablero no contiene desembolsos verificados.";
  } else if (pulsoEventCount === 1) {
    novedad = isEn() ? "1 record in the ledger." : "1 registro en el tablero.";
  } else {
    novedad = isEn()
      ? `${pulsoEventCount} records in the ledger.`
      : `${pulsoEventCount} registros en el tablero.`;
  }
  const read = isEn() ? "Read" : "Leído";
  pulsoClockEl.textContent = `${read} ${agoLabel(lastCheckAt)} (${formatBogota(lastCheckAt)}). ${ledger} ${novedad}`.trim();
}

async function verifyAid() {
  try {
    const [pulso, ledger] = await Promise.all([loadPulso(), loadFlows()]);
    lastCheckAt = new Date();
    const events = pulso.events || [];
    pulsoEventCount = events.length;
    ledgerUpdatedLabel = pulso.ledgerUpdated || ledger?.updated || "";
    renderPulsoEvents(events);
    setPulsoStatus(
      isEn()
        ? "Aid to Colombia. Record reread every 60 s. No source, no figure."
        : "Ayuda a Colombia. Lectura del registro cada 60 s. Sin fuente, no entra cifra.",
      true,
    );
    tickClock();
  } catch {
    setPulsoStatus(
      isEn()
        ? "The record could not be read. No figure is shown without a source."
        : "No se pudo leer el registro. No se muestra ninguna cifra sin fuente.",
      false,
    );
    if (pulsoClockEl && lastCheckAt) {
      pulsoClockEl.textContent = `Última lectura válida ${agoLabel(lastCheckAt)}.`;
    }
  }
}

function startPulso() {
  verifyAid();
  if (pulsoTimer) clearInterval(pulsoTimer);
  if (clockTimer) clearInterval(clockTimer);
  pulsoTimer = setInterval(verifyAid, 60 * 1000);
  clockTimer = setInterval(tickClock, 1000);
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
        : "Sin URL no entra cifra. El testigo puede ir sin URL; el anuncio no.";
      return;
    }
    const day = new Date().toISOString().slice(0, 10);
    const record = {
      id: `evt-${day}-${kind}`,
      at: day,
      kind,
      origin: String(data.get("origin") || "").trim(),
      amount: String(data.get("amount") || "").trim() || "—",
      territory: String(data.get("territory") || "").trim(),
      note: String(data.get("note") || "").trim(),
      source: url
        ? { name: "Aporte ciudadano", url }
        : { name: "Testigo de territorio — no certifica desembolso" },
    };
    const text = `${JSON.stringify(record, null, 2)}\n`;
    ayudaOut.hidden = false;
    ayudaOut.textContent = text;
    try {
      await navigator.clipboard.writeText(text);
      ayudaStatus.textContent = isEn()
        ? "Record copied. It is proposed in data/pulso.json. This record does not imply or certify a transfer."
        : "Registro copiado. Se propone en data/pulso.json. Este registro no implica ni certifica un giro.";
    } catch {
      ayudaStatus.textContent = isEn()
        ? "Copy the record below."
        : "Copia el registro de abajo.";
    }
  });
}
