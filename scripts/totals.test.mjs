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

test("el 1.300 es la bolsa de ofertas", () => {
  const { n, sums } = runTotals(flows);
  assert.equal(n, "1.300");
  assert.match(sums, /bolsa de ofertas/);
  assert.match(sums, /no es giro/);
});

test("créditos y donaciones no se mezclan con la bolsa", () => {
  const { sums } = runTotals(flows);
  assert.match(sums, /USD 200 millones/);
  assert.match(sums, /USD 300 millones/);
  assert.match(sums, /USD 46 millones/);
  assert.doesNotMatch(sums, /USD 1.300/);
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
