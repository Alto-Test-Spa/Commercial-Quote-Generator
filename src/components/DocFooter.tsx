import Location from 'reicon-react/icons/Location'
import Envelope from 'reicon-react/icons/Envelope'
import User from 'reicon-react/icons/User'
import Phone from 'reicon-react/icons/Phone'
import type { QuoteState } from '../types'
import { EditableText } from './EditableText'

interface Props {
  quote: QuoteState
  onChange: (patch: Partial<QuoteState>) => void
}

// Datos de emisión (Alto Test SpA) son fijos, no editables — a diferencia del contacto
// comercial y el eslogan, que sí varían por cotización. Mismo criterio que la vanilla.
export function DocFooter({ quote, onChange }: Props) {
  return (
    <footer className="doc-footer">
      <div className="footer-issuer">
        <div>
          Datos de emisión · <span>Alto Test SpA</span>
        </div>
        <div>RUT: <span>78.470.129-8</span></div>
        <div>Tel: <span>+56 9 3075 4624</span></div>
        <div className="footer-contact">
          <Location size={12} strokeWidth={2} className="icon" />
          Santiago · Chile
          <span className="footer-sep">·</span>
          <Envelope size={12} strokeWidth={2} className="icon" />
          contacto@altotest.cl
        </div>
      </div>
      <div className="footer-commercial">
        <p className="eyebrow">Contacto comercial</p>
        <div>
          <User size={12} strokeWidth={2} className="icon" />
          <EditableText
            as="span"
            value={quote.commercialContactName}
            onChange={(commercialContactName) => onChange({ commercialContactName })}
            placeholder="Nombre"
          />
        </div>
        <div>
          <Envelope size={12} strokeWidth={2} className="icon" />
          <EditableText
            as="span"
            value={quote.commercialContactEmail}
            onChange={(commercialContactEmail) => onChange({ commercialContactEmail })}
            placeholder="correo@altotest.cl"
          />
        </div>
        <div>
          <Phone size={12} strokeWidth={2} className="icon" />
          <EditableText
            as="span"
            value={quote.commercialContactPhone}
            onChange={(commercialContactPhone) => onChange({ commercialContactPhone })}
            placeholder="+56 9 0000 0000"
          />
        </div>
      </div>
      <div className="footer-slogan">
        <EditableText
          as="p"
          className="footer-slogan-big"
          value={quote.sloganBig}
          onChange={(sloganBig) => onChange({ sloganBig })}
          placeholder="Eslogan"
        />
        <EditableText
          as="p"
          value={quote.sloganDesc}
          onChange={(sloganDesc) => onChange({ sloganDesc })}
          placeholder="Diagnóstico · Diseño · Instalación..."
        />
      </div>
    </footer>
  )
}
