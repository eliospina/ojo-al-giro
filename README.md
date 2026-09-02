# Ojo al Giro

Sitio: [ojo-al-giro.vercel.app](https://ojo-al-giro.vercel.app/)  
Código: [github.com/eliospina/ojo-al-giro](https://github.com/eliospina/ojo-al-giro)

Registro público y documentado de la ayuda anunciada a Colombia tras el sismo del 10 de agosto de 2026. Cada cifra se publica con su fuente verificable, y el registro distingue de forma explícita entre lo anunciado, lo desembolsado y lo entregado. Una oferta anunciada no equivale a un giro.

El objeto de este registro es la trazabilidad, no la necesidad. No estima cuántas personas siguen sin agua, alimentos, atención médica o vivienda, porque no levanta información en campo y ninguna de sus fuentes lo acredita. Documenta lo que sí es verificable: qué se anunció, quién lo anunció, por qué ruta, con qué fuente y si consta que haya llegado a algún municipio.

**¿Por qué «Ojo al Giro»?** Porque el objeto de seguimiento es precisamente ese: si la oferta se convierte en giro.

El titular consolida las donaciones anunciadas —sector privado colombiano y donaciones internacionales— en dólares. El crédito, las líneas contingentes y la ayuda en especie se muestran por separado, en tanto no son partidas comparables. La calculadora opera sobre los datos, no sobre valores fijados en el código: cada fila declara su `clase` y, si ya está contabilizada dentro de un agregado, su `dentro_de`. Las conversiones usan las tasas de cambio del bloque `fx`, cada una con fecha y fuente; sin tasa citada, la cifra se mantiene en su moneda de origen.

Cuando el municipio queda en «—», la página redacta un derecho de petición a partir de esa fila y de su fuente, para que cualquier persona pueda solicitar la información sobre el destino de los recursos. El trámite es gratuito y no requiere abogado (Ley 1755 de 2015, art. 13); una petición de información debe resolverse en diez días (art. 14). La página no envía ni radica la solicitud.

```bash
git clone https://github.com/eliospina/ojo-al-giro.git
cd ojo-al-giro
python3 -m http.server 4174
```

Antes de abrir un pull request:

```bash
node scripts/validar-flujos.mjs
node --test scripts/*.test.mjs
```

Este registro no recibe fondos, no los administra y no los solicita. Tampoco formula acusaciones ni certifica que la ayuda haya llegado a los hogares: informa y documenta.

## Licencia

MIT.
