# Ojo al Giro — brief del agente

Proyecto voluntario, sin financiación ni equipo. No abrir rediseños ni sesiones largas. Un cambio pequeño con fuente, o nada.

Sitio: https://ojo-al-giro.vercel.app/
Repo: este. GitHub: eliospina/ojo-al-giro. Rama: main.

Este repo cubre solo el registro de ayuda. **No traer material, cifras ni vocabulario de otros proyectos.**

## Qué es

Gaceta cívica. Se sigue la ayuda anunciada tras el sismo del 10 ago 2026. Con fuente. El nombre recuerda que oferta no es giro.

El objeto es la trazabilidad, no la necesidad. **No escribir en presente el estado de quien espera**: el registro no levanta información en campo y ninguna de sus fuentes acredita cuántas personas siguen sin agua, alimentos, atención médica o vivienda. Lo que sí documenta: qué se anunció, quién lo anunció, por qué ruta, con qué fuente y si consta que llegó a un municipio. Al principio el sitio decía «gente esperando hospital, agua, comida y techo»; a tres semanas del sismo eso era una inferencia sin fuente y se quitó. No devolverla.

No administra fondos. No los pide. No acusa. No certifica que la ayuda haya llegado a los hogares. No inventa víctimas, municipios ni cifras. No es una veeduría institucional.

## Cifras

- Sin URL, no entra cifra. Poner —.
- El encabezado es la suma de lo donado: sector privado colombiano más donaciones internacionales, convertido a dólares. Esa cifra no la publica nadie más; aquí sí. No es plata girada ni entregada, y así se dice.
- La calculadora suma sobre los datos, no sobre una lista escondida en el código. Cada fila lleva `clase` (donacion, credito, linea, especie, personal, propuestas) y, si ya va contada dentro de otra, `dentro_de`. Para que algo entre o salga del total se cambia el dato, no el JavaScript.
- Los USD 1.300 millones son el corte de propuestas del 12 ago. No entran al titular: esa foto ya mezcla crédito y donación. Quien los quiera sumar los marca en la calculadora, y la página le avisa del traslape.
- Más de COP 2 billones es el agregado privado del corte 22 ago. Incluye ANDI y donantes nombrados por separado: por eso esas filas llevan `dentro_de` y no se vuelven a sumar.
- Crédito no es donación. Banco Mundial 200 (desembolsado al Gobierno) y BID 300 (tope de línea) no se mezclan con donaciones.
- En especie no es caja. 222,5 t es el agregado El Salvador + México + Chile + Perú: no volver a sumar país por país. 640 t (DIAN, aduana 12-18 ago) es otro corte: no se suma a las 222,5. Más de 80 t (Cancillería, 25 ago) es otro corte: no se suma a las 222,5 ni a las 640.
- Santo Domingo es parte de ANDI, no un total aparte.
- Chile en Pereira: llegó el avión al municipio. No es entrega a hogares.
- Las tasas de cambio viven en `fx` de `flujos.json`, en pesos por unidad, cada una con fecha y URL. No se inventan: sin tasa citada, la cifra se queda en su moneda y la calculadora lo dice. Las tasas envejecen; al mover el registro, revíselas.
- No publicar «Lo anunciado no es lo ejecutado» como eslogan. En el fondo sigue siendo verdad.

## Pedir cuentas

Donde el municipio queda en «—», la página arma un derecho de petición con esa fila y su fuente. La carta va en español siempre: es el idioma en que se radica.

- El validador (R13) exige que la carta conserve el artículo 23 de la Constitución, la Ley 1755 de 2015, el plazo de diez días del art. 14, el traslado del art. 21 y la frase que aclara que no acusa y no pide dinero. No la quite.
- La página no envía ni radica la petición. Lo dice, y se mantiene.
- No inventar entidades, correos ni enlaces de PQRS. Si no hay fuente del canal, se deja `[entidad]`.

## Cronología

`data/pulso.json` alimenta la cronología. Su `ledgerUpdated` debe coincidir con el `updated` de `data/flujos.json`: si añade una fila, mueva las dos fechas. El registro dice en la página de cuándo es; no lo esconda.

## Voz y diseño

Papel `#fbf7f0`, tinta `#1f1712`, marca `#c23018`. No volver al negro de tablero, al afiche en versalitas ni al manila sucio. Texto corto. Español primero. El chat pregunta ¿Llegó? y solo responde con el registro.

Antes de abrir PR: `node scripts/validar-flujos.mjs` y `node --test scripts/*.test.mjs`.

El job «Rastrear fuentes» mira un listado público cada día. Si hay una URL que el registro aún no cita, abre un issue. No escribe cifras ni toca `flujos.json`.

## Trabajo diario (si corre solo)

1. Buscar anuncios nuevos en fuentes públicas ya usadas (Cancillería, OCHA, EFE, El Tiempo, Infobae, bancos, gobiernos) y en issues «Fuentes para revisar».
2. Si no hay cifra nueva con URL, **no hacer commit**. Cerrar.
3. Si hay, añadir una fila al registro de flujos, con origen, monto, ruta, municipio o —, ¿llegó? o —, fuente con URL.
4. Correr el validador.
5. Abrir un **pull request**. No empujar a main. No desplegar a producción salvo orden de quien mantiene el repo. La revisión llega cuando pueda.
6. Un párrafo en el PR: qué se añadió y el enlace. Nada más.

Si duda, no publique.
