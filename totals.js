const SKIP_MONEY = new Set([
  "ofertas-agregado",
  "santo-domingo",
  "ayuda-bilateral-recibida",
  "el-salvador",
  "mexico",
  "chile-recibido",
  "peru",
  "chile-pereira",
]);

function parseEsNum(raw) {
  const t = String(raw).trim();
  if (!t) return NaN;
  if (/\d\.\d{3}/.test(t) && !t.includes(",")) return Number(t.replace(/\./g, ""));
  if (t.includes(".") && t.includes(",")) return Number(t.replace(/\./g, "").replace(",", "."));
  if (t.includes(",")) return Number(t.replace(",", "."));
  return Number(t);
}

function scale(num, unit) {
  if (/millones?|mill[oó]n/i.test(unit || "")) return num * 1e6;
  return num;
}

function moneyBits(text) {
  const bits = [];
  const re =
    /(USD|EUR|GBP|CHF|COP|NOK|SEK|CNY)\s*([0-9][0-9.]*(?:,[0-9]+)?)\s*(millones?|mill[oó]n)?/gi;
  let m;
  while ((m = re.exec(text))) {
    bits.push({ cur: m[1].toUpperCase(), value: scale(parseEsNum(m[2]), m[3] || "") });
  }
  const approx = /(?:≈|~)\s*USD\s*([0-9][0-9.]*(?:,[0-9]+)?)\s*(millones?|mill[oó]n)?/gi;
  while ((m = approx.exec(text))) {
    bits.push({ cur: "USD", value: scale(parseEsNum(m[1]), m[2] || ""), approx: true });
  }
  return bits.filter((b) => Number.isFinite(b.value));
}

function formatMoney(cur, value) {
  const mill = value / 1e6;
  const loc = isEn() ? "en-US" : "es-CO";
  if (Math.abs(mill) >= 1) {
    const n = new Intl.NumberFormat(loc, {
      maximumFractionDigits: mill >= 10 ? 0 : 1,
    }).format(mill);
    if (isEn()) return `${cur} ${n} million`;
    return Math.abs(mill - 1) < 0.05 ? `${cur} ${n} millón` : `${cur} ${n} millones`;
  }
  return `${cur} ${new Intl.NumberFormat(loc, { maximumFractionDigits: 0 }).format(value)}`;
}

function classify(flow) {
  const blob = `${flow.origin} ${flow.amount} ${flow.status} ${flow.route}`.toLowerCase();
  if (flow.id === "ofertas-agregado") return "oferta";
  if (/cr[eé]dito|cat ddo|l[ií]nea de emergencia|contingente/.test(blob)) return "credito";
  if (/tonelada|en especie|kits |rescatistas/.test(blob)) return "especie";
  return "donacion";
}

function paintTotals(flows) {
  const nEl = document.getElementById("total-n");
  const sumsEl = document.getElementById("sums");
  if (!nEl || !Array.isArray(flows)) return;

  const loc = isEn() ? "en-US" : "es-CO";
  const bag = flows.find((f) => f.id === "ofertas-agregado");
  const bagUsd = bag ? moneyBits(bag.amount).find((b) => b.cur === "USD") : null;
  nEl.textContent = bagUsd
    ? new Intl.NumberFormat(loc, { maximumFractionDigits: 0 }).format(bagUsd.value / 1e6)
    : "—";

  let usdGift = 0;
  let usdCredit = 0;
  let eurGift = 0;
  let gbpGift = 0;
  let chfGift = 0;
  for (const flow of flows) {
    if (SKIP_MONEY.has(flow.id)) continue;
    const kind = classify(flow);
    const bits = moneyBits(flow.amount);
    if (kind === "credito") {
      usdCredit += bits.filter((b) => b.cur === "USD" && !b.approx).reduce((a, b) => a + b.value, 0);
      continue;
    }
    if (kind !== "donacion") continue;
    const usdApprox = bits.find((b) => b.cur === "USD" && b.approx);
    const usdPlain = bits.filter((b) => b.cur === "USD" && !b.approx);
    if (usdApprox && flow.id === "andi-empresas-unidas") usdGift += usdApprox.value;
    else if (usdApprox && !usdPlain.length) usdGift += usdApprox.value;
    else usdGift += usdPlain.reduce((a, b) => a + b.value, 0);
    eurGift += bits.filter((b) => b.cur === "EUR").reduce((a, b) => a + b.value, 0);
    gbpGift += bits.filter((b) => b.cur === "GBP").reduce((a, b) => a + b.value, 0);
    chfGift += bits.filter((b) => b.cur === "CHF").reduce((a, b) => a + b.value, 0);
  }

  const tons = flows.find((f) => f.id === "ayuda-bilateral-recibida");
  const tonN = tons ? parseEsNum((tons.amount.match(/([0-9][0-9.,]*)\s*toneladas/) || [])[1]) : NaN;

  const parts = isEn()
    ? [
        `Line-item sum, excluding the offer bag: donations ${formatMoney("USD", usdGift)}`,
        `credit ${formatMoney("USD", usdCredit)}`,
        formatMoney("EUR", eurGift),
        gbpGift ? formatMoney("GBP", gbpGift) : null,
        chfGift ? formatMoney("CHF", chfGift) : null,
        Number.isFinite(tonN) ? `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(tonN)} t received` : null,
      ]
    : [
        `Suma de líneas, sin la bolsa de ofertas: donaciones ${formatMoney("USD", usdGift)}`,
        `créditos ${formatMoney("USD", usdCredit)}`,
        formatMoney("EUR", eurGift),
        gbpGift ? formatMoney("GBP", gbpGift) : null,
        chfGift ? formatMoney("CHF", chfGift) : null,
        Number.isFinite(tonN) ? `${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(tonN)} t recibidas` : null,
      ];
  if (sumsEl) sumsEl.textContent = parts.filter(Boolean).join(" · ");
}
