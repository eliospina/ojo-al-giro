import { existsSync, readFileSync } from "node:fs";

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
  ok(/oferta|propuesta/i.test(`${bolsa.origin} ${bolsa.amount} ${bolsa.status}`), "R2", "ofertas-agregado", "debe decir que es oferta o propuesta");
  ok(/1\.300/.test(bolsa.amount), "R2", "ofertas-agregado", "debe conservar 1.300");
  ok(/12 ago/.test(`${bolsa.origin} ${bolsa.status}`), "R2", "ofertas-agregado", "debe mostrar que es el corte del 12 ago");
  ok(/no total actualizado/i.test(bolsa.amount), "R2", "ofertas-agregado", "no debe presentarse como total actualizado");
}

const privado = porId("sector-privado-agregado");
ok(!!privado, "R2b", "sector-privado-agregado", "falta el agregado privado posterior");
if (privado) {
  ok(/2 billones/.test(privado.amount), "R2b", "sector-privado-agregado", "debe conservar el agregado de más de COP 2 billones");
  ok(/no sumar|no se suma/i.test(`${privado.origin} ${privado.status}`), "R2b", "sector-privado-agregado", "debe evitar sumar otra vez los donantes incluidos");
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

const dian = porId("dian-ingreso-aduanero");
ok(!!dian, "R4b", "dian-ingreso-aduanero", "falta el corte aduanero de 640 t");
if (dian) {
  ok(Math.abs(parseTon(dian.amount) - 640) < 0.05, "R4b", "dian-ingreso-aduanero", "debe conservar 640 toneladas");
  const blob = `${dian.origin} ${dian.amount} ${dian.status} ${dian.route}`;
  ok(/no se suma/i.test(blob), "R4b", "dian-ingreso-aduanero", "debe decir que no se suma a las 222,5 t");
  ok(/222[,.]5/.test(blob), "R4b", "dian-ingreso-aduanero", "debe nombrar el agregado 222,5 para no mezclar cortes");
  ok(/hogares:\s*—/.test(dian.executed), "R4b", "dian-ingreso-aduanero", "la entrega a hogares debe quedar en «—»");
}

const can = porId("cancilleria-especie-25ago");
ok(!!can, "R4c", "cancilleria-especie-25ago", "falta el corte Cancillería de 80 t");
if (can) {
  ok(Math.abs(parseTon(can.amount) - 80) < 0.05, "R4c", "cancilleria-especie-25ago", "debe conservar 80 toneladas");
  const blob = `${can.origin} ${can.amount} ${can.status} ${can.route}`;
  ok(/no se suma/i.test(blob), "R4c", "cancilleria-especie-25ago", "debe decir que no se suma a 222,5 ni a 640");
  ok(/640/.test(blob) && /222[,.]5/.test(blob), "R4c", "cancilleria-especie-25ago", "debe nombrar 222,5 y 640 para no mezclar cortes");
  ok(/hogares:\s*—/.test(can.executed), "R4c", "cancilleria-especie-25ago", "la entrega a hogares debe quedar en «—»");
}

const cp = porId("chile-pereira");
ok(cp && /hogares:\s*—/.test(cp.executed), "R6", "chile-pereira", "la entrega a hogares debe quedar en «—»");

for (const f of flows) {
  if (/\b(GBP|CHF)\b/.test(f.amount)) {
    ok(!/\bUSD\b/.test(f.amount), "R7", f.id, "GBP/CHF no se convierten a USD");
  }
}

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
ok(
  !/lo anunciado no es lo|anunciado no es lo que|announced is not what/i.test(html),
  "R9",
  "index.html",
  "el eslogan prohibido no entra al HTML",
);
ok(
  existsSync(new URL("../public/cartel-veeduria.png", import.meta.url)),
  "R10",
  "public/cartel-veeduria.png",
  "falta el PNG del cartel",
);
ok(
  /og:image[^>]+cartel-veeduria\.png/.test(html),
  "R10",
  "index.html",
  "og:image debe apuntar al cartel",
);

const ISO = /^\d{4}-\d{2}-\d{2}$/;
ok(ISO.test(data.updated || ""), "R11", "data/flujos.json", "«updated» debe ser una fecha AAAA-MM-DD: el lector tiene derecho a saber de cuándo es el registro");

const pulso = JSON.parse(
  readFileSync(new URL("../data/pulso.json", import.meta.url), "utf8"),
);
const eventos = pulso.events || [];
ok(eventos.length > 0, "R12", "data/pulso.json", "la cronología no puede quedar vacía");
ok(
  pulso.ledgerUpdated === data.updated,
  "R12",
  "data/pulso.json",
  `«ledgerUpdated» (${pulso.ledgerUpdated}) debe coincidir con «updated» de flujos.json (${data.updated})`,
);
const vistos = new Set();
for (const e of eventos) {
  const id = e.id || "(sin-id)";
  ok(!!e.id && !vistos.has(e.id), "R12", id, "el evento necesita un id propio y sin repetir");
  vistos.add(e.id);
  ok(ISO.test(e.at || ""), "R12", id, "el evento necesita fecha AAAA-MM-DD");
  ok(!!e.origin, "R12", id, "falta origen");
  ok(e.source && /^https:\/\//.test(e.source.url || ""), "R12", id, "evento sin URL https");
}

const CLASES = new Set(["donacion", "credito", "linea", "especie", "personal", "propuestas"]);
for (const f of flows) {
  const id = f.id || "(sin-id)";
  ok(CLASES.has(f.clase), "R14", id, `«clase» debe ser una de: ${[...CLASES].join(", ")}`);
  if (f.dentro_de) {
    ok(f.dentro_de !== f.id, "R15", id, "una fila no puede ir dentro de sí misma");
    ok(!!porId(f.dentro_de), "R15", id, `«dentro_de» apunta a «${f.dentro_de}», que no existe en el registro`);
    let cursor = porId(f.dentro_de);
    const camino = new Set([f.id]);
    while (cursor && cursor.dentro_de) {
      if (camino.has(cursor.id)) break;
      camino.add(cursor.id);
      cursor = porId(cursor.dentro_de);
    }
    ok(!cursor || !camino.has(cursor.id), "R15", id, "«dentro_de» forma un círculo: la calculadora no sabría qué sumar");
  }
}

// Lo que ya va dentro de un agregado no se vuelve a sumar: eso se declara en los datos, no en el código.
for (const [hijo, padre] of [
  ["santo-domingo", "andi-empresas-unidas"],
  ["andi-empresas-unidas", "sector-privado-agregado"],
  ["el-salvador", "ayuda-bilateral-recibida"],
  ["mexico", "ayuda-bilateral-recibida"],
  ["chile-recibido", "ayuda-bilateral-recibida"],
  ["peru", "ayuda-bilateral-recibida"],
]) {
  const f = porId(hijo);
  ok(f && f.dentro_de === padre, "R15", hijo, `debe declarar «dentro_de»: ${padre}, para no contarse dos veces`);
}

ok(!!data.fx, "R16", "data/flujos.json", "falta el bloque «fx»: sin tasa citada no se puede convertir");
if (data.fx) {
  ok(ISO.test(data.fx.fecha || ""), "R16", "fx", "«fecha» de las tasas debe ser AAAA-MM-DD");
  const tasas = data.fx.cop_por || {};
  ok(Object.keys(tasas).length > 0, "R16", "fx", "no hay ninguna tasa");
  ok(Number(tasas.USD?.valor) > 0, "R16", "fx.USD", "falta la TRM: es el ancla de toda conversión");
  for (const [cur, tasa] of Object.entries(tasas)) {
    ok(Number(tasa?.valor) > 0, "R16", `fx.${cur}`, "la tasa debe ser un número de pesos por unidad");
    ok(
      tasa?.source && /^https:\/\//.test(tasa.source.url || ""),
      "R16",
      `fx.${cur}`,
      "toda tasa lleva fuente con URL https: no se inventan tasas de cambio",
    );
  }
}

ok(
  /data-calc="credito"(?![^>]*checked)/.test(html),
  "R17",
  "index.html",
  "el crédito no puede venir marcado por defecto en la calculadora: deuda no es donación",
);
ok(
  /data-calc="propuestas"(?![^>]*checked)/.test(html),
  "R17",
  "index.html",
  "las propuestas del 12 ago no pueden venir marcadas por defecto: se traslapan con las líneas ya contadas",
);

const peticion = readFileSync(new URL("../peticion.js", import.meta.url), "utf8");
for (const [cita, detalle] of [
  ["artículo 23 de la Constitución", "el fundamento constitucional"],
  ["Ley 1755 de 2015", "la ley que regula el derecho de petición"],
  ["diez (10) días", "el plazo de respuesta para peticiones de información"],
  ["artículo 21 de la Ley 1755 de 2015", "el traslado a la entidad competente"],
  ["no formula acusación alguna y no solicita dinero", "la cláusula que evita acusar y evita pedir plata"],
]) {
  ok(peticion.includes(cita), "R13", "peticion.js", `la petición debe conservar ${detalle} («${cita}»)`);
}

if (errores.length) {
  for (const e of errores) console.error(` ${e}`);
  process.exit(1);
}
console.log(`Registro válido: ${flows.length} filas · reglas del brief en verde.`);
