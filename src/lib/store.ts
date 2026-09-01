import { useEffect, useRef, useState } from 'react'
import type { QuoteState } from '../types'
import { initialTemplate } from './template'
import { generateCode, isValidCode } from './code'
import { todayDate } from './date'
import { fetchReport, saveReport, ApiError } from './api'
import type { SyncState } from './api'

// La nube (Worker + KV) es la fuente de verdad — mismo modelo que informe_levantamiento.
// Este mirror local es sólo para no dejar la pantalla en blanco si el Worker no responde
// al abrir la app.
const MIRROR_KEY = 'altotest_propuesta_economica_mirror'
const PREVIOUS_KEY = `${MIRROR_KEY}_previous`

// Espera de inactividad antes de subir un cambio. Más alto = menos escrituras a
// KV (el plan free da 1000/día compartidas entre las tres apps); un párrafo
// escrito de corrido termina siendo un guardado en vez de varios. Costo: un
// cierre abrupto del navegador puede perder hasta estos ms de edición — el
// mirror local y el flush en `visibilitychange` lo mitigan.
const AUTOSAVE_DEBOUNCE_MS = 3000

// Firma del estado para el guard de no-op: si la `quote` actual serializa igual
// que la última subida con éxito, no se llama al Worker. Sin esto, cualquier
// cambio de `quote` que no toque el contenido gastaba una escritura KV igual.
// (El caso del auto-fetch de UF antes de la primera edición lo cubre aparte
// `isPristineIgnoringUf`; acá sí cuenta un cambio de UF, igual que hoy.)
function serialize(quote: QuoteState): string {
  return JSON.stringify(quote)
}

function withCodeAndDate(quote: QuoteState): QuoteState {
  return {
    ...quote,
    code: quote.code && isValidCode(quote.code) ? quote.code : generateCode(),
    date: quote.date || todayDate(),
  }
}

function readMirror(): QuoteState | null {
  const saved = localStorage.getItem(MIRROR_KEY)
  if (!saved) return null
  try {
    return { ...initialTemplate(), ...(JSON.parse(saved) as Partial<QuoteState>) }
  } catch {
    return null
  }
}

function writeMirror(quote: QuoteState) {
  try {
    localStorage.setItem(MIRROR_KEY, JSON.stringify(quote))
  } catch (e) {
    console.warn('No se pudo escribir la copia local de la cotización:', e)
  }
}

