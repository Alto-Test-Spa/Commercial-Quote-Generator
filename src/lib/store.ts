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
    const seq = ++saveSeq.current
    const t = setTimeout(async () => {
      writeMirror(quote)
      setSyncState('saving')
      try {
        await saveReport(quote)
        if (saveSeq.current === seq) setSyncState('saved')
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
    }, 400)
    return () => clearTimeout(t)
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
