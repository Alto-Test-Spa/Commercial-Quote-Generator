# CLAUDE.md — Propuesta Económica Alto Test

Contexto para retomar este proyecto sin releer todo. Aquí están las
**decisiones y las trampas**. Ver también el hermano
`../propuesta_tecnica/CLAUDE.md` (mismo autor, mismas convenciones de fondo,
pero stack distinto — no asumir que algo de allá aplica aquí sin revisar).

## Qué es

Plantilla editable en el navegador con la que Alto Test genera **cotizaciones
comerciales** (propuesta económica: ítems, cantidades, precios, IVA, total) y
las exporta a PDF imprimiendo directamente desde el navegador. Es un
documento que se vende, no un sitio web.

Alto Test SpA: ingeniería en protección contra caídas (Santiago). Repo:
`Alto-Test-Spa/Commercial-Quote-Generator`, se trabaja sobre `main`.

## Stack — un solo archivo

Todo vive en **`index.html`**: HTML + CSS + JS clásico, sin build, sin
módulos, sin dependencias propias. IBM Plex (Sans/Mono) por Google Fonts,
iconos Lucide por CDN jsDelivr. ~35 KB.

A diferencia de `propuesta_tecnica` (que separa `assets/contenido.js` +
`assets/app.js` + `assets/estilos.css`), este documento es corto y no
justifica esa separación todavía. Si crece mucho, considerar dividirlo, pero
no adelantarse.

**No usar `type="module"` ni `fetch()` de JSON local**: se abre con `file://`
y ambos fallan por CORS. El único `fetch` que hace (`fetchUF`) es a APIs
externas por `https://`, que sí funciona desde `file://`.

## Arquitectura

- **`state`** (objeto JS en memoria, `<script>` al final del `<body>`):
  `cur` (moneda activa, UF o CLP), `uf` (valor de la UF en CLP), `rows[]`
  (ítems de la cotización: `concepto`, `cant`, `precio`).
- **Filas de la tabla** (`renderRows`): cada fila se redibuja completa al
  agregar/eliminar; al escribir en un campo (`input`) sólo se recalcula el
  total de esa fila + los totales generales, para no perder el foco.
- **Precio de fila**: se guarda siempre en la moneda activa (`state.cur`).
  Al cambiar de UF↔CLP (`#curSeg`), se convierten todos los `precio`
  multiplicando/dividiendo por `state.uf` — así el valor real no cambia, sólo
  la unidad en que se muestra.
- **Formato de precio**: al hacer foco se muestra el número crudo (coma
  decimal, editable); al perder el foco se reformatea con separador de miles
  (`fmtPrecio`). Mismo patrón que usa Chrome para inputs de moneda.
- **Valor UF** (`fetchUF`): se resuelve según la **fecha de la propuesta**
  (`fechaFld`), no según "hoy". Cadena de fuentes:
  1. Caché en `localStorage` (`altotest_uf_cache`) por fecha ISO — evita
     reconsultar.
  2. `indicadoreconomico.cl/api/uf?fecha=YYYY-MM-DD` (histórico).
  3. `api.boostr.cl/economy/indicators.json` — respaldo, **sólo si la fecha
     pedida es hoy** (no tiene histórico).
  4. Si todo falla: queda el valor manual del input, sin inventar nada.
  Hay un secuenciador (`ufSeq`/`vigente()`) para que una consulta lenta no
  pise el resultado de una más reciente si el usuario cambia la fecha rápido.
- **Fecha**: autoformato progresivo mientras se escribe
  (`formateaFechaInput`, mete las barras) + validación real de calendario
  (`fechaValida`, rechaza 31/02, mes 13, etc.). Sólo dispara `fetchUF()`
  cuando el campo está completo (10 caracteres) y es válido.
- **Validación de RUT y correo** (`.fld[data-validate]`): RUT chileno con
  dígito verificador módulo 11 (`validaRut`); se formatea con puntos y guión
  sólo al perder el foco y si es válido (`formateaRut`). Correo: regex
  simple `^[^\s@]+@[^\s@]+\.[^\s@]+$`. Ambos marcan `.invalid` mientras se
  escribe y muestran/ocultan un `<span class="verr">` junto al label.
