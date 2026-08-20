# Ojo al Giro — brief del agente

Proyecto voluntario, sin financiación ni equipo. No abrir rediseños ni sesiones largas. Un cambio pequeño con fuente, o nada.

Sitio: https://ojo-al-giro.vercel.app/
Repo: este. GitHub: eliospina/ojo-al-giro. Rama: main.

Este repo cubre solo el registro de ayuda. **No traer material, cifras ni vocabulario de otros proyectos.**

## Qué es

Gaceta cívica. Gente esperando hospital, agua, comida y techo. Se sigue la ayuda anunciada tras el sismo del 10 ago 2026. Con fuente. El nombre recuerda que oferta no es giro.

No administra fondos. No los pide. No acusa. No certifica que la ayuda haya llegado a las casas. No inventa víctimas, municipios ni cifras. No es una veeduría institucional.

## Cifras

- Sin URL, no entra cifra. Poner —.
- Oferta no es giro. El 1.300 millones USD es bolsa de ofertas, no un desembolso. No sumarlo con las líneas.
- Crédito no es donación. Banco Mundial 200 (desembolsado al Gobierno) y BID 300 (tope de línea) no se mezclan con donaciones.
- En especie no es caja. 222,5 t es el agregado El Salvador + México + Chile + Perú: no volver a sumar país por país.
- Santo Domingo es parte de ANDI, no un total aparte.
- Chile en Pereira: llegó el avión al municipio. No es entrega a hogares.
- No inventar tasas de cambio. GBP y CHF se dejan en su moneda.
- No publicar «Lo anunciado no es lo ejecutado» como eslogan. En el fondo sigue siendo verdad.

## Voz y diseño

Papel `#fbf7f0`, tinta `#1f1712`, marca `#c23018`. No volver al negro de tablero, al afiche en versalitas ni al manila sucio. Texto corto. Español primero. El chat pregunta ¿Llegó? y solo responde con el registro.

Antes de abrir PR: `node scripts/validar-flujos.mjs` y `node --test scripts/totals.test.mjs`.

## Trabajo diario (si corre solo)

1. Buscar anuncios nuevos en fuentes públicas ya usadas (Cancillería, OCHA, EFE, El Tiempo, Infobae, bancos, gobiernos).
2. Si no hay cifra nueva con URL, **no hacer commit**. Cerrar.
3. Si hay, añadir una fila al registro de flujos, con origen, monto, ruta, municipio o —, ¿llegó? o —, fuente con URL.
4. Correr el validador.
5. Abrir un **pull request**. No empujar a main. No desplegar a producción salvo orden de quien mantiene el repo. La revisión llega cuando pueda.
6. Un párrafo en el PR: qué se añadió y el enlace. Nada más.

Si duda, no publique.
