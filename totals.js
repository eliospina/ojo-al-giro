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

function usdFromDonation(flow, bits) {
  const usdApprox = bits.find((b) => b.cur === "USD" && b.approx);
  const usdPlain = bits.filter((b) => b.cur === "USD" && !b.approx);
  if (usdApprox && flow.id === "andi-empresas-unidas") return usdApprox.value;
  if (usdApprox && !usdPlain.length) return usdApprox.value;
  return usdPlain.reduce((a, b) => a + b.value, 0);
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

  let usdAndi = 0;
  let usdGift = 0;
  let usdCreditOut = 0;
  let usdCreditLine = 0;
  let eurGift = 0;
  let gbpGift = 0;
  let chfGift = 0;
  let cnyGift = 0;
  for (const flow of flows) {
    if (SKIP_MONEY.has(flow.id)) continue;
    const bits = moneyBits(flow.amount);
    if (flow.id === "andi-empresas-unidas") {
      usdAndi = usdFromDonation(flow, bits);
      continue;
    }
    if (flow.id === "banco-mundial-catddo") {
      usdCreditOut += bits.filter((b) => b.cur === "USD" && !b.approx).reduce((a, b) => a + b.value, 0);
      continue;
    }
    if (flow.id === "bid-credito") {
      usdCreditLine += bits.filter((b) => b.cur === "USD" && !b.approx).reduce((a, b) => a + b.value, 0);
      continue;
    }
    const blob = `${flow.origin} ${flow.amount} ${flow.status} ${flow.route}`.toLowerCase();
    if (/cr[eé]dito|cat ddo|l[ií]nea de emergencia|contingente/.test(blob)) {
      usdCreditLine += bits.filter((b) => b.cur === "USD" && !b.approx).reduce((a, b) => a + b.value, 0);
      continue;
    }
    if (/tonelada|en especie|kits |rescatistas/.test(blob)) continue;
    usdGift += usdFromDonation(flow, bits);
    eurGift += bits.filter((b) => b.cur === "EUR").reduce((a, b) => a + b.value, 0);
    gbpGift += bits.filter((b) => b.cur === "GBP").reduce((a, b) => a + b.value, 0);
    chfGift += bits.filter((b) => b.cur === "CHF").reduce((a, b) => a + b.value, 0);
    cnyGift += bits.filter((b) => b.cur === "CNY").reduce((a, b) => a + b.value, 0);
  }

  const tons = flows.find((f) => f.id === "ayuda-bilateral-recibida");
  const tonN = tons ? parseEsNum((tons.amount.match(/([0-9][0-9.,]*)\s*toneladas/) || [])[1]) : NaN;
  const tonLabel = Number.isFinite(tonN)
    ? new Intl.NumberFormat(loc, { maximumFractionDigits: 1 }).format(tonN)
    : "";

  const parts = isEn()
    ? [
        "Line items, not added to the 1,300:",
        `ANDI announced ≈ ${formatMoney("USD", usdAndi)} (not a transfer)`,
        `International donations announced ${formatMoney("USD", usdGift)}`,
        `Credit disbursed to the Government ${formatMoney("USD", usdCreditOut)}`,
        `IDB emergency line (ceiling, not a transfer) ${formatMoney("USD", usdCreditLine)}`,
        [formatMoney("EUR", eurGift), gbpGift ? formatMoney("GBP", gbpGift) : null, chfGift ? formatMoney("CHF", chfGift) : null]
          .filter(Boolean)
          .join(" · "),
        cnyGift ? `${formatMoney("CNY", cnyGift)} (China, not converted)` : null,
        tonLabel ? `${tonLabel} t received in the country · municipal delivery: —` : null,
      ]
    : [
        "Por líneas, sin sumar al 1.300:",
        `ANDI anunciado ≈ ${formatMoney("USD", usdAndi)} (no es giro)`,
        `Donaciones internacionales anunciadas ${formatMoney("USD", usdGift)}`,
        `Crédito desembolsado al Gobierno ${formatMoney("USD", usdCreditOut)}`,
        `Línea BID (tope, no giro) ${formatMoney("USD", usdCreditLine)}`,
        [formatMoney("EUR", eurGift), gbpGift ? formatMoney("GBP", gbpGift) : null, chfGift ? formatMoney("CHF", chfGift) : null]
          .filter(Boolean)
          .join(" · "),
        cnyGift ? `${formatMoney("CNY", cnyGift)} (China, sin convertir)` : null,
        tonLabel ? `${tonLabel} t recibidas en el país · entrega municipal: —` : null,
      ];

  if (!sumsEl) return;
  sumsEl.replaceChildren();
  for (const text of parts.filter(Boolean)) {
    const li = document.createElement("li");
    li.textContent = text;
    sumsEl.append(li);
  }
}
