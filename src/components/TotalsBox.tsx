import type { QuoteState } from '../types'
import { AutoTextarea } from './AutoTextarea'
import { currencyPair } from '../lib/format'

interface Props {
  quote: QuoteState
  onChange: (patch: Partial<QuoteState>) => void
}

// Orden de cálculo: neto -> descuento (%) -> IVA 19% -> total. El descuento se aplica
// sobre el neto, antes del IVA — pedido explícito (ver CLAUDE.md del original).
export function TotalsBox({ quote, onChange }: Props) {
  const subtotal = quote.items.reduce((sum, r) => sum + r.quantity * r.price, 0)
  const discount = subtotal * (quote.discountPct / 100)
  const net = subtotal - discount
  const iva = net * 0.19
  const total = net + iva

  const sub = currencyPair(subtotal, quote.currency, quote.ufValue)
  const disc = currencyPair(discount, quote.currency, quote.ufValue)
  const ivaPair = currencyPair(iva, quote.currency, quote.ufValue)
  const tot = currencyPair(total, quote.currency, quote.ufValue)

  function onDiscountInput(raw: string) {
    let digits = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
    if (digits !== '' && Number(digits) > 100) digits = '100'
    onChange({ discountPct: digits === '' ? 0 : Number(digits) })
  }

  return (
    <div className="totals-row">
      <div className="notes-block">
        <label className="eyebrow">Condiciones y notas</label>
        <AutoTextarea
          className="field field--notes"
          value={quote.notes}
          onChange={(notes) => onChange({ notes })}
        />
      </div>
      <div className="totals-box">
        <div className="totals-line">
          <span className="totals-label">Subtotal neto</span>
          <span className="totals-value">
            <span className="totals-main">{sub.main}</span>
            <span className="totals-alt">{sub.alt}</span>
          </span>
        </div>
        <div className="totals-line">
          <span className="totals-label">
            Descuento{' '}
            <input
              className="discount-input"
              value={quote.discountPct === 0 ? '' : String(quote.discountPct)}
              placeholder="0"
              inputMode="numeric"
              maxLength={3}
              onChange={(e) => onDiscountInput(e.target.value)}
            />
            %
          </span>
          <span className="totals-value">
            <span className="totals-main">
              {discount > 0 ? '-' : ''}
              {disc.main}
            </span>
            <span className="totals-alt">
              {discount > 0 ? '-' : ''}
              {disc.alt}
            </span>
          </span>
        </div>
        <div className="totals-line">
          <span className="totals-label">IVA 19%</span>
          <span className="totals-value">
            <span className="totals-main">{ivaPair.main}</span>
            <span className="totals-alt">{ivaPair.alt}</span>
          </span>
        </div>
        <div className="totals-line totals-line--total">
          <span className="totals-label">Total</span>
          <span className="totals-value">
            <span className="totals-main">{tot.main}</span>
            <span className="totals-alt">{tot.alt}</span>
          </span>
        </div>
      </div>
    </div>
  )
}