- **Autocrecimiento de texto**: `textarea.concepto` (una por fila), `#notes`,
  y los campos `textarea.fld.auto` de la ficha (`cliente`, `activo`,
  `direccion`, `correo`) usan el mismo patrón `autoGrow` (alto =
  `scrollHeight`) para que el texto largo empuje el campo hacia abajo en vez
  de cortarse. RUT, Fecha y Teléfono siguen siendo `<input>` normales: su
  formato es fijo y corto, no lo necesitan.
- **Persistencia (`Store`)**: todo lo editable se autoguarda en
  `localStorage` bajo `altotest_propuesta_economica_v1` — ficha de cliente,
  ítems, notas, título/subtítulo, la sección "¿Por qué Alto Test?", el
  eslogan del pie y el contacto comercial. Mecanismo genérico, sin modelo de
  datos aparte (a diferencia de `propuesta_tecnica`, que sí lo tiene): todo
  elemento con `data-persist="clave"` se lee/escribe directo contra el DOM
  (`.value` en inputs/textareas, `.textContent` en el resto). `Store.leer()`
  y `Store.aplicar(datos)` son el único punto de conversión DOM↔JSON — no
  duplicar esa lógica en otro lado.
  - **Nueva** (`Store.reiniciar`): respalda el estado actual en
    `..._anterior` y vuelve a `Store.defaults`, la plantilla tal como venía
    en el HTML — capturada una sola vez, al abrir la página, **antes** de
    restaurar nada (`Store.capturarDefaults()` corre antes que
    `Store.cargar()`; invertir ese orden captura como "default" lo último
    guardado, no la plantilla real).
  - **Deshacer** (`Store.deshacer`): sólo funciona entre un "Nueva" y la
    primera edición siguiente — la primera vez que se dispara `Store.guardar()`
    apaga `Store.respaldo` (mismo mecanismo que `propuesta_tecnica`).
  - Filas (`state.rows`) se clonan con `JSON.parse(JSON.stringify(...))` en
    `capturarDefaults`/`aplicar` (función `clonar`). Sin esto, `state.rows`
    y `Store.defaults.rows` terminan siendo el mismo array — agregar un ítem
    después de "Nueva" ensucia silenciosamente la plantilla en blanco.
    Verificado con una prueba jsdom aparte (ver "Verificación" abajo).
  - Enter está bloqueado (`bloquearEnter`) en los campos nuevos —
    `cliente`/`activo`/`direccion`/`correo` y todo el texto `contenteditable`
    (título, subtítulo, "por qué", eslogan): son campos de una sola idea que
    crecen envolviendo el texto, no por saltos de línea. `concepto` y
    `notes` sí permiten Enter (prosa real), no tocar ese comportamiento.
  - Código de cotización (`#codeOut`) y fecha ahora **persisten entre
    recargas** en vez de regenerarse siempre: `initHead(forzar)` sólo genera
    un código/fecha nuevos si vienen vacíos o si `forzar===true` (lo usa
    `Store.reiniciar`). Antes se regeneraban en cada carga de página.
- **Texto editable fuera de la ficha**: título (`#docTitle`), subtítulo
  (`#docSubtitle`), el párrafo y las 5 tarjetas de "¿Por qué Alto Test?"
  (`why1Titulo`…`why5Desc`), y el eslogan del pie (`sloganBig`/`sloganDesc`)
  son `contenteditable="true"` con `data-persist`. Se guardan como texto
  plano (`.textContent`, no `.innerHTML`) — **por eso el `<b>` que resaltaba
  "nos convertimos en un socio técnico" en el párrafo de "por qué" se quitó**;
  si se necesita negrita ahí de nuevo, hay que decidir cómo sanear HTML
  (mismo problema que resolvió `propuesta_tecnica` con sus campos `.rich`) en
  vez de usar `.textContent` a secas.
- **Tarjetas quitables de "por qué"** (`data-oculto-key`, segundo mecanismo
  de persistencia además de `data-persist`): vaciar el texto de una tarjeta
  la dejaba visualmente vacía (icono solo, hueco en la grilla) — no servía
  para "no vendo esto". Cada `.why-item` tiene un botón `×`
  (`[data-why-del]`, `no-print`) que le pone `hidden` a la tarjeta entera;
  `actualizarWhyGrid()` recalcula `--n` (columnas visibles de
  `.why-grid{grid-template-columns:repeat(var(--n,5),1fr)}`) y mueve la
  clase `.sin-borde` a la última tarjeta *visible* — no se puede usar
  `:last-child` en CSS porque una tarjeta oculta sigue siendo el último hijo
  del DOM. Las tarjetas ocultas aparecen como chips "+ Título" en
  `#whyRestaurar` (debajo de la grilla, `no-print`) para deshacer el quite
  sin pasar por "Deshacer" global. `Store.leer()`/`aplicar()` persisten
  `el.hidden` de cada `[data-oculto-key]` igual que cualquier `data-persist`
  — es el mismo mecanismo genérico, sólo que el valor es booleano en vez de
  texto.
