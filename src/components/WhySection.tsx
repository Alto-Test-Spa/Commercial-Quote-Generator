import type { CSSProperties } from 'react'
import Search from 'reicon-react/icons/Search'
import PenTool from 'reicon-react/icons/PenTool'
import Building2 from 'reicon-react/icons/Building2'
import ShieldCheck from 'reicon-react/icons/ShieldCheck'
import Activity from 'reicon-react/icons/Activity'
import CheckCircle from 'reicon-react/icons/CheckCircle'
import Plus from 'reicon-react/icons/Plus'
import X from 'reicon-react/icons/X'
import type { QuoteState, WhyItem, WhyItemId } from '../types'
import { EditableText } from './EditableText'

const ICONS: Record<WhyItemId, typeof Search> = {
  diagnosis: Search,
  engineering: PenTool,
  installation: Building2,
  certification: ShieldCheck,
  monitoring: Activity,
}

interface Props {
  quote: QuoteState
  onChange: (patch: Partial<QuoteState>) => void
}

// 5 pasos fijos que se pueden ocultar entero (no sólo vaciar su texto) para no dejar una
// tarjeta vacía cuando la venta no es de sistemas anticaídas — mismo criterio que la
// versión vanilla. El ancho de columna (--n) se ajusta a cuántas quedan visibles.
export function WhySection({ quote, onChange }: Props) {
  function updateItem(id: WhyItemId, patch: Partial<WhyItem>) {
    onChange({ whyItems: quote.whyItems.map((it) => (it.id === id ? { ...it, ...patch } : it)) })
  }

  const visible = quote.whyItems.filter((it) => !it.hidden)
  const hidden = quote.whyItems.filter((it) => it.hidden)

  return (
    <div className="why-section">
      <div className="section-title">
        <CheckCircle size={15} strokeWidth={2} className="section-title-icon" />
        <span className="section-title-n">01.</span>
        <h2>¿Por qué Alto Test?</h2>
        <span className="section-title-line" />
      </div>
      <EditableText
        as="p"
        className="why-lead"
        value={quote.whyLead}
        onChange={(whyLead) => onChange({ whyLead })}
        placeholder="Párrafo de presentación."
      />
      <div className="why-grid" style={{ '--why-cols': Math.max(visible.length, 1) } as CSSProperties}>
        {visible.map((item, i) => {
          const Icon = ICONS[item.id]
          return (
            <div key={item.id} className={`why-item ${i === visible.length - 1 ? 'why-item--last' : ''}`}>
              <button
                type="button"
                className="why-item-remove no-print"
                title="Quitar este paso"
                onClick={() => updateItem(item.id, { hidden: true })}
              >
                <X size={11} strokeWidth={2} />
              </button>
              <Icon size={20} strokeWidth={1.6} className="why-item-icon" />
              <EditableText
                as="h3"
                value={item.title}
                onChange={(title) => updateItem(item.id, { title })}
                placeholder="Título"
              />
              <EditableText
                as="p"
                value={item.description}
                onChange={(description) => updateItem(item.id, { description })}
                placeholder="Descripción"
              />
            </div>
          )
        })}
      </div>
      {hidden.length > 0 && (
        <div className="why-restore no-print">
          {hidden.map((item) => (
            <button key={item.id} type="button" onClick={() => updateItem(item.id, { hidden: false })}>
              <Plus size={12} strokeWidth={2} />
              {item.title || 'Paso'}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
