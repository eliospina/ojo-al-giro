import test from "node:test";
import assert from "node:assert/strict";
import {
  extractAnchors,
  ledgerUrls,
  normalizeUrl,
  pickNuevas,
  rastrear,
} from "./rastrear-fuentes.mjs";

test("normaliza utm y www sin inventar cifra", () => {
  assert.equal(
    normalizeUrl("https://www.infobae.com/nota/?utm_source=x"),
    normalizeUrl("https://infobae.com/nota"),
  );
});

test("el registro ya citado no vuelve a salir", () => {
  const known = ledgerUrls(
    { flows: [{ source: { url: "https://www.eltiempo.com/a" } }] },
    { events: [] },
  );
  const nuevas = pickNuevas(
    [
      { url: "https://eltiempo.com/a", title: "ya" },
      { url: "https://reliefweb.int/report/colombia/nuevo-terremoto", title: "nuevo" },
    ],
    known,
  );
  assert.equal(nuevas.length, 1);
  assert.match(nuevas[0].url, /reliefweb/);
});

test("rastrear no escribe el JSON: solo propone URLs del listado", async () => {
  const html = `<a href="/report/colombia/sitrep-terremoto">Sitrep terremoto</a>
    <a href="https://example.com/spam">spam</a>
    <a href="/jobs/foo">empleo</a>
    <a href="/updates?search=Colombia%20earthquake%202026&amp;page=1">Page 2</a>`;
  const { nuevas } = await rastrear({
    fetchPage: async () => html,
    watch: {
      listados: ["https://reliefweb.int/updates?search=Colombia%20earthquake%202026"],
      dominios: ["reliefweb.int"],
    },
    flujos: { flows: [] },
    pulso: { events: [] },
  });
  assert.equal(nuevas.length, 1);
  assert.equal(
    nuevas[0].url,
    "https://reliefweb.int/report/colombia/sitrep-terremoto",
  );
});

test("extractAnchors resuelve rutas relativas", () => {
  const got = extractAnchors(
    `<a href="/report/colombia/x">Colombia earthquake update</a>`,
    "https://reliefweb.int/updates",
  );
  assert.equal(got[0].url, "https://reliefweb.int/report/colombia/x");
});
