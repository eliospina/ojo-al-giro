import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const flows = JSON.parse(
  readFileSync(new URL("../data/flujos.json", import.meta.url), "utf8"),
).flows;

function runTotals(list) {
  const items = [];
  const nEl = { textContent: "" };
  const sumsEl = {
    replaceChildren() {
      items.length = 0;
    },
    append(node) {
      items.push(node.textContent);
    },
  };
  const context = vm.createContext({
    isEn: () => false,
    document: {
      getElementById(id) {
        if (id === "total-n") return nEl;
        if (id === "sums") return sumsEl;
        return null;
      },
      createElement() {
        return { textContent: "" };
      },
    },
  });
  vm.runInContext(readFileSync(new URL("../totals.js", import.meta.url), "utf8"), context);
  context.paintTotals(list);
  return { n: nEl.textContent, sums: items.join(" · ") };
}

test("no presenta el 1.300 como total actualizado", () => {
  const { n, sums } = runTotals(flows);
  assert.equal(n, "No hay");
  assert.match(sums, /No hay un total consolidado y actualizado publicado/);
  assert.match(sums, /Propuestas multilaterales reportadas el 12 ago: USD 1.300 millones/);
  assert.match(sums, /no es giro/);
});

test("créditos y donaciones no se mezclan con la bolsa", () => {
  const { sums } = runTotals(flows);
  assert.match(sums, /USD 200 millones/);
  assert.match(sums, /USD 300 millones/);
  assert.match(sums, /USD 46 millones/);
  assert.match(sums, /USD 1.300 millones \(no es giro\)/);
});

test("el agregado privado aparece aparte y no se duplica", () => {
  const { sums } = runTotals(flows);
  assert.match(sums, /más de COP 2 billones/);
  assert.match(sums, /incluye donantes nombrados; no sumarlos otra vez/);
  assert.match(sums, /Son cortes separados; no se suman entre sí/);
});

test("toneladas recibidas, a los pueblos —", () => {
  const { sums } = runTotals(flows);
  assert.match(sums, /222,5 t recibidas/);
  assert.match(sums, /pueblos: —/);
});

test("640 t DIAN es otro corte, no se suma a las 222,5", () => {
  const { sums } = runTotals(flows);
  assert.match(sums, /640 t ingresadas/);
  assert.match(sums, /no se suma a las 222,5/);
  assert.doesNotMatch(sums, /862/);
});

test("80 t Cancillería 25 ago es otro corte, no se suma", () => {
  const { sums } = runTotals(flows);
  assert.match(sums, /80 t Cancillería 25 ago/);
  assert.match(sums, /no se suma a 222,5 ni a 640/);
  assert.doesNotMatch(sums, /720/);
});
