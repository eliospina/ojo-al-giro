const BLOQUES = ["privado", "internacional", "credito", "linea", "propuestas"];
const POR_DEFECTO = ["privado", "internacional"];
const ESCALAS = [
  { re: /billones?|bill[oó]n/i, factor: 1e12 },
  { re: /millones?|mill[oó]n/i, factor: 1e6 },
];

let ultimo = null;
let cableada = false;

function parseEsNum(raw) {
  const t = String(raw).trim();
  if (!t) return NaN;
  if (/\d\.\d{3}/.test(t) && !t.includes(",")) return Number(t.replace(/\./g, ""));
  if (t.includes(".") && t.includes(",")) return Number(t.replace(/\./g, "").replace(",", "."));
  if (t.includes(",")) return Number(t.replace(",", "."));
  return Number(t);
}

function scale(num, unit) {
  for (const { re, factor } of ESCALAS) {
    if (re.test(unit || "")) return num * factor;
  }
  return num;
}

function moneyBits(text) {
  const re =
    /(USD|EUR|GBP|CHF|COP|NOK|SEK|CNY)\s*([0-9][0-9.]*(?:,[0-9]+)?)\s*(billones?|bill[oó]n|millones?|mill[oó]n)?/gi;
  const bits = [];
  let m;
  while ((m = re.exec(text))) {
    bits.push({ cur: m[1].toUpperCase(), value: scale(parseEsNum(m[2]), m[3] || "") });
  }
  return bits.filter((b) => Number.isFinite(b.value));
}

// El paréntesis casi siempre repite la misma plata en otra moneda. Se separa
// para no contar dos veces «GBP 680.000 (≈ COP 3.000 millones)».
function partirParentesis(text) {
  const dentro = [];
  const fuera = String(text || "").replace(/\(([^)]*)\)/g, (_, x) => {
    dentro.push(x);
    return " ";
  });
  return { fuera, dentro: dentro.join(" ") };
}

function copPorUnidad(fx, cur) {
  if (cur === "COP") return 1;
  const tasa = fx && fx.cop_por && fx.cop_por[cur];
  return tasa && Number.isFinite(tasa.valor) ? tasa.valor : null;
}

function bitsAUsd(bits, fx) {
  const trm = copPorUnidad(fx, "USD");
  let usd = 0;
  const sinTasa = [];
  for (const b of bits) {
    if (b.cur === "USD") {
      usd += b.value;
      continue;
    }
    const cop = copPorUnidad(fx, b.cur);
    if (cop && trm) usd += (b.value * cop) / trm;
    else sinTasa.push(b);
  }
  return { usd, sinTasa };
}

function usdDeFila(flow, fx) {
  const { fuera, dentro } = partirParentesis(flow.amount);
  const principal = bitsAUsd(moneyBits(fuera), fx);
  if (principal.usd > 0 && !principal.sinTasa.length) return principal;
  // Si la moneda de origen no tiene tasa citada, vale la equivalencia que dio la propia fuente.
  const equivalencia = moneyBits(dentro).filter((b) => b.cur === "USD");
  if (equivalencia.length) {
    return { usd: equivalencia.reduce((a, b) => a + b.value, 0), sinTasa: [] };
  }
  return principal;
}

function bloqueDe(flow) {
  if (flow.dentro_de) return null;
  if (flow.clase === "donacion") return flow.id === "sector-privado-agregado" ? "privado" : "internacional";
  if (flow.clase === "credito") return "credito";
  if (flow.clase === "linea") return "linea";
  if (flow.clase === "propuestas") return "propuestas";
  return null;
}

function toneladas(text) {
  const m = String(text || "").match(/([0-9][0-9.,]*)\s*toneladas/);
  return m ? parseEsNum(m[1]) : NaN;
}

function calcularTotales(flows, fx) {
  const usd = {};
  for (const b of BLOQUES) usd[b] = 0;
  const sinTasa = new Map();
  const cortesEspecie = [];

  for (const flow of Array.isArray(flows) ? flows : []) {
    if (flow.clase === "especie" && flow.agregado) {
      const t = toneladas(flow.amount);
      if (Number.isFinite(t)) cortesEspecie.push({ id: flow.id, t });
    }
    const bloque = bloqueDe(flow);
    if (!bloque) continue;
    const { usd: monto, sinTasa: pendientes } = usdDeFila(flow, fx);
    usd[bloque] += monto;
    for (const b of pendientes) sinTasa.set(b.cur, (sinTasa.get(b.cur) || 0) + b.value);
  }

  return { usd, sinTasa, cortesEspecie };
}

