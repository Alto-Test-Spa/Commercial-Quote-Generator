import { useEffect, useRef, useState } from 'react'
import Calendar from 'reicon-react/icons/Calendar'
import ChevronLeft from 'reicon-react/icons/ChevronLeft'
import ChevronRight from 'reicon-react/icons/ChevronRight'
import { parseDate, toDateString } from '../lib/date'

interface Props {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
}

const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]
const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

// Grilla de 6x7 celdas para el mes dado (lunes primero); las celdas fuera del mes van null.
function buildMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1)
  const startOffset = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  while (cells.length < 42) cells.push(null)
  return cells
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function DatePicker({ value, onChange, onBlur, placeholder }: Props) {
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState(() => parseDate(value) ?? new Date())
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function openPicker() {
    setViewDate(parseDate(value) ?? new Date())
    setOpen(true)
  }

  function pickDay(d: Date) {
    onChange(toDateString(d))
    setOpen(false)
  }

  const selected = parseDate(value)
  const today = new Date()
  const grid = buildMonthGrid(viewDate.getFullYear(), viewDate.getMonth())

  return (
    <div className="datepicker" ref={rootRef}>
      <input
        className="field"
        inputMode="numeric"
        maxLength={10}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={openPicker}
        onBlur={onBlur}
      />
      <button
        type="button"
        className="datepicker-toggle no-print"
        aria-label="Abrir calendario"
        onClick={() => (open ? setOpen(false) : openPicker())}
      >
        <Calendar size={14} strokeWidth={1.8} />
      </button>

      {open && (
        <div className="datepicker-pop no-print">
          <div className="datepicker-head">
            <button
              type="button"
              aria-label="Mes anterior"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
            >
              <ChevronLeft size={14} strokeWidth={2} />
            </button>
            <span className="datepicker-month">
              {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
            </span>
            <button
              type="button"
              aria-label="Mes siguiente"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
            >
              <ChevronRight size={14} strokeWidth={2} />
            </button>
          </div>
          <div className="datepicker-weekdays">
            {WEEKDAY_LABELS.map((w, i) => (
              <span key={i}>{w}</span>
            ))}
          </div>
          <div className="datepicker-grid">
            {grid.map((d, i) => {
              if (!d) return <span key={i} />
              const classes = [
                'datepicker-day',
                selected && sameDay(d, selected) ? 'is-selected' : '',
                sameDay(d, today) ? 'is-today' : '',
              ]
                .filter(Boolean)
                .join(' ')
              return (
                <button key={i} type="button" className={classes} onClick={() => pickDay(d)}>
                  {d.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
