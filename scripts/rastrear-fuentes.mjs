import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const RELEVANTE = /terremoto|sismo|earthquake|ayuda humanitaria|humanitaria/i;
const UA = "curl/8.0 OjoAlGiro/1.0 (+https://ojo-al-giro.vercel.app/)";

export function normalizeUrl(raw) {
  try {
    const u = new URL(String(raw || "").trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    u.hash = "";
    for (const k of [...u.searchParams.keys()]) {
      if (/^(utm_|fbclid|oc$)/i.test(k) || k === "oc") u.searchParams.delete(k);
    }
    u.hostname = u.hostname.replace(/^www\./, "").toLowerCase();
    u.pathname = u.pathname.replace(/\/+$/, "") || "/";
    return u.toString();
  } catch {
    return "";
  }
}

export function hostOf(raw) {
  try {
    return new URL(raw).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export function ledgerUrls(flujos, pulso) {
  const urls = [];
  for (const f of flujos?.flows || []) {
    if (f.source?.url) urls.push(f.source.url);
  }
  for (const e of pulso?.events || []) {
    if (e.source?.url) urls.push(e.source.url);
  }
  return new Set(urls.map(normalizeUrl).filter(Boolean));
}

export function pickNuevas(found, known) {
  const seen = new Set();
  const out = [];
  for (const item of found) {
    const key = normalizeUrl(item.url);
    if (!key || known.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push({ ...item, url: item.url, key });
  }
  return out;
}

export function extractAnchors(html, pageUrl) {
  const out = [];
  const re = /<a\s[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    let href = m[1].trim().replace(/&amp;/g, "&");
    try {
      href = new URL(href, pageUrl).toString();
    } catch {
      continue;
    }
    const title = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    out.push({ url: href, title });
  }
  return out;
}

function loadJson(rel) {
  return JSON.parse(readFileSync(join(root, rel), "utf8"));
}

function allowedHost(url, dominios) {
  const host = hostOf(url);
  return dominios.some((d) => host === d.replace(/^www\./, "") || host.endsWith(`.${d.replace(/^www\./, "")}`));
}

async function leerListado(url) {
  const res = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow" });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

function relevante(item) {
  return RELEVANTE.test(`${item.title} ${item.url}`);
}

function esInforme(item) {
  const host = hostOf(item.url);
  if (host === "reliefweb.int") return /\/report\/colombia\//.test(item.url);
  if (/\/updates(\?|$)/.test(item.url) && /[?&]page=/.test(item.url)) return false;
  if (/^(current page|page \d+)/i.test(item.title || "")) return false;
  return true;
}

export async function rastrear({ fetchPage = leerListado, watch, flujos, pulso } = {}) {
  const cfg = watch || loadJson("scripts/fuentes-vigiladas.json");
  const known = ledgerUrls(flujos || loadJson("data/flujos.json"), pulso || loadJson("data/pulso.json"));
  const dominios = (cfg.dominios || []).map((d) => d.replace(/^www\./, ""));
  const found = [];
  const avisos = [];
  for (const page of cfg.listados || []) {
    try {
      const html = await fetchPage(page);
      for (const item of extractAnchors(html, page)) {
        if (!allowedHost(item.url, dominios)) continue;
        if (normalizeUrl(item.url) === normalizeUrl(page)) continue;
        if (!relevante(item) || !esInforme(item)) continue;
        found.push({ ...item, listado: page });
      }
    } catch (err) {
      avisos.push(`${page}: ${err.message || err}`);
    }
  }
  return { nuevas: pickNuevas(found, known).slice(0, 20), avisos, known: known.size };
}

function markdown(nuevas) {
  const lineas = [
    "El rastreador vio URLs que el registro aún no cita. No son cifras. Sin URL no entra monto. Oferta no es giro. En especie no es caja.",
    "",
  ];
  for (const item of nuevas) {
    const titulo = item.title || item.url;
    lineas.push(`- [${titulo}](${item.url})`);
  }
  lineas.push("", "Si alguna trae un monto con fuente, añadir una fila y abrir PR. Si duda, no publique.");
  return lineas.join("\n");
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  const { nuevas, avisos } = await rastrear();
  for (const a of avisos) console.error(`aviso: ${a}`);
  if (!nuevas.length) {
    console.log("Sin URLs nuevas.");
    process.exit(0);
  }
  const body = markdown(nuevas);
  console.log(body);
  const out = process.argv.includes("--out")
    ? process.argv[process.argv.indexOf("--out") + 1]
    : "";
  if (out) writeFileSync(out, body);
}