- **Impresión**: `@page{size:21.6cm 33cm}` (Oficio, formato chileno estándar
  para propuestas). `.sheet` pasa de altura fija (pantalla) a `height:auto`
  (impresión) para que el contenido fluya a varias hojas si no cabe en una.
  `table.items thead{display:table-header-group}` repite el encabezado de la
  tabla en cada hoja nueva.

## Invariantes — romperlas rompe el documento

1. **Todo control de edición lleva `no-print`** (botón × de fila, "Agregar
   concepto"). Ya se corrigió una vez que se filtraran al PDF.
2. **El precio se guarda en la moneda activa, nunca mezclado.** Cualquier
   cambio a la lógica de moneda debe pasar por el mismo punto de conversión
   (`factor = to==='CLP' ? state.uf : 1/state.uf`) o los totales quedan mal.
3. **`fetchUF` nunca debe usar la fecha de "hoy" cuando el usuario pidió otra
   fecha.** Es la razón de ser de la caché por fecha y del respaldo boostr
   condicionado — antes de esto la UF podía quedar mal para cotizaciones con
   fecha distinta a la de creación.
4. **Todo campo persistente lleva `data-persist="clave"` y nada más.** El
   `Store` no tiene una lista aparte de campos — recorre `[data-persist]`
   directo. Agregar un campo editable nuevo es: el atributo en el HTML +
   (si es de una sola idea) `class="fld auto"` o `contenteditable="true"` +
   dejar que `wirePersistCampos()` lo conecte solo. No hace falta tocar
   `Store.leer`/`Store.aplicar`.
5. **`Store.capturarDefaults()` va antes que `Store.cargar()`**, siempre.
   Es lo que le da a "Nueva" una plantilla real que restaurar en vez de lo
   último guardado.
6. **Sin dependencias nuevas** más allá de Google Fonts y Lucide. Un ícono
   Lucide inventado no falla, simplemente no dibuja nada — revisar contra
   https://lucide.dev si se agrega uno.

## Verificación (no hay navegador en el entorno)

```bash
node --check <(sed -n '/<script>/,/<\/script>/p' index.html | sed '1d;$d')
```

Para probar `Store` de verdad (autoguardado, "Nueva", "Deshacer", que no se
mezclen `state.rows` con `Store.defaults.rows`) se usó `jsdom` en el
scratchpad: extraer el `<script>` inline y correrlo con `window.eval()` dos
veces — una vez "en frío" para escribir datos y esperar el autoguardado
(hay que dejar correr el debounce de 400 ms), otra con un `JSDOM` nuevo que
comparte el mismo `localStorage` a mano (cada instancia de `jsdom` tiene el
suyo) para simular la recarga. **Ojo**: `window.eval()` aísla cada llamada —
`const Store`/`state` declarados ahí no quedan colgando de `window`; hay que
exponerlos al final del *mismo* `eval` (`window.__Store = Store;`) o la
siguiente llamada no los ve. Mismo problema que ya documentó
`propuesta_tecnica/CLAUDE.md` para su propio `app.js`. `scrollHeight` da
siempre `0` en `jsdom` (no hay layout real), así que `autoGrow` no se puede
verificar por altura ahí — sólo que corre sin tirar error.

## Sesión 17/08/2026 — inputs que se autoajustan, persistencia y texto editable

A partir de una captura de pantalla del campo **Correo** cortando el texto
(`mayordomo.conquistanicasio(...` ilegible) y del pedido de Matías de tener
"esa especie de persistencia local que tiene la propuesta técnica":

1. **Overflow de Correo/Dirección** — eran `<input>` de una sola línea con
   ancho fijo; un correo o dirección largos se salían del campo visible.
   Cliente, Activo, Dirección y Correo pasaron a `<textarea rows="1"
   class="fld auto">` con `autoGrow` (mismo patrón que ya usaban `concepto`
   y `notes`). RUT, Fecha y Teléfono quedaron como `<input>` — su formato es
   corto y fijo, no lo necesitan.
2. **Persistencia local completa** — se agregó `Store` (ver "Arquitectura").
   Autoguarda todo lo editable en `localStorage`, con botones **Nueva**
   (vuelve a la plantilla en blanco, respaldando lo actual) y **Deshacer**
   (recupera ese respaldo mientras no se edite nada más) en el toolbar,
   replicando el patrón de `propuesta_tecnica` — pero **sin** el modelo de
   datos separado (`plantilla()`/`S()`) que tiene ese proyecto: aquí el DOM
   sigue siendo la fuente de verdad, `Store` sólo lee/escribe por
   `data-persist`. Es la decisión correcta para un archivo de este tamaño;
   si crece mucho, reconsiderar.
3. **Texto editable fuera de la ficha** — motivo: Camilo no siempre vende
   sistemas anticaídas, y la sección "¿Por qué Alto Test?" (Diagnóstico /
   Ingeniería / Instalación / Certificación / Seguimiento) quedaba forzada
   para otro tipo de venta. Ahora título, subtítulo, el párrafo y las 5
   tarjetas de esa sección, y el eslogan del pie son editables
   (`contenteditable`) y persisten igual que los campos de la ficha.

**17/08/2026, más tarde**: Matías probó la sección "por qué" y detectó que
vaciar el texto de una tarjeta (ej. "Diagnóstico") la dejaba con el icono
solo y un hueco raro en la grilla — faltaba poder quitar el paso completo,
no sólo su texto. Se agregó el botón `×` por tarjeta + chips para
restaurar (`data-oculto-key`, ver "Arquitectura"). Sigue habiendo sólo 5
slots fijos con sus 5 íconos fijos — no se puede agregar un paso nuevo
distinto de los 5 originales, sólo ocultar/restaurar esos 5. Si hiciera
falta un 6° paso o cambiar el ícono de alguno, es un cambio más grande
(elegir ícono de una lista Lucide) — no se implementó sin que lo pidiera.

**Pendiente, no implementado — para decidir con Matías si hace falta:**
- Si "Nueva" debería reiniciar *todo* (como quedó, calcado de
  `propuesta_tecnica`) o sólo los datos de la cotización (cliente, ítems,
  notas) y **no** el texto editado de "¿Por qué Alto Test?"/eslogan — porque
  ese texto es más una configuración del tipo de venta que dato de un
  cliente puntual, y con el comportamiento actual Camilo tendría que
  reescribirlo cada vez que arranca una cotización nueva del mismo rubro no
  anticaídas. Si esto molesta en la práctica, la solución es separar
  "plantilla de venta" de "datos de la cotización" en dos claves de
  `localStorage` distintas — no forzarlo sin que él lo pida.
- El párrafo de "por qué" perdió el `<b>` que resaltaba una frase (ver
  Arquitectura, "Texto editable fuera de la ficha") al pasar a texto plano.

## Sesión 17/08/2026 — descuento % antes del IVA

Camilo pidió poder aplicar un % de descuento editable sobre el neto, antes
del IVA. Se agregó una fila **Descuento** en `.totals`, entre "Subtotal
neto" e "IVA 19%": un `<input id="descuentoPct" data-persist="descuentoPct">`
inline en el label (no un ítem más de la tabla) — persiste solo, sin tocar
`Store.leer`/`aplicar`, vía el mecanismo genérico de `[data-persist]`
(invariante 4).

- Orden de cálculo en `renderTotals()`: `neto → descuento (%) → IVA 19% →
  total`. El IVA se calcula sobre el neto *después* de descontar, no antes
  — es el pedido explícito ("antes del IVA, sobre el neto").
- El input se clampa a `[0,100]` en el propio listener de `input` (mismo
  patrón que `cant` no-negativo en las filas), y dispara `renderTotals()`
  directo — aparte del `Store.guardar()` genérico que ya le conecta
  `wirePersistCampos()` por tener `data-persist`.
- Es un solo % global sobre el total de la cotización, no por ítem —
  Camilo no pidió descuento por línea, no se implementó.
- Al ser un porcentaje (no un monto en UF/CLP), no necesita pasar por el
  factor de conversión de moneda (invariante 2) al cambiar UF↔CLP — se
  reaplica solo porque `renderTotals()` recalcula el monto en la moneda
  activa cada vez.
