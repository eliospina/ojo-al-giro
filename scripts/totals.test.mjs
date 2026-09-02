import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const data = JSON.parse(readFileSync(new URL("../data/flujos.json", import.meta.url), "utf8"));
const flows = data.flows;
const fx = data.fx;

function runTotals(list = flows, tasas = fx, marcadas = ["privado", "internacional"]) {
  const items = [];
  const nEl = { textContent: "" };
  const avisoEl = { textContent: "" };
  const sumsEl = {
    replaceChildren() {
      items.length = 0;
    },
    append(node) {
      items.push(node.textContent);
    },
  };
  const inputs = ["privado", "internacional", "credito", "linea", "propuestas"].map((calc) => ({
    dataset: { calc },
    checked: marcadas.includes(calc),
  }));
  const calcEl = {
    querySelectorAll: () => inputs,
    addEventListener() {},
  };
  const context = vm.createContext({
    isEn: () => false,
    document: {
      getElementById(id) {
        if (id === "total-n") return nEl;
        if (id === "sums") return sumsEl;
        if (id === "calc") return calcEl;
        if (id === "calc-aviso") return avisoEl;
        return null;
      },
      createElement() {
        return { textContent: "" };
      },
    },
  });
  vm.runInContext(readFileSync(new URL("../totals.js", import.meta.url), "utf8"), context);
  context.paintTotals(list, tasas);
  return {
    n: nEl.textContent,
    aviso: avisoEl.textContent,
    sums: items.join(" · "),
    totales: context.calcularTotales(list, tasas),
  };
}

const mill = (v) => v / 1e6;

test("el titular publica la suma de lo donado: privado más internacional", () => {
  const { n, totales } = runTotals();
  assert.equal(n, "710");
  assert.ok(Math.abs(mill(totales.usd.privado) - 649) < 1);
  assert.ok(Math.abs(mill(totales.usd.internacional) - 60.8) < 1);
});

test("lo que ya va dentro de un agregado no se suma otra vez", () => {
  const { totales } = runTotals();
  const dentro = flows.filter((f) => f.dentro_de).map((f) => f.id);
  assert.ok(dentro.includes("andi-empresas-unidas"));
  assert.ok(dentro.includes("santo-domingo"));
  // ANDI son unos USD 65 millones: si se colara, el privado pasaría de 700.
  assert.ok(mill(totales.usd.privado) < 700);
});

test("crédito y línea quedan por fuera del titular", () => {
  const { n, totales } = runTotals();
  assert.equal(mill(totales.usd.credito), 200);
  assert.equal(mill(totales.usd.linea), 300);
  assert.equal(n, "710");
});

test("si alguien marca el crédito, la suma sube y la página avisa que es deuda", () => {
  const { n, aviso } = runTotals(flows, fx, ["privado", "internacional", "credito"]);
  assert.equal(n, "910");
  assert.match(aviso, /deuda que Colombia paga/);
});

test("las propuestas del 12 ago no entran solas y avisan del traslape", () => {
  const { totales } = runTotals();
  assert.equal(mill(totales.usd.propuestas), 1300);
  const { n, aviso } = runTotals(flows, fx, ["propuestas"]);
  assert.equal(n, "1.300");
  assert.match(aviso, /ya mezcla crédito y donaciones/);
});

test("los pesos se convierten con la TRM citada, no a ojo", () => {
  const { totales } = runTotals();
  const trm = fx.cop_por.USD.valor;
  assert.ok(Math.abs(totales.usd.privado - 2e12 / trm) < 1);
});

test("el paréntesis no se cuenta dos veces", () => {
  const uk = flows.find((f) => f.id === "reino-unido");
  assert.match(uk.amount, /GBP 680\.000 \(≈ COP 3\.000 millones\)/);
  const { totales } = runTotals([uk], fx);
  const esperado = (680000 * fx.cop_por.GBP.valor) / fx.cop_por.USD.valor;
  assert.ok(Math.abs(totales.usd.internacional - esperado) < 1);
});

test("sin tasa citada, la moneda se queda en su moneda", () => {
  const uk = flows.find((f) => f.id === "reino-unido");
  const { totales } = runTotals([uk], { fecha: "2026-08-26", cop_por: { USD: { valor: 3081.67 } } });
  assert.equal(totales.usd.internacional, 0);
  assert.equal(totales.sinTasa.get("GBP"), 680000);
});

test("las toneladas no entran en el total monetario", () => {
  const { sums, totales } = runTotals();
  const especie = flows.filter((f) => f.clase === "especie");
  assert.ok(especie.length > 10);
  for (const f of especie) assert.equal(bloqueContado(f), false);
  assert.match(sums, /222,5 t · 640 t · 80 t/);
  assert.match(sums, /no se suman entre sí/);
  assert.match(sums, /Entrega municipal: —/);
  assert.equal(totales.cortesEspecie.length, 3);
});

function bloqueContado(flow) {
  return flow.clase === "donacion" || flow.clase === "credito" || flow.clase === "linea";
}

test("la calculadora dice de cuándo son las tasas y con qué fuente", () => {
  const { sums } = runTotals();
  assert.match(sums, /Convertido con tasas del 26 ago 2026/);
  assert.match(sums, /USD 3\.081,67/);
  for (const tasa of Object.values(fx.cop_por)) {
    assert.match(tasa.source.url, /^https:\/\//);
  }
});

test("no afirma que los recursos hayan llegado", () => {
  const { sums } = runTotals();
  assert.match(sums, /Ninguna fuente acredita que estos recursos hayan llegado a los hogares/);
  assert.doesNotMatch(sums, /entregad[oa] a los hogares/);
});
