import { useState } from 'react'
import Plus from 'reicon-react/icons/Plus'
import ChecklistAlt from 'reicon-react/icons/ChecklistAlt'
import X from 'reicon-react/icons/X'
import type { ItemRow, QuoteState } from '../types'
import { AutoTextarea } from './AutoTextarea'
import { currencyPair, formatFieldNumber, formatPrice, parseNumber } from '../lib/format'
import { generateId } from '../lib/code'

interface Props {
  quote: QuoteState
  onChange: (patch: Partial<QuoteState>) => void
}

function PriceCell({ row, quote, onChange }: { row: ItemRow; quote: QuoteState; onChange: (patch: Partial<QuoteState>) => void }) {
  const [editing, setEditing] = useState(false)

  function updateRow(patch: Partial<ItemRow>) {
    onChange({ items: quote.items.map((r) => (r.id === row.id ? { ...r, ...patch } : r)) })
  }

  return (
    <span className="price-cell">
      <span className="price-tag">{quote.currency === 'UF' ? 'UF' : '$'}</span>
      <input
        className="field field--num"
        value={editing ? formatFieldNumber(row.price) : formatPrice(row.price, quote.currency)}
        placeholder="0"
        onFocus={(e) => {
          setEditing(true)
          e.target.select()
        }}
        onChange={(e) => updateRow({ price: parseNumber(e.target.value) })}
        onBlur={() => setEditing(false)}
      />
    </span>
  )
}

export function ItemsTable({ quote, onChange }: Props) {
  function updateRow(id: string, patch: Partial<ItemRow>) {
    onChange({ items: quote.items.map((r) => (r.id === id ? { ...r, ...patch } : r)) })
  }

  function removeRow(id: string) {
    onChange({ items: quote.items.filter((r) => r.id !== id) })
  }

  function addRow() {
    onChange({ items: [...quote.items, { id: generateId(), concept: '', quantity: 1, price: 0 }] })
  }

  return (
    <div className="items-section">
      <div className="section-title">
        <ChecklistAlt size={15} strokeWidth={2} className="section-title-icon" />
        <span className="section-title-n">02.</span>
        <h2>Detalle de la propuesta</h2>
        <span className="section-title-line" />
      </div>

      <table className="items-grid">
        <thead>
          <tr>
            <th style={{ width: '52%' }}>Concepto</th>
            <th className="col-num" style={{ width: '11%' }}>
              Cantidad
            </th>
            <th className="col-num" style={{ width: '17%' }}>
              Precio unit. ({quote.currency})
            </th>
            <th className="col-num" style={{ width: '20%' }}>
              Total ({quote.currency})
            </th>
            <th className="col-action no-print" />
          </tr>
        </thead>
        <tbody>
          {quote.items.map((row) => {
            const rowTotal = row.quantity * row.price
            const pair = currencyPair(rowTotal, quote.currency, quote.ufValue)
            return (
              <tr key={row.id}>
                <td>
                  <AutoTextarea
                    className="field field--concept"
                    value={row.concept}
                    onChange={(concept) => updateRow(row.id, { concept })}
                    placeholder="Descripción del concepto"
                  />
                </td>
                <td className="col-num">
                  <input
                    className="field field--num"
                    value={formatFieldNumber(row.quantity)}
                    placeholder="0"
                    onChange={(e) => {
                      const v = Math.max(0, parseNumber(e.target.value))
                      updateRow(row.id, { quantity: v })
                    }}
                  />
                </td>
                <td className="col-num">
                  <PriceCell row={row} quote={quote} onChange={onChange} />
                </td>
                <td className="col-num">
                  <span className="row-total">
                    {pair.main}
                    <span className="row-total-alt">{pair.alt}</span>
                  </span>
                </td>
                <td className="col-action no-print">
                  <button type="button" className="row-remove" title="Eliminar fila" onClick={() => removeRow(row.id)}>
                    <X size={12} strokeWidth={2} />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <button type="button" className="row-add no-print" onClick={addRow}>
        <Plus size={13} strokeWidth={2} className="icon" />
        Agregar concepto
      </button>
    </div>
  )
}
