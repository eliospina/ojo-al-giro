import { readFileSync } from "node:fs";

const data = JSON.parse(
  readFileSync(new URL("../data/flujos.json", import.meta.url), "utf8"),
);
const flows = data.flows || [];
const errores = [];
const ok = (cond, regla, id, detalle) => {
  if (!cond) errores.push(`[${regla}] ${id}: ${detalle}`);
};
const porId = (id) => flows.find((f) => f.id === id);

function parseEsNum(raw) {
  const t = String(raw || "").trim();
  if (!t) return NaN;
  if (/\d\.\d{3}/.test(t) && !t.includes(",")) return Number(t.replace(/\./g, ""));
  if (t.includes(".") && t.includes(",")) return Number(t.replace(/\./g, "").replace(",", "."));
  if (t.includes(",")) return Number(t.replace(",", "."));
  return Number(t);
}

function parseTon(text) {
  const m = String(text || "").match(/([0-9]+(?:[.,][0-9]+)?)\s*toneladas/);
  return m ? parseEsNum(m[1]) : NaN;
}

const seen = new Set();
for (const f of flows) {
  const id = f.id || "(sin-id)";
  ok(!!f.id, "R0", id, "falta id");
  ok(!seen.has(f.id), "R0", id, "id duplicado");
  seen.add(f.id);
  ok(!!f.origin, "R0", id, "falta origen");
  ok(f.source && /^https:\/\//.test(f.source.url || ""), "R1", id, "fuente sin URL https");
  for (const campo of ["territory", "executed"]) {
    ok(f[campo] != null && String(f[campo]).trim() !== "", "R8", id, `${campo} vacío; si no se sabe, «—»`);
  }
}

const bolsa = porId("ofertas-agregado");
ok(!!bolsa, "R2", "ofertas-agregado", "falta la fila de la bolsa de ofertas");
if (bolsa) {
  ok(/oferta/i.test(`${bolsa.origin} ${bolsa.amount} ${bolsa.status}`), "R2", "ofertas-agregado", "debe decir que es oferta");
  ok(/1\.300/.test(bolsa.amount), "R2", "ofertas-agregado", "debe conservar 1.300");
}

for (const f of flows) {
  if (f.id === "ofertas-agregado") continue;
  const blob = `${f.origin} ${f.amount} ${f.status} ${f.route}`.toLowerCase();
  const isCredit = /cr[eé]dito|cat ddo|l[ií]nea de emergencia|contingente/.test(blob);
  if (isCredit) {
    ok(!/donaci[oó]n/.test(blob) || /no es donaci/.test(blob), "R3", f.id, "crédito no debe presentarse como donación");
  }
}

const agg = porId("ayuda-bilateral-recibida");
ok(!!agg, "R4", "ayuda-bilateral-recibida", "falta el agregado de toneladas");
if (agg) {
  const total = parseTon(agg.amount);
  const parts = ["el-salvador", "mexico", "chile-recibido", "peru"].map((id) => parseTon(porId(id)?.amount || ""));
  const suma = parts.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
  ok(Number.isFinite(total) && Math.abs(suma - total) < 0.05, "R4", "ayuda-bilateral-recibida", "las toneladas del agregado no cuadran con sus partes —100 + 58,5 + 50 + 14 = 222,5—");
}

const sd = porId("santo-domingo");
ok(sd && /andi/i.test(sd.origin), "R5", "santo-domingo", "debe marcarse como parte de ANDI");

const cp = porId("chile-pereira");
ok(cp && /hogares:\s*—/.test(cp.executed), "R6", "chile-pereira", "la entrega a hogares debe quedar en «—»");

for (const f of flows) {
  if (/\b(GBP|CHF)\b/.test(f.amount)) {
    ok(!/\bUSD\b/.test(f.amount), "R7", f.id, "GBP/CHF no se convierten a USD");
  }
}

if (errores.length) {
  for (const e of errores) console.error(` ${e}`);
  process.exit(1);
}
console.log(`Registro válido: ${flows.length} filas · reglas del brief en verde.`);
