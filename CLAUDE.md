# CLAUDE.md — Propuesta Económica (reescritura en React)

Contexto para retomar este proyecto sin releer todo el chat. Aquí están las
**decisiones y las trampas**, no un tutorial de React.

## Qué es

**Reescritura completa en Vite+React+TS de `../propuesta_economica`** (que
queda como vanilla HTML/CSS/JS, ahora solo de referencia histórica — ver el
aviso al inicio de su `CLAUDE.md`). **Este es el que está en producción**
desde el 2026-08-20: `quotegenerator.altotest.cl` (Vercel, cuenta personal
de Matías, no la de Alto Test en Cloudflare) sirve este build. Ver
"Despliegue" más abajo para el detalle de cómo quedó el repo/hosting.

**Por qué esta reescritura:** no fue por moda de stack. `propuesta_economica`
es un solo `index.html` de ~35KB sin separación de responsabilidades (HTML,
CSS y ~500 líneas de JS todo junto) — mantenible mientras era chico, cada vez
menos a medida que creció (UF con caché, validación de RUT, tarjetas
removibles, moneda dual). El mismo argumento que rechazó React para
`propuesta_tecnica` en su momento ("sólo pinta HTML fijo, cuesta 1.3MB por
apertura") no aplica acá de la misma forma: el problema de origen es SRP, no
bundle size. Ver el hilo de decisión completo en
`../../informes/informe_levantamiento/CLAUDE.md` si hace falta más contexto
— ahí se armó primero este mismo argumento para el otro documento hermano.

**Fidelidad de comportamiento, no sólo de diseño:** cada pieza de lógica del
original (algoritmo de RUT módulo 11, caché de UF por fecha con
secuenciador, orden de cálculo neto→descuento→IVA→total, autoformato de
fecha, moneda dual con conversión real) se portó tal cual, leyendo el
`index.html` original completo línea por línea antes de escribir código
nuevo — no se rehizo "a la mejor forma que se me ocurra", se replicó.

## Stack

Idéntico al de `informe_levantamiento` (mismo autor, mismas convenciones):
Vite 8 + React 19 + TypeScript + Tailwind v4, `reicon-react`, código en
inglés/comentarios en español/contenido del documento en español. Puerto de
dev fijo `5211` (informe_levantamiento usa 5210, no colisionan).

```bash
npm run dev      # localhost:5211
npm run build    # tsc -b && vite build
npm run lint     # oxlint
```

**Backend: el mismo Worker compartido** (`altotest-documentos`, código en
`../../informes/informe_levantamiento/worker/`) — `kind = "economica"` en
la ruta. Ver ese `CLAUDE.md`, sección "Arquitectura de datos", para el
contrato completo (`{code, client, date, doc}`). No se creó un Worker nuevo.

## Arquitectura

```
src/
  App.tsx              portón de acceso (idéntico al de informe_levantamiento)
  QuoteEditor.tsx        el documento: orquesta Toolbar + ficha + secciones + pie,
                         y el flujo de moneda/UF (ver abajo)
  types.ts                QuoteState, ItemRow, WhyItem
  lib/
    template.ts            initialTemplate() — la plantilla en blanco, con los 5
                            pasos de "¿Por qué Alto Test?" ya redactados
    store.ts                useQuoteStore: mismo patrón que informe_levantamiento
                            (nube como fuente de verdad, mirror local de resiliencia)
    api.ts                   fetchReport/saveReport/listReports/deleteReport, kind="economica"
    format.ts                 formatCLP/formatUF/currencyPair/parseNumber/formatPrice —
                              toda la aritmética de moneda vive acá, un solo lugar
    validate.ts                isValidRut (módulo 11) + formatRut + cleanRutInput,
                                isValidEmail, isValidPhone + formatPhone + cleanPhoneInput
    date.ts                     autoformato/validación de fecha, conversión a ISO
    uf.ts                        fetchUF: caché por fecha + secuenciador + las mismas
                                 2 fuentes (indicadoreconomico.cl, boostr.cl de respaldo)
    code.ts                      generateCode() (folio COT-), isValidCode(), generateId()
  components/
    Toolbar.tsx, HistoryMenu.tsx, SyncStatus.tsx, AccessGate.tsx   no-print / infra —
      calcados de informe_levantamiento, sólo cambia el tipo de dato que manejan
    ClientFields.tsx        ficha de cliente (RUT/correo/teléfono/fecha validados en vivo)
    DatePicker.tsx             calendario propio en popover para Fecha — no es
                                <input type=date> nativo, ver "Validación de campos"
    WhySection.tsx            "¿Por qué Alto Test?" — 5 tarjetas removibles
    ItemsTable.tsx              tabla de ítems (precio: crudo al enfocar, formateado al salir)
    TotalsBox.tsx                 notas + desglose de totales
    DocFooter.tsx                  emisor (fijo) + contacto comercial + eslogan (editables)
    EditableText.tsx                campo de una sola idea (sin Enter) — no hace falta un
                                    RichText acá, ningún campo de este documento admite párrafos
    AutoTextarea.tsx                 autoajuste 100% CSS (`.grow-wrap`), ver abajo
    Logomark.tsx, Wordmark.tsx        **variante SIN anclajes** — ver "Marca"
```

## Por qué `AutoTextarea` usa CSS puro y no `scrollHeight`

Mismo problema que ya documentó `merakilabs/propuestas/generador/CLAUDE.md`
(sección "grow-wrap"): medir el alto con `el.scrollHeight` y fijarlo con
`el.style.height` se desincroniza entre pantalla e impresión porque el
tamaño de fuente cambia entre medios — deja hueco vacío debajo del texto en
el PDF. El truco `.grow-wrap` (`index.css`) usa un `::after` invisible con
el mismo texto superpuesto en la misma celda de CSS Grid: el contenedor
mide lo que el texto necesita, recalculado en cada reflow, sin JS. Se portó
tal cual desde `generador/`, no se reinventó.

## Flujo de moneda y UF (`QuoteEditor.tsx`, `lib/uf.ts`)

- **Los precios de los ítems se guardan siempre en la moneda activa**
  (`quote.currency`). Cambiar de UF↔CLP (`onCurrencyChange` en
  `QuoteEditor.tsx`) convierte todos los precios multiplicando/dividiendo
  por `quote.ufValue` — el valor real no cambia, sólo la unidad en que se
  muestra. Mismo invariante que la vanilla.
- **El valor UF se resuelve según la fecha de la propuesta**, no según
  "hoy" — es la razón de ser de `lib/uf.ts` (caché por fecha + secuenciador
  para que una consulta lenta no pise el resultado de una más reciente si
  el usuario cambia la fecha rápido). `ClientFields` llama
  `onDateValidated(fecha)` sólo cuando la fecha está completa y pasa
  `isValidDate` — no en cada tecla.
- El input manual de UF en el Toolbar (`onManualUF`) pisa el valor sin
  volver a consultar — mismo comportamiento que la vanilla ("· manual").

## Validación de campos (`lib/validate.ts`, `ClientFields.tsx`, `DatePicker.tsx`)

Pedido explícito de Matías, **más estricto que el original** (el vanilla no
validaba teléfono ni limitaba largo de tipeo) — no es fidelidad 1:1 acá a
propósito:

- **RUT**: módulo 11 (`isValidRut`) igual que siempre, pero además
  `cleanRutInput` corta lo que se tipea en vivo a 9 "dígitos" (8 del cuerpo +
  1 verificador, que puede ser `K`) — antes se podía seguir escribiendo sin
  límite (`11.111.111-1111111`) y sólo se marcaba inválido, ahora no deja
  seguir.
- **Correo**: `isValidEmail` es un regex más estricto que el original —
  rechaza dominios con punto al inicio o dobles puntos (`asd@..l-133123F`
  pasaba antes, ahora no) y exige un TLD de solo letras al final.
- **Teléfono**: nuevo, no existía en el vanilla. `isValidPhone` exige 9
  dígitos empezando en 9 (celular chileno), con o sin el `56` del código de
  país. `cleanPhoneInput` corta el tipeo a 11 dígitos en vivo (mismo criterio
  que el RUT). `formatPhone` autoformatea a `+56 9 XXXX XXXX` al perder el
  foco — mismo patrón que `formatRut`.
- **Fecha**: sigue aceptando tipeo manual con máscara `dd/mm/aaaa`
  (`formatDateInput`/`isValidDate`, sin cambios), pero ahora hay además un
  **datepicker propio** (`DatePicker.tsx`, no `<input type=date>` nativo —
  decisión explícita para tener el mismo look en cualquier navegador y
  controlar el formato exacto). Es un popover con grilla de 6×7 días,
  navegación de mes, hoy/seleccionado resaltados; se cierra con click afuera
  o Escape. El botón y el popover llevan `.no-print` — no deben aparecer en
  el PDF, solo el texto ya tipeado en el input.
- El patrón `useValidated` (dentro de `ClientFields.tsx`) es genérico: recibe
  `validate`/`format` y expone `invalid`/`onBlur`/`onInput` — se usa igual
  para RUT, correo y teléfono. Si se agrega un campo validado nuevo, seguir
  ese mismo patrón en vez de inventar uno.

## Ficha de cliente: por qué el grid es de 8 columnas y no 4

`.client-grid` originalmente calcaba el vanilla (`repeat(4,1fr)`, Dirección
con `grid-column:span 2`) — con eso Correo quedaba en 1/4 del ancho de fila y
un correo largo (`cristobal.contreras@cbre.com`) se cortaba a media palabra.
Se pasó a `repeat(8,1fr)` para poder repartir en octavos: Dirección bajó de
4/8 a 3/8, Correo subió de 2/8 a 3/8, Teléfono se mantuvo en 2/8. Mismo "bug"
existe en el vanilla original — acá se corrigió a pedido explícito, no es
fidelidad ciega.

## Marca — sin la variante de anclajes

`Logomark.tsx`/`Wordmark.tsx` acá son la versión **plana** (puntos simples
en los extremos de la catenaria), igual a `site/`. La variante con placa+
perno es específica de `informe_levantamiento` (ese documento trata de
anclajes); no tiene sentido en una cotización comercial genérica. Si se
toca el isotipo en algún proyecto, revisar cuál de las dos variantes
corresponde antes de copiar sin pensar.

## Verificado

Con Playwright (headless, no hay navegador con GUI en el entorno): portón de
acceso, guardado/carga contra el Worker en producción, historial cruzado
entre dos perfiles de navegador distintos (simulando dos dispositivos), RUT/
correo/teléfono válido/inválido con los topes de tipeo, datepicker, PDF a
tamaño Oficio (21.6×33cm, coincide exacto). Screenshots comparados pixel a
pixel contra el sitio en producción antes del reemplazo (headers, pie,
tabla, totales) — se cazaron y corrigieron ahí mismo dos bugs reales de
fidelidad: el logo del encabezado del documento (usaba el componente
genérico `Logomark` en vez de replicar el `.wm`+SVG del original) y el pie
de página no llegaba al fondo de la hoja (faltaba `display:flex` en
`.sheet` + `flex:1` en `.doc-body`, que en el original fuerza el pie al ras
incluso en pantalla, no solo al imprimir).

## Despliegue (ya hecho, 2026-08-20)

**Este proyecto reemplazó al original en el mismo repo.** No se creó un repo
nuevo — `Alto-Test-Spa/Commercial-Quote-Generator` es el mismo, pero su
`main` ahora tiene el árbol de archivos de este proyecto:

1. Se armó git acá (`git init`, este proyecto no tenía) y se pusheó como
   rama `react-rewrite` (no directo a `main`) — para no tocar producción
   antes de probar.
2. Vercel (el hosting real de `quotegenerator.altotest.cl` — está en la
   cuenta **personal** de Matías, no en la de Alto Test en Cloudflare, y no
   apareció en ningún listado de la API de Cloudflare por eso) crea Preview
   Deployments automáticos por rama. Se configuró ahí
   `VITE_REPORTS_ENDPOINT` como variable de entorno y se confirmó Framework
   Preset = Vite.
3. Se verificó el preview y se promovió manualmente a producción desde el
   dashboard de Vercel (botón "Promote to Production") — esto NO cambia qué
   rama considera Vercel su "Production Branch" (seguía siendo `main`).
4. Para que el historial de git no quedara inconsistente con lo que ya
   estaba en vivo (si alguien pusheaba a `main` sin saber, Vercel iba a
   redesplegar el vanilla viejo encima sin aviso), se mergeó `react-rewrite`
   sobre `main` con `git merge --allow-unrelated-histories -X theirs`
   (los historiales no comparten commit base — este repo se inicializó de
   cero, no se clonó del original) y se pusheó. GitHub **no deja abrir un
   PR entre historiales sin ancestro común** ("There isn't anything to
   compare") aunque sí muestra el diff — por eso el merge se hizo local y
   se pusheó directo, con confirmación explícita del usuario antes del push
   a `main` (bloqueado una vez por el clasificador de auto-mode, reintentado
   tras pedir permiso).
5. `../propuesta_economica` (vanilla) quedó como carpeta local histórica un
   tiempo — **se borró del disco el 2026-08-20**, una vez que se repitió
   este mismo procedimiento con `propuesta_tecnica_react` y el usuario pidió
   dejar una sola carpeta por documento. Su historial completo sigue en
   GitHub como el otro padre del commit de merge (`git log --all` /
   `git show <hash>:archivo` desde acá).

**Guardado automático — no dispara hasta la primera edición real** (fix del
2026-08-20, ver `lib/store.ts`): `quote` nace de `initialTemplate()` en el
primer render, y sin protección el guardado a los 400ms creaba una
cotización permanente en el Worker con sólo abrir la app. Se compara contra
una foto de `quote` del primer render (por referencia, no un flag booleano
de una sola consumición — falla bajo React StrictMode). Particularidad acá:
el `useEffect` de `refetchUF()` en `QuoteEditor.tsx` también cambia
`quote.ufValue` sin que el usuario edite nada, así que la comparación
ignora ese campo puntual al decidir si la cotización sigue "prístina".
Mismo fix aplicado el mismo día en `informe_levantamiento` y
`propuesta_tecnica_react`.

**Pendiente**: confirmar en Vercel (Settings → Git) que la Production
Branch quedó en `main` y no en `react-rewrite` tras el promote manual —
si no, los próximos pushes a `main` no se despliegan solos. Migrar
cualquier cotización que Camilo tuviera guardada solo en el `localStorage`
del navegador viejo (no hay forma automática, vivía fuera del Worker, y la
carpeta que la hubiera tenido en pantalla ya no existe).
