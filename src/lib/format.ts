import type { Currency } from '../types'

const nfCLP = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })
const nfUF = new Intl.NumberFormat('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 3 })

export function formatCLP(n: number): string {
  return `$${nfCLP.format(Math.round(n))} CLP`
}

export function formatUF(n: number): string {
  return `UF ${nfUF.format(n)}`
}

// Muestra el valor en la moneda activa + su equivalente en la otra — mismo patrón que
// la versión vanilla: nunca se esconde la conversión, siempre se ve ambas.
export function currencyPair(valueInCurrency: number, currency: Currency, ufValue: number) {
  if (currency === 'UF') {
    return { main: formatUF(valueInCurrency), alt: formatCLP(valueInCurrency * ufValue) }
  }
  return { main: formatCLP(valueInCurrency), alt: formatUF(valueInCurrency / ufValue) }
}

// Parseo tolerante: acepta coma o punto como separador decimal.
export function parseNumber(value: string | number): number {
  if (typeof value === 'number') return value
  if (!value) return 0
  let s = String(value).trim().replace(/\s/g, '')
  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else {
    s = s.replace(',', '.')
  }
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

// Número con coma decimal a la chilena, sin separador de miles — para editar, no mostrar.
export function formatFieldNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n).replace('.', ',')
}

// Precio con separador de miles según la moneda — para mostrar cuando el campo no tiene el foco.
export function formatPrice(n: number, currency: Currency): string {
  return currency === 'UF' ? nfUF.format(n) : nfCLP.format(Math.round(n))
}

export { nfUF }
