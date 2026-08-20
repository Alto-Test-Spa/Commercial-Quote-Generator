import type { ChangeEvent, KeyboardEvent, TextareaHTMLAttributes } from 'react'

interface Props extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> {
  value: string
  onChange: (value: string) => void
  blockEnter?: boolean
}

// Autoajuste 100% CSS (truco `.grow-wrap`, ver index.css): un `::after` invisible con el
// mismo texto fuerza el alto de la fila de grid al contenido real, recalculado en cada
// reflow — nunca se mide con JS (`scrollHeight`), que se desincroniza entre pantalla e
// impresión cuando cambia el tamaño de fuente. Mismo patrón que
// merakilabs/propuestas/generador (ver su CLAUDE.md, "grow-wrap").
//
// `className` va también en el contenedor `.grow-wrap`, no solo en el textarea: las
// métricas de fuente/padding de `.field` deben llegar al `.grow-wrap` para que el
// textarea real y el espejo `::after` (que calcula el alto) midan exactamente lo mismo.
export function AutoTextarea({ value, onChange, blockEnter, className, ...rest }: Props) {
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (blockEnter && e.key === 'Enter') e.preventDefault()
  }
  function onInput(e: ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value)
  }
  return (
    <div className={`grow-wrap ${className ?? ''}`} data-value={`${value} `}>
      <textarea
        {...rest}
        rows={1}
        className={className}
        value={value}
        onChange={onInput}
        onKeyDown={onKeyDown}
      />
    </div>
  )
}
