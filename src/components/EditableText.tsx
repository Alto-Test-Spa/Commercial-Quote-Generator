import { useEffect, useRef } from 'react'
import type { ElementType, KeyboardEvent } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  as?: ElementType
}

// Campo de una sola idea (título, eslogan, nombre de contacto): sin Enter, sin formato.
// Todos los campos editables de esta app son así — a diferencia de informe_levantamiento,
// no hay observaciones/recomendaciones largas que necesiten párrafos, así que no hace
// falta un RichText aparte.
export function EditableText({ value, onChange, placeholder, className, as: Tag = 'span' }: Props) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (el && el.textContent !== value) el.textContent = value
  }, [value])

  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.key === 'Enter') e.preventDefault()
  }

  return (
    <Tag
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      data-ph={placeholder}
      className={`editable ${className ?? ''}`}
      onKeyDown={onKeyDown}
      onBlur={() => onChange(ref.current?.textContent?.trim() ?? '')}
    />
  )
}
