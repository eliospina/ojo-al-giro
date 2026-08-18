const AGGREGATE_IDS = new Set(["ofertas-agregado", "ayuda-bilateral-recibida"]);
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
  if (!q) return isEn() ? "Ask a country, a town or the total." : "Pregunte un país, un municipio o el total.";
  if (!flows.length) return isEn() ? "The ledger is not loaded yet." : "El registro aún no está leído.";

  const words = q.split(/\s+/).filter((w) => w.length > 2 && !STOP_WORD.test(w));
  const scored = flows
    .map((flow) => ({ flow, hits: scoreFlow(flow, q, words) }))
    .filter((row) => row.hits > 0)
    .sort((a, b) => b.hits - a.hits);

  const specific = scored.filter(({ flow, hits }) => !AGGREGATE_IDS.has(flow.id) && hits >= 3);
  const wantsTotal = /(total|suma|\bcuanto\b|how much|aggregate|1\.?300|ofertas?)/.test(q);
  if (wantsTotal && !specific.length) {
    const n = document.getElementById("total-n")?.textContent || "—";
    const s = sumsText();
    return isEn()
      ? `${n} million USD in reported offers. Not a transfer.\n${s}`
      : `${n} millones USD en ofertas reportadas. No es un giro.\n${s}`;
  }

  const pick = (specific.length ? specific : scored).slice(0, 3);
  if (!pick.length) {
    return isEn() ? "Not in this ledger. —" : "No está en este registro. —";
  }

  return pick
    .map(({ flow }) => {
      const src = flow.source?.url ? flow.source.url : "";
      const line = `${flow.origin}: ${flow.amount}. ${flow.executed || "—"}.`;
      return src ? `${line} ${src}` : line;
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
    ? "Ask Chile, Pereira or the total. I answer only from this ledger."
    : "Pregunte Chile, Pereira o el total. Respondo solo con este registro.";
}

function setChatPlaceholder() {
  const input = document.getElementById("chat-q");
  if (input) input.placeholder = isEn() ? "Chile, Pereira, total…" : "Chile, Pereira, total…";
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
