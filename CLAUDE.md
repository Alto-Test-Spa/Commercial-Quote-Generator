# CLAUDE.md — Propuesta Económica (reescritura en React)

Contexto para retomar este proyecto sin releer todo el chat. Aquí están las
**decisiones y las trampas**, no un tutorial de React.

## Qué es

**Reescritura completa en Vite+React+TS de `../propuesta_economica`**, que
sigue siendo vanilla HTML/CSS/JS y **sigue siendo la que usa Camilo hoy**.
Este proyecto vive en paralelo, sin tocar el original, hasta que se pruebe
y se decida reemplazarlo — ver "Estado" más abajo.

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
    validate.ts                isValidRut (módulo 11) + formatRut, isValidEmail
    date.ts                     autoformato/validación de fecha, conversión a ISO
    uf.ts                        fetchUF: caché por fecha + secuenciador + las mismas
                                 2 fuentes (indicadoreconomico.cl, boostr.cl de respaldo)
    code.ts                      generateCode() (folio COT-), isValidCode(), generateId()
  components/
    Toolbar.tsx, HistoryMenu.tsx, SyncStatus.tsx, AccessGate.tsx   no-print / infra —
      calcados de informe_levantamiento, sólo cambia el tipo de dato que manejan
    ClientFields.tsx        ficha de cliente (RUT/correo/fecha validados)
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

## Marca — sin la variante de anclajes

`Logomark.tsx`/`Wordmark.tsx` acá son la versión **plana** (puntos simples
en los extremos de la catenaria), igual a `site/`. La variante con placa+
perno es específica de `informe_levantamiento` (ese documento trata de
anclajes); no tiene sentido en una cotización comercial genérica. Si se
toca el isotipo en algún proyecto, revisar cuál de las dos variantes
corresponde antes de copiar sin pensar.

## Estado — no es todavía el reemplazo

- **No sustituye a `../propuesta_economica`.** Ese proyecto vanilla sigue
  siendo la fuente real que usa Camilo; este vive en paralelo hasta
  probarse a fondo.
- Verificado con Playwright (headless, no hay navegador con GUI en el
  entorno): portón de acceso, guardado/carga contra el Worker en
  producción, historial cruzado entre dos perfiles de navegador distintos
  (simulando dos dispositivos), RUT válido/inválido, conversión de moneda,
  cálculo de totales, PDF a tamaño Oficio (21.6×33cm, coincide exacto).
  Screenshots comparados contra el diseño original — visualmente
  equivalente.
- **Pendiente antes de reemplazar el original**: que Matías/Camilo lo
  prueben de verdad en un caso real, decidir qué pasa con el repo git del
  original (¿se renombra este a `propuesta_economica` y el vanilla queda
  de respaldo con otro nombre? ¿se mantienen los dos un tiempo?), y migrar
  cualquier cotización que Camilo ya tenga guardada en el `localStorage`
  de la versión vieja (esa vive sólo en su navegador, no en el Worker — no
  hay forma automática de traerla, habría que pasarla a mano si hace falta
  conservarla).