export function useQuoteStore(onAuthExpired: () => void) {
  const [quote, setQuote] = useState<QuoteState>(() => withCodeAndDate(readMirror() ?? initialTemplate()))
  const [canUndo, setCanUndo] = useState(() => !!localStorage.getItem(PREVIOUS_KEY))
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [booting, setBooting] = useState(() => !!readMirror())
  const firstChangeAfterReset = useRef(false)
  const saveSeq = useRef(0)
  // Si la sesión arranca sin mirror local, `quote` nace de initialTemplate() —
  // una cotización en blanco que nadie tocó. Sin esta guarda, el solo hecho de
  // abrir la app (o que la abra un bot, o correr un test) crea un documento
  // permanente en el Worker. Se compara contra una foto del `quote` del
  // primer render (por referencia, no un flag consumido una vez): React
  // StrictMode monta cada efecto dos veces en desarrollo (monta → limpia →
  // monta) y un flag booleano se "gasta" en la pasada fantasma, dejando la
  // real sin protección — probado en propuesta_tecnica_react, ver su
  // CLAUDE.md. Sólo aplica si no había mirror; una sesión que vuelve con
  // cambios sin sincronizar sigue guardando como siempre.
  const hadMirrorOnBoot = useRef(!!readMirror())
  const pristineQuote = useRef(quote)
  // ufValue se actualiza solo al montar (ver el useEffect de refetchUF en
  // QuoteEditor.tsx) — eso también cambia la referencia de `quote` sin que el
  // usuario haya escrito nada, así que una comparación estricta por
  // referencia marcaría la cotización como "tocada" apenas resuelve el
  // fetch. Se ignora ese campo puntual al decidir si sigue prístina.
  function isPristineIgnoringUf(a: QuoteState, b: QuoteState): boolean {
    return JSON.stringify({ ...a, ufValue: 0 }) === JSON.stringify({ ...b, ufValue: 0 })
  }
  // Semilla inmutable calculada una sola vez (useState perezoso) para no
  // re-serializar el documento entero en cada render. `lastSavedRef` se
  // actualiza tras cada guardado con éxito y tras el fetch inicial.
  const [initialSerialized] = useState(() => serialize(quote))
  const lastSavedRef = useRef(initialSerialized)
  const onAuthExpiredRef = useRef(onAuthExpired)
  useEffect(() => {
    onAuthExpiredRef.current = onAuthExpired
  })

  useEffect(() => {
    const mirror = readMirror()
    if (!mirror) return
    fetchReport(mirror.code)
      .then((fresh) => {
        setQuote(fresh)
        writeMirror(fresh)
        lastSavedRef.current = serialize(fresh)
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          onAuthExpiredRef.current()
          return
        }
        if (e instanceof ApiError && e.status === 404) return
        setSyncState('offline')
      })
      .finally(() => setBooting(false))
  }, [])

  useEffect(() => {
    if (!hadMirrorOnBoot.current && isPristineIgnoringUf(quote, pristineQuote.current)) {
      pristineQuote.current = quote // re-basar: el auto-fetch de la UF no cuenta como "tocado"
      return
    }
    const seq = ++saveSeq.current
    const t = setTimeout(async () => {
      const snapshot = serialize(quote)
      if (snapshot === lastSavedRef.current) return // nada nuevo que persistir
      writeMirror(quote)
      setSyncState('saving')
      try {
        await saveReport(quote)
        if (saveSeq.current === seq) {
          lastSavedRef.current = snapshot
          setSyncState('saved')
        }
      } catch (e) {
        if (saveSeq.current !== seq) return
        if (e instanceof ApiError) {
          if (e.status === 401) {
            onAuthExpiredRef.current()
            return
          }
          setSyncState('error')
        } else {
          setSyncState('offline')
        }
      }
      if (firstChangeAfterReset.current) {
        firstChangeAfterReset.current = false
        localStorage.removeItem(PREVIOUS_KEY)
        setCanUndo(false)
      }
    }, AUTOSAVE_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [quote])

  // Con el debounce más largo, cambiar de pestaña o minimizar podría dejar los
  // últimos segundos de edición sin subir. Al pasar la página a segundo plano se
  // fuerza un guardado inmediato si hay algo pendiente; el bump de `saveSeq`
  // evita que este guardado y el del debounce se pisen al volver.
  useEffect(() => {
    const flushIfHidden = () => {
      if (document.visibilityState !== 'hidden') return
      const snapshot = serialize(quote)
      if (snapshot === lastSavedRef.current) return
      const seq = ++saveSeq.current
      writeMirror(quote)
      saveReport(quote)
        .then(() => {
          if (saveSeq.current === seq) lastSavedRef.current = snapshot
        })
        .catch(() => {})
    }
    document.addEventListener('visibilitychange', flushIfHidden)
    return () => document.removeEventListener('visibilitychange', flushIfHidden)
  }, [quote])

  function reset() {
    localStorage.setItem(PREVIOUS_KEY, JSON.stringify(quote))
    firstChangeAfterReset.current = true
    setCanUndo(true)
    setQuote(withCodeAndDate(initialTemplate()))
  }

  function undo() {
    const saved = localStorage.getItem(PREVIOUS_KEY)
    if (!saved) return
    setQuote(JSON.parse(saved))
    localStorage.removeItem(PREVIOUS_KEY)
    firstChangeAfterReset.current = false
    setCanUndo(false)
  }

  function loadReport(incoming: QuoteState) {
    setQuote(incoming)
  }

  return { quote, setQuote, reset, undo, canUndo, loadReport, syncState, booting }
}
