# Ojo al Giro

Sitio: [ojo-al-giro.vercel.app](https://ojo-al-giro.vercel.app/)  
Código: [github.com/eliospina/ojo-al-giro](https://github.com/eliospina/ojo-al-giro)

Registro público, con fuente, de la ayuda anunciada a Colombia tras el sismo. Oferta no es giro.

**¿Por qué «Ojo al Giro»?** Porque eso se vigila: si la oferta se vuelve giro.

Donde el municipio queda en «—», la página arma un derecho de petición con esa fila y su fuente, para que cualquiera pueda preguntar a dónde llegó. Es gratuito y no necesita abogado (Ley 1755 de 2015, art. 13); una petición de información se responde en diez días (art. 14). La página no la envía ni la radica.

```bash
git clone https://github.com/eliospina/ojo-al-giro.git
cd ojo-al-giro
python3 -m http.server 4174
```

Antes de abrir un PR:

```bash
node scripts/validar-flujos.mjs
node --test scripts/*.test.mjs
```

No recibe fondos, no los administra y no los pide. Informa.

## Licencia

MIT.
