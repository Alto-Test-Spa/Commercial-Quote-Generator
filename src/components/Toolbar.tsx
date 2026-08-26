import { useState } from 'react'
import FilePlus from 'reicon-react/icons/FilePlus'
import Undo from 'reicon-react/icons/Undo'
import Printer from 'reicon-react/icons/Printer'
import type { Currency, QuoteState } from '../types'
import { Logomark } from './Logomark'
import { HistoryMenu } from './HistoryMenu'
import { SyncStatus } from './SyncStatus'
import type { SyncState } from '../lib/api'

interface Props {
  quote: QuoteState
  onChange: (patch: Partial<QuoteState>) => void
  ufLabel: string
  ufOk: boolean | null
  onManualUF: (raw: string) => void
  onCurrencyChange: (currency: Currency) => void
  onNew: () => void
  onUndo: () => void
  canUndo: boolean
  onLoadReport: (quote: QuoteState) => void
  syncState: SyncState
}

export function Toolbar({
  quote,
  ufLabel,
  ufOk,
  onManualUF,
  onCurrencyChange,
  onNew,
  onUndo,
  canUndo,
  onLoadReport,
  syncState,
}: Props) {
  function handleNew() {
    const ok = window.confirm(
      '¿Iniciar una cotización nueva?\n\nSe vacían los datos del cliente, los ítems y los textos editados. Lo actual queda guardado en el Historial.',
    )
    if (ok) onNew()
  }

  // Mismo motivo que PriceCell en ItemsTable.tsx: el value mientras se edita
  // es el texto crudo tipeado, no un re-formateo de quote.ufValue en cada
  // tecla — si no, el separador decimal se borra apenas se tipea.
  const [ufDraft, setUfDraft] = useState<string | null>(null)

  return (
    <div className="toolbar no-print">
      <span className="toolbar-brand">
        <Logomark tone="signal" width={26} height={11} />
        ALTO&nbsp;TEST
      </span>

      <div className="toolbar-group">
        <span className="eyebrow">Moneda</span>
        <div className="currency-seg">
          <button
            type="button"
            className={quote.currency === 'UF' ? 'is-active' : ''}
            onClick={() => onCurrencyChange('UF')}
          >
            UF
          </button>
          <button
            type="button"
            className={quote.currency === 'CLP' ? 'is-active' : ''}
            onClick={() => onCurrencyChange('CLP')}
          >
            CLP
          </button>
        </div>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <span className="eyebrow">Valor UF</span>
        <input
          className="toolbar-input toolbar-input--uf"
          inputMode="decimal"
          value={ufDraft ?? quote.ufValue}
          onFocus={(e) => {
            setUfDraft(String(quote.ufValue))
            e.target.select()
          }}
          onChange={(e) => {
            setUfDraft(e.target.value)
            onManualUF(e.target.value)
          }}
          onBlur={() => setUfDraft(null)}
        />
        <span
          className="uf-state"
          style={{ color: ufOk === false ? 'var(--color-signal)' : undefined }}
        >
          {ufLabel}
        </span>
      </div>

      <SyncStatus state={syncState} />

      <div className="toolbar-spacer" />

      <HistoryMenu currentCode={quote.code} onOpen={onLoadReport} />
      <button type="button" className="toolbar-btn toolbar-btn--ghost" onClick={handleNew}>
        <FilePlus size={14} strokeWidth={2} className="icon" />
        Nueva
      </button>
      {canUndo && (
        <button type="button" className="toolbar-btn toolbar-btn--ghost" onClick={onUndo}>
          <Undo size={14} strokeWidth={2} className="icon" />
          Deshacer
        </button>
      )}
      <button type="button" className="toolbar-btn" onClick={() => window.print()}>
        <Printer size={14} strokeWidth={2} className="icon" />
        Imprimir / PDF
      </button>
    </div>
  )
}
