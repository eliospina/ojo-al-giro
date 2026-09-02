const MESES_LARGOS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const filaSel = document.getElementById("peticion-fila");
const entidadSel = document.getElementById("peticion-entidad");
const municipioInput = document.getElementById("peticion-municipio");
const peticionOut = document.getElementById("peticion-out");
const peticionStatus = document.getElementById("peticion-status");
const peticionBtn = document.getElementById("peticion-copiar");

let peticionVisible = false;

function hoyLargo() {
  const d = new Date();
  return `${d.getDate()} de ${MESES_LARGOS[d.getMonth()]} de ${d.getFullYear()}`;
}

function fichaUrl(id) {
  if (location.protocol.startsWith("http")) {
    return `${location.origin}${location.pathname}#f-${id}`;
  }
  return `https://ojo-al-giro.vercel.app/#f-${id}`;
}

function dato(value) {
  return typeof displayValue === "function" ? displayValue(value) : value || "—";
}

function llenarFilas() {
  if (!filaSel) return;
  const flows = window.LEDGER_FLOWS || [];
  const previo = filaSel.value;
  filaSel.replaceChildren();
  for (const flow of flows) {
    const option = document.createElement("option");
    option.value = flow.id;
    const sinLugar = isEn() ? "no municipality" : "sin municipio";
    option.textContent = isGap(flow.territory) ? `${flow.origin} — ${sinLugar}` : flow.origin;
    filaSel.append(option);
  }
  if (previo && flows.some((flow) => flow.id === previo)) filaSel.value = previo;
}

function filaActual() {
  const flows = window.LEDGER_FLOWS || [];
  return flows.find((flow) => flow.id === filaSel?.value) || flows[0] || null;
}

function armarPeticion() {
  const flow = filaActual();
  if (!flow) {
    return isEn()
      ? "The record has not loaded yet."
      : "El registro aún no se ha cargado.";
  }
  const entidad = entidadSel?.value || "[entidad]";
  const municipio = String(municipioInput?.value || "").trim();
  const fuente = flow.source?.url
    ? `${flow.source.name || "fuente"} — ${flow.source.url}`
    : dato(flow.source?.name);

  return [
    `[ciudad], ${hoyLargo()}`,
    "",
    "Señores",
    entidad,
    "",
    "Asunto: derecho de petición de información sobre la destinación de la ayuda anunciada tras el sismo del 10 de agosto de 2026.",
    "",
    "Yo, [su nombre completo], identificado(a) con cédula de ciudadanía [su número], con correo electrónico [su correo] para recibir notificaciones, en ejercicio del derecho de petición del artículo 23 de la Constitución Política, regulado por la Ley 1755 de 2015, solicito la siguiente información pública.",
    "",
    "Anuncio objeto de la solicitud",
    `Origen: ${dato(flow.origin)}`,
    `Monto o ayuda en especie anunciada: ${dato(flow.amount)}`,
    `Estado según la fuente: ${dato(flow.status)}`,
    `Ruta anunciada: ${dato(flow.route)}`,
    `Municipio en la fuente: ${dato(flow.territory)}`,
    `¿Llegó?: ${dato(flow.executed)}`,
    `Fuente pública: ${fuente}`,
    `Ficha del registro: ${fichaUrl(flow.id)}`,
    "",
    "Peticiones concretas",
    "1. A qué municipios se destinó este recurso o esta ayuda en especie, con la cantidad asignada a cada uno.",
    "2. Cuánto se ha ejecutado o entregado a la fecha y cuánto está pendiente.",
    "3. Por qué canal se ejecutó: entidad ejecutora, operador, convenio o contrato, con número y fecha.",
    "4. Fechas de entrega y soporte documental de la misma (actas, planillas o registros), sin datos personales de los beneficiarios.",
    "5. Si esta entidad no es la competente, solicito el traslado a la que lo sea y que se me informe, conforme al artículo 21 de la Ley 1755 de 2015.",
    municipio ? "" : null,
    municipio ? `Solicito en particular la información correspondiente al municipio de ${municipio}.` : null,
    "",
    "Esta petición no formula acusación alguna y no solicita dinero: pide información pública. Conforme al artículo 14, numeral 1, de la Ley 1755 de 2015, las peticiones de información y de documentos deben resolverse dentro de los diez (10) días siguientes a su recepción.",
    "",
    "Agradezco la respuesta al correo indicado.",
    "",
    "Atentamente,",
    "",
    "[su nombre completo]",
    "Cédula [su número]",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

function pintarPeticion() {
  if (!peticionVisible || !peticionOut) return;
  peticionOut.textContent = armarPeticion();
}

if (peticionBtn) {
  llenarFilas();
  peticionBtn.addEventListener("click", async () => {
    peticionVisible = true;
    const texto = armarPeticion();
    peticionOut.hidden = false;
    peticionOut.textContent = texto;
    try {
      await navigator.clipboard.writeText(texto);
      peticionStatus.textContent = isEn()
        ? "Request copied. Complete your name, ID number and email address, then file it with the authority. This page does not file it."
        : "Derecho de petición copiado. Complete su nombre, número de cédula y correo electrónico, y radíquelo ante la entidad. Esta página no lo radica.";
    } catch {
      peticionStatus.textContent = isEn()
        ? "Copy the text below. Complete your name, ID number and email address before filing it."
        : "Copie el texto que aparece abajo. Complete su nombre, número de cédula y correo electrónico antes de radicarlo.";
    }
  });
  filaSel?.addEventListener("change", pintarPeticion);
  entidadSel?.addEventListener("change", pintarPeticion);
  municipioInput?.addEventListener("input", pintarPeticion);
}

document.addEventListener("veeduria:flujos", () => {
  llenarFilas();
  pintarPeticion();
});

document.addEventListener("veeduria:lang", () => {
  llenarFilas();
  pintarPeticion();
});
