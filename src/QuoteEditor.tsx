import { useEffect, useRef, useState } from 'react'
import { useQuoteStore } from './lib/store'
import { fetchUF } from './lib/uf'
import { parseNumber } from './lib/format'
import type { Currency, QuoteState } from './types'
import { Toolbar } from './components/Toolbar'
import { ClientFields } from './components/ClientFields'
import { WhySection } from './components/WhySection'
import { ItemsTable } from './components/ItemsTable'
import { TotalsBox } from './components/TotalsBox'
import { DocFooter } from './components/DocFooter'
import { EditableText } from './components/EditableText'
import { DocWordmark } from './components/DocWordmark'

interface Props {
  onAuthExpired: () => void
}

export default function QuoteEditor({ onAuthExpired }: Props) {
  const { quote, setQuote, reset, undo, canUndo, loadReport, syncState, booting } = useQuoteStore(onAuthExpired)
  const [ufLabel, setUfLabel] = useState('·')
  const [ufOk, setUfOk] = useState<boolean | null>(null)
  const ufInitDone = useRef(false)

  function patch(p: Partial<QuoteState>) {
    setQuote((prev) => ({ ...prev, ...p }))
  }

  async function refetchUF(dateStr: string) {
    setUfLabel(`· consultando ${dateStr}…`)
    setUfOk(null)
    const result = await fetchUF(dateStr)
    if (!result) return // consulta obsoleta, una más nueva ya está en curso
    if (result.value !== null) patch({ ufValue: result.value })
    setUfLabel(`· ${result.label}`)
    setUfOk(result.ok)
  }

  function onManualUF(raw: string) {
    const v = parseNumber(raw)
    if (v > 0) {
      patch({ ufValue: v })
      setUfLabel('· manual')
      setUfOk(null)
    }
  }

  function onCurrencyChange(to: Currency) {
    if (to === quote.currency) return
    // Convierte los precios capturados para conservar el valor real.
    const factor = to === 'CLP' ? quote.ufValue : 1 / quote.ufValue
    setQuote((prev) => ({
      ...prev,
      currency: to,
      items: prev.items.map((r) => ({ ...r, price: r.price * factor })),
    }))
  }

  // Primera consulta de UF apenas se sabe qué cotización está activa (una sola vez).
  useEffect(() => {
    if (booting || ufInitDone.current) return
    ufInitDone.current = true
    refetchUF(quote.date)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booting])

  if (booting) {
    return <div className="boot-screen">Cargando la última cotización…</div>
  }

  return (
    <div>
      <Toolbar
        quote={quote}
        onChange={patch}
        ufLabel={ufLabel}
        ufOk={ufOk}
        onManualUF={onManualUF}
        onCurrencyChange={onCurrencyChange}
        onNew={reset}
        onUndo={undo}
        canUndo={canUndo}
        onLoadReport={loadReport}
        syncState={syncState}
      />

      <main className="sheet">
        <header className="doc-head">
          <div className="doc-head-row">
            <div>
              <DocWordmark />
              <p className="doc-tagline">La altura, documentada.</p>
            </div>
            <div className="doc-code-box">
              <div>Cotización</div>
              <div className="doc-code">{quote.code}</div>
            </div>
          </div>
          <div className="doc-title-block">
            <EditableText
              as="h1"
              className="doc-title"
              value={quote.docTitle}
              onChange={(docTitle) => patch({ docTitle })}
              placeholder="Título del documento"
            />
            <EditableText
              as="p"
              className="doc-subtitle"
              value={quote.docSubtitle}
              onChange={(docSubtitle) => patch({ docSubtitle })}
              placeholder="Subtítulo"
            />
          </div>
        </header>

        <ClientFields quote={quote} onChange={patch} onDateValidated={refetchUF} />

        <div className="doc-body">
          <WhySection quote={quote} onChange={patch} />
          <ItemsTable quote={quote} onChange={patch} />
          <TotalsBox quote={quote} onChange={patch} />
        </div>

        <DocFooter quote={quote} onChange={patch} />
      </main>
    </div>
  )
}
