import { parseNumber } from './format'
import { toISODate } from './date'

// Valor UF según la fecha de la propuesta (no la de hoy) — misma cadena de fuentes que
// la versión vanilla: caché local → indicadoreconomico.cl (histórico) → boostr.cl
// (respaldo, sólo sirve el valor de HOY). Si no hay dato para la fecha pedida, no se
// inventa el de hoy: se avisa y queda el valor manual.
const UF_DATE_URL = 'https://indicadoreconomico.cl/api/uf'
const UF_TODAY_URL = 'https://api.boostr.cl/economy/indicators.json'
const CACHE_KEY = 'altotest_uf_cache'

function readCache(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') || {}
  } catch {
    return {}
  }
}

function writeCacheEntry(iso: string, value: number) {
  if (!(value > 0)) return
  const cache = readCache()
  cache[iso] = value
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch (e) {
    console.warn('No se pudo guardar la caché de UF:', e)
  }
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { cache: 'no-store', signal: ctrl.signal })
  } finally {
    clearTimeout(t)
  }
}

// "40.844.79" -> 40844.79
function parseUFRaw(raw: unknown): number {
  const s = String(raw ?? '').trim()
  if (s.includes(',')) return parseNumber(s)
  const parts = s.split('.')
  if (parts.length >= 2 && parts[parts.length - 1].length <= 2) {
    const dec = parts.pop()!
    return parseFloat(parts.join('') + '.' + dec)
  }
  return parseFloat(parts.join(''))
}

export interface UFResult {
  // null = no se encontró dato para la fecha pedida — no tocar el valor actual (manual).
  value: number | null
  label: string
  ok: boolean
}

// Secuenciador a nivel de módulo: si el usuario cambia la fecha varias veces rápido,
// sólo la consulta más reciente puede devolver un resultado utilizable — las anteriores
// que lleguen tarde devuelven null y quien llama las ignora.
let seq = 0

export async function fetchUF(dateStr: string): Promise<UFResult | null> {
  const mySeq = ++seq
  const stale = () => mySeq !== seq
  const todayISO = new Date().toISOString().slice(0, 10)
  const iso = toISODate(dateStr) ?? todayISO

  const cached = readCache()[iso]
  if (cached > 0) {
    return { value: cached, label: `UF ${cached.toLocaleString('es-CL')} (${iso} · guardado)`, ok: true }
  }

  try {
    const res = await fetchWithTimeout(`${UF_DATE_URL}?fecha=${iso}`, 8000)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const value = parseUFRaw(data?.valor)
    if (!(value > 0)) throw new Error('Sin dato para la fecha')
    writeCacheEntry(iso, value)
    if (stale()) return null
    return { value, label: `UF ${value.toLocaleString('es-CL')} (${data.fecha ?? iso})`, ok: true }
  } catch (e) {
    console.warn('UF por fecha falló:', e)
  }

  if (iso === todayISO) {
    try {
      const res = await fetchWithTimeout(UF_TODAY_URL, 8000)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const value = parseNumber(data?.data?.uf?.value)
      if (!(value > 0)) throw new Error('Sin dato de UF')
      writeCacheEntry(iso, value)
      if (stale()) return null
      return { value, label: `UF ${value.toLocaleString('es-CL')} (hoy)`, ok: true }
    } catch (e) {
      console.warn('UF respaldo falló:', e)
    }
  }

  if (stale()) return null
  return { value: null, label: `Sin dato para ${iso} — usa valor manual`, ok: false }
}
