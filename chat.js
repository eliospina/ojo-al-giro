function fold(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function chatReply(question) {
  const q = fold(question).trim();
  const flows = window.LEDGER_FLOWS || [];
  if (!q) return isEn() ? "Ask a country, a town or the total." : "Pregunte un país, un municipio o el total.";
  if (!flows.length) return isEn() ? "The ledger is not loaded yet." : "El registro aún no está leído.";

  const scored = flows
    .map((flow) => {
      const hay = fold(`${flow.origin} ${flow.territory} ${flow.amount} ${flow.route}`);
      const words = q.split(/\s+/).filter((w) => w.length > 2);
      let hits = words.filter((w) => hay.includes(w)).length;
      if (q.length > 2 && hay.includes(q)) hits += 2;
      return { flow, hits };
    })
    .filter((row) => row.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 3);

  const wantsTotal = /(total|suma|\bcuanto\b|how much|aggregate|1\.?300|ofertas?)/.test(q);
  const named = scored.filter(({ flow }) => {
    const hay = fold(`${flow.origin} ${flow.territory}`);
    return q.split(/\s+/).some((w) => w.length > 3 && hay.includes(w) && !/(total|suma|cuanto|oferta|ayuda|donacion|millones)/.test(w));
  });
  if (wantsTotal && !named.length) {
    const n = document.getElementById("total-n")?.textContent || "—";
    const s = document.getElementById("sums")?.textContent || "";
    return isEn()
      ? `${n} in reported offers. Not a transfer. ${s}`
      : `${n} en ofertas reportadas. No es un giro. ${s}`;
  }

  if (!scored.length) {
    return isEn()
      ? "Not in this ledger. —"
      : "No está en este registro. —";
  }

  return scored
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
    ? "Ask a country, Pereira, or the total. I answer only from this ledger."
    : "Pregunte un país, Pereira o el total. Respondo solo con este registro.";
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
