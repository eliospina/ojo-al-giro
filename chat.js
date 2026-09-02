const AGGREGATE_IDS = new Set([
  "ofertas-agregado",
  "sector-privado-agregado",
  "ayuda-bilateral-recibida",
  "dian-ingreso-aduanero",
  "cancilleria-especie-25ago",
]);
const STOP_WORD = /^(total|suma|cuanto|oferta|ofertas|ayuda|donacion|donaciones|millones|how|much|aggregate|giro|hay|the|for|and)$/;

function fold(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function originCore(flow) {
  return fold(flow.origin || "")
    .split(/[—(]/)[0]
    .replace(/\s+/g, " ")
    .trim();
}

function sumsText() {
  const el = document.getElementById("sums");
  if (!el) return "";
  return [...el.querySelectorAll("li")].map((li) => li.textContent).join("\n");
}

function scoreFlow(flow, q, words) {
  const core = originCore(flow);
  const terr = fold(flow.territory || "").replace(/\s+/g, " ").trim();
  const origin = fold(flow.origin || "");
  let hits = 0;
  if (q.length > 2 && (core === q || terr === q)) hits += 8;
  if (q.length > 3 && (core.startsWith(q) || terr.startsWith(q))) hits += 5;
  for (const w of words) {
    const coreTok = core.split(" ");
    const terrTok = terr.split(/[\s(/]+/);
    if (coreTok.includes(w)) hits += 4;
    else if (coreTok.some((t) => t.length > 3 && w.length > 3 && (t.startsWith(w) || w.startsWith(t)))) hits += 3;
    else if (terrTok.includes(w) || (w.length > 3 && terr.includes(w))) hits += 4;
    else if (!AGGREGATE_IDS.has(flow.id) && w.length > 3 && origin.includes(w)) hits += 3;
    else if (AGGREGATE_IDS.has(flow.id) && origin.includes(w)) hits += 1;
  }
  return hits;
}

function chatReply(question) {
  const q = fold(question).trim();
  const flows = window.LEDGER_FLOWS || [];
  if (!q)
    return isEn()
      ? "Please indicate the municipality or country you wish to consult."
      : "Indique el municipio o el país que desea consultar.";
  if (!flows.length) return isEn() ? "The record has not loaded yet." : "El registro aún no se ha cargado.";

  const words = q.split(/\s+/).filter((w) => w.length > 2 && !STOP_WORD.test(w));
  const scored = flows
    .map((flow) => ({ flow, hits: scoreFlow(flow, q, words) }))
    .filter((row) => row.hits > 0)
    .sort((a, b) => b.hits - a.hits);

  const specific = scored.filter(({ flow, hits }) => !AGGREGATE_IDS.has(flow.id) && hits >= 3);
  const wantsTotal = /(total|suma|\bcuanto\b|how much|aggregate|1\.?300|ofertas?|calculadora)/.test(q);
  if (wantsTotal && !specific.length) {
    const n = document.getElementById("total-n")?.textContent || "—";
    const s = sumsText();
    return isEn()
      ? `USD ${n} million in announced donations. Not disbursed, not delivered.\n${s}`
      : `USD ${n} millones en donaciones anunciadas. No corresponde a recursos girados ni entregados.\n${s}`;
  }

  const pick = (specific.length ? specific : scored).slice(0, 3);
  if (!pick.length) {
    return isEn() ? "It does not appear in this record. —" : "No figura en este registro. —";
  }

  return pick
    .map(({ flow }) => {
      const arrived = typeof displayValue === "function" ? displayValue(flow.executed) : flow.executed || "—";
      const src = flow.source?.name || "";
      if (isEn()) {
        return src
          ? `${flow.origin}\n${flow.amount}\nDid it arrive? ${arrived}\nSource: ${src}`
          : `${flow.origin}\n${flow.amount}\nDid it arrive? ${arrived}`;
      }
      return src
        ? `${flow.origin}\n${flow.amount}\n¿Llegó? ${arrived}\nFuente: ${src}`
        : `${flow.origin}\n${flow.amount}\n¿Llegó? ${arrived}`;
    })
    .join("\n\n");
}

function addChat(role, text) {
  const log = document.getElementById("chat-log");
  if (!log) return;
  const p = document.createElement("p");
  p.className = role;
  p.textContent = text;
  log.append(p);
  log.scrollTop = log.scrollHeight;
}

function welcomeChat() {
  return isEn()
    ? "Search by municipality or by country: Pereira, Chile. If the record does not document it, the answer is “—”."
    : "Consulte por municipio o por país: Pereira, Chile. Si el registro no lo documenta, la respuesta es «—».";
}

function setChatPlaceholder() {
  const input = document.getElementById("chat-q");
  if (input) input.placeholder = isEn() ? "Pereira, Chile…" : "Pereira, Chile…";
}

const chatForm = document.getElementById("chat-form");
if (chatForm) {
  setChatPlaceholder();
  addChat("bot", welcomeChat());
  chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = chatForm.querySelector("input");
    const q = String(input.value || "").trim();
    if (!q) return;
    addChat("you", q);
    addChat("bot", chatReply(q));
    input.value = "";
  });
}

document.addEventListener("veeduria:lang", () => {
  setChatPlaceholder();
  const log = document.getElementById("chat-log");
  if (!log || log.children.length > 1) return;
  log.replaceChildren();
  addChat("bot", welcomeChat());
});