function fechaLegible(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return String(iso || "");
  const meses = isEn()
    ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    : ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${Number(m[3])} ${meses[Number(m[2]) - 1]} ${m[1]}`;
}

function formatMoney(cur, value) {
  const mill = value / 1e6;
  const loc = isEn() ? "en-US" : "es-CO";
  if (Math.abs(mill) >= 1) {
    const n = new Intl.NumberFormat(loc, { maximumFractionDigits: mill >= 10 ? 0 : 1 }).format(mill);
    if (isEn()) return `${cur} ${n} million`;
    return Math.abs(mill - 1) < 0.05 ? `${cur} ${n} millón` : `${cur} ${n} millones`;
  }
  return `${cur} ${new Intl.NumberFormat(loc, { maximumFractionDigits: 0 }).format(value)}`;
}

function seleccion() {
  const caja = typeof document !== "undefined" && document.getElementById("calc");
  if (!caja || !caja.querySelectorAll) return [...POR_DEFECTO];
  const marcadas = [...caja.querySelectorAll("[data-calc]")].filter((el) => el.checked).map((el) => el.dataset.calc);
  return marcadas;
}

function avisoDe(elegidos) {
  const avisos = [];
  if (elegidos.includes("credito") || elegidos.includes("linea")) {
    avisos.push(
      isEn()
        ? "You added credit: that is debt Colombia repays, not a gift."
        : "Metió crédito: eso es deuda que Colombia paga, no es un regalo.",
    );
  }
  if (elegidos.includes("propuestas")) {
    avisos.push(
      isEn()
        ? "You added the 12 Aug proposals: that snapshot already mixes credit and donations counted above."
        : "Metió las propuestas del 12 ago: esa foto ya mezcla crédito y donaciones que están arriba.",
    );
  }
  if (!elegidos.length) {
    avisos.push(isEn() ? "Nothing selected." : "No hay nada marcado.");
  }
  return avisos.join(" ");
}

function lineasDe(t, fx) {
  const loc = isEn() ? "en-US" : "es-CO";
  const num = (v, d = 2) => new Intl.NumberFormat(loc, { maximumFractionDigits: d }).format(v);
  const corte = (id) => t.cortesEspecie.find((c) => c.id === id);
  const bilateral = corte("ayuda-bilateral-recibida");
  const dian = corte("dian-ingreso-aduanero");
  const cancilleria = corte("cancilleria-especie-25ago");
  const tons = [bilateral, dian, cancilleria]
    .filter(Boolean)
    .map((c) => `${new Intl.NumberFormat(loc, { maximumFractionDigits: 1 }).format(c.t)} t`)
    .join(" · ");

  const tasas = fx && fx.cop_por
    ? Object.entries(fx.cop_por)
        .map(([cur, tasa]) => `${cur} ${num(tasa.valor)}`)
        .join(" · ")
    : "";

  const pendientes = [...t.sinTasa.entries()].map(([cur, v]) => formatMoney(cur, v)).join(" · ");

  if (isEn()) {
    return [
      "This record's calculator: it adds like with like and says what it leaves out.",
      `Colombia's private sector: ${formatMoney("USD", t.usd.privado)} (22 Aug cut, "more than COP 2 trillion"; ANDI and the named donors are already inside)`,
      `International donations: ${formatMoney("USD", t.usd.internacional)}`,
      `Credit disbursed to the Government: ${formatMoney("USD", t.usd.credito)} — repaid, not a donation`,
      `IDB emergency line: ${formatMoney("USD", t.usd.linea)} — a ceiling, not a transfer`,
      `Proposals reported 12 Aug: ${formatMoney("USD", t.usd.propuestas)} — an old snapshot that already mixes credit and donations`,
      tons ? `In kind, three cuts that are not added together: ${tons}. To the towns: —` : null,
      tasas ? `Converted at rates of ${fechaLegible(fx.fecha)}, pesos per unit: ${tasas}` : null,
      pendientes ? `No cited rate, left in its own currency: ${pendientes}` : null,
      "No source says this money reached the homes.",
    ];
  }

  return [
    "Calculadora de este registro: suma lo comparable y dice qué deja por fuera.",
    `Sector privado colombiano: ${formatMoney("USD", t.usd.privado)} (corte 22 ago, «más de COP 2 billones»; ANDI y los donantes nombrados ya van adentro)`,
    `Donaciones internacionales: ${formatMoney("USD", t.usd.internacional)}`,
    `Crédito desembolsado al Gobierno: ${formatMoney("USD", t.usd.credito)} — se paga, no es donación`,
    `Línea de emergencia del BID: ${formatMoney("USD", t.usd.linea)} — es un tope, no un giro`,
    `Propuestas reportadas el 12 ago: ${formatMoney("USD", t.usd.propuestas)} — foto vieja que ya mezcla crédito y donación`,
    tons ? `En especie, tres cortes que no se suman entre sí: ${tons}. A los pueblos: —` : null,
    tasas ? `Convertido con tasas del ${fechaLegible(fx.fecha)}, pesos por unidad: ${tasas}` : null,
    pendientes ? `Sin tasa citada, se queda en su moneda: ${pendientes}` : null,
    "Ninguna fuente dice que esta plata haya llegado a las casas.",
  ];
}

function pintar() {
  if (!ultimo) return;
  const { t, fx } = ultimo;
  const loc = isEn() ? "en-US" : "es-CO";
  const elegidos = seleccion();
  const suma = elegidos.reduce((acc, b) => acc + (t.usd[b] || 0), 0);

  const nEl = document.getElementById("total-n");
  if (nEl) {
    nEl.textContent = new Intl.NumberFormat(loc, { maximumFractionDigits: 0 }).format(suma / 1e6);
  }

  const avisoEl = document.getElementById("calc-aviso");
  if (avisoEl) avisoEl.textContent = avisoDe(elegidos);

  const sumsEl = document.getElementById("sums");
  if (!sumsEl) return;
  sumsEl.replaceChildren();
  for (const text of lineasDe(t, fx).filter(Boolean)) {
    const li = document.createElement("li");
    li.textContent = text;
    sumsEl.append(li);
  }
}

function cablear() {
  if (cableada || typeof document === "undefined") return;
  const caja = document.getElementById("calc");
  if (!caja || !caja.addEventListener) return;
  caja.addEventListener("change", pintar);
  cableada = true;
}

function paintTotals(flows, fx) {
  if (!Array.isArray(flows)) return;
  ultimo = { t: calcularTotales(flows, fx), fx };
  cablear();
  pintar();
}
