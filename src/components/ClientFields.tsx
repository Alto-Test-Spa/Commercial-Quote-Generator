import { useState } from 'react'
import type { QuoteState } from '../types'
import { AutoTextarea } from './AutoTextarea'
import { DatePicker } from './DatePicker'
import {
  isValidRut,
  formatRut,
  cleanRutInput,
  isValidEmail,
  isValidPhone,
  formatPhone,
  cleanPhoneInput,
} from '../lib/validate'
import { formatDateInput, isValidDate } from '../lib/date'

interface Props {
  quote: QuoteState
  onChange: (patch: Partial<QuoteState>) => void
  onDateValidated: (date: string) => void
}

function useValidated(value: string, validate: (v: string) => boolean, format?: (v: string) => string) {
  const [touched, setTouched] = useState(false)
  const valid = value.trim() === '' || validate(value)
  return {
    invalid: touched && !valid,
    onBlur: (apply: (v: string) => void) => {
      setTouched(true)
      if (format && value.trim() && validate(value)) apply(format(value))
    },
    onInput: () => setTouched(true),
  }
}

export function ClientFields({ quote, onChange, onDateValidated }: Props) {
  const rutV = useValidated(quote.rut, isValidRut, formatRut)
  const emailV = useValidated(quote.email, isValidEmail)
  const phoneV = useValidated(quote.phone, isValidPhone, formatPhone)
  const [dateTouched, setDateTouched] = useState(false)
  const dateInvalid = dateTouched && quote.date.trim() !== '' && !isValidDate(quote.date)

  function handleDateChange(raw: string) {
    const formatted = formatDateInput(raw)
    onChange({ date: formatted })
    if (formatted.length === 10) {
      setDateTouched(true)
      if (isValidDate(formatted)) onDateValidated(formatted)
    } else {
      setDateTouched(false)
    }
  }

  return (
    <section className="client-grid">
      <div className="client-cell">
        <label className="eyebrow">Cliente</label>
        <AutoTextarea
          className="field"
          blockEnter
          value={quote.clientName}
          onChange={(clientName) => onChange({ clientName })}
          placeholder="Nombre / Razón social"
        />
      </div>
      <div className="client-cell">
        <label className="eyebrow">Activo / Instalación</label>
        <AutoTextarea
          className="field"
          blockEnter
          value={quote.assetName}
          onChange={(assetName) => onChange({ assetName })}
          placeholder="Identificación del activo"
        />
      </div>
      <div className="client-cell">
        <label className="eyebrow">
          RUT {rutV.invalid && <span className="field-error">· inválido</span>}
        </label>
        <input
          className="field"
          value={quote.rut}
          placeholder="00.000.000-0"
          onChange={(e) => {
            onChange({ rut: cleanRutInput(e.target.value) })
            rutV.onInput()
          }}
          onBlur={() => rutV.onBlur((rut) => onChange({ rut }))}
        />
      </div>
      <div className="client-cell">
        <label className="eyebrow">
          Fecha {dateInvalid && <span className="field-error">· inválida</span>}
        </label>
        <DatePicker
          value={quote.date}
          onChange={handleDateChange}
          onBlur={() => setDateTouched(quote.date.trim() !== '')}
          placeholder="dd/mm/aaaa"
        />
      </div>
      <div className="client-cell client-cell--wide">
        <label className="eyebrow">Dirección</label>
        <AutoTextarea
          className="field"
          blockEnter
          value={quote.address}
          onChange={(address) => onChange({ address })}
          placeholder="Calle, número, comuna, ciudad"
        />
      </div>
      <div className="client-cell client-cell--correo">
        <label className="eyebrow">
          Correo {emailV.invalid && <span className="field-error">· inválido</span>}
        </label>
        <AutoTextarea
          className="field"
          blockEnter
          value={quote.email}
          onChange={(email) => {
            onChange({ email })
            emailV.onInput()
          }}
          onBlur={() => emailV.onBlur((email) => onChange({ email }))}
          placeholder="correo@cliente.cl"
        />
      </div>
      <div className="client-cell">
        <label className="eyebrow">
          Teléfono {phoneV.invalid && <span className="field-error">· inválido</span>}
        </label>
        <input
          className="field"
          value={quote.phone}
          placeholder="+56 9 0000 0000"
          onChange={(e) => {
            onChange({ phone: cleanPhoneInput(e.target.value) })
            phoneV.onInput()
          }}
          onBlur={() => phoneV.onBlur((phone) => onChange({ phone }))}
        />
      </div>
    </section>
  )
}
