import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const flows = JSON.parse(
  readFileSync(new URL("../data/flujos.json", import.meta.url), "utf8"),
).flows;

const GAP = "Información no disponible";

function displayValue(value) {
  if (!value || value === GAP || value.startsWith("Sin fuente")) return "—";
  return value.includes(GAP) ? value.replaceAll(GAP, "—") : value;
}

function armar({ fila, entidad, municipio }) {
  const stubs = {
    "peticion-fila": { value: fila, replaceChildren() {}, append() {}, addEventListener() {} },
    "peticion-entidad": { value: entidad, addEventListener() {} },
    "peticion-municipio": { value: municipio, addEventListener() {} },
    "peticion-out": { hidden: true, textContent: "" },
    "peticion-status": { textContent: "" },
    "peticion-copiar": { addEventListener() {} },
  };
  const context = vm.createContext({
    isEn: () => false,
    displayValue,
    isGap: (value) => displayValue(value) === "—",
    window: { LEDGER_FLOWS: flows },
    location: { protocol: "https:", origin: "https://ojo-al-giro.vercel.app", pathname: "/" },
    document: {
      getElementById: (id) => stubs[id] || null,
      createElement: () => ({ textContent: "" }),
      addEventListener() {},
    },
  });
  vm.runInContext(readFileSync(new URL("../peticion.js", import.meta.url), "utf8"), context);
  return context.armarPeticion();
}

test("la petición lleva la fila escogida, con su fuente y su ficha", () => {
  const carta = armar({
    fila: "chile-pereira",
    entidad: "UNGRD — Unidad Nacional para la Gestión del Riesgo de Desastres",
    municipio: "Pereira",
  });
  assert.match(carta, /UNGRD/);
  assert.match(carta, /Chile — cargamento con llegada municipal verificada/);
  assert.match(carta, /https:\/\/www\.dw\.com/);
  assert.match(carta, /ojo-al-giro\.vercel\.app\/#f-chile-pereira/);
  assert.match(carta, /municipio de Pereira/);
});

test("la petición se funda en la ley y no acusa ni solicita dinero", () => {
  const carta = armar({ fila: "china-dorado", entidad: "[entidad]", municipio: "" });
  assert.match(carta, /artículo 23 de la Constitución/);
  assert.match(carta, /Ley 1755 de 2015/);
  assert.match(carta, /diez \(10\) días/);
  assert.match(carta, /artículo 21 de la Ley 1755 de 2015/);
  assert.match(carta, /no formula acusación alguna y no solicita dinero/);
  assert.doesNotMatch(carta, /municipio de \./);
});

test("cada fila del registro arma una petición con su origen y su fuente", () => {
  for (const flow of flows) {
    const carta = armar({ fila: flow.id, entidad: "Contraloría General de la República", municipio: "" });
    assert.match(carta, new RegExp(`Ficha del registro: .*#f-${flow.id}$`, "m"));
    assert.ok(carta.includes(flow.source.url), `${flow.id}: la carta debe llevar la URL de la fuente`);
    assert.ok(carta.includes(flow.origin), `${flow.id}: la carta debe llevar el origen`);
  }
});
