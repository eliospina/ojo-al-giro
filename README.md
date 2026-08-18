# Ojo al Giro

Sitio: [ojo-al-giro.vercel.app](https://ojo-al-giro.vercel.app/)  
Código: [github.com/eliospina/ojo-al-giro](https://github.com/eliospina/ojo-al-giro)

Registro público, con fuente, de la ayuda anunciada a Colombia tras el sismo. Oferta no es giro.

```bash
git clone https://github.com/eliospina/ojo-al-giro.git
cd ojo-al-giro
python3 -m http.server 4174
```

Antes de abrir un PR:

```bash
node scripts/validar-flujos.mjs
node --test scripts/totals.test.mjs
```

No recibe fondos, no los administra y no los pide. Informa.

## Licencia

MIT.
