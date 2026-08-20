import type { QuoteState } from '../types'

const BASE_URL = import.meta.env.VITE_REPORTS_ENDPOINT
const ACCESS_KEY_STORAGE = 'altotest_propuesta_economica_access_key'

// El Worker es compartido con informe_levantamiento y (a futuro) propuesta_tecnica — ver
// informes/informe_levantamiento/worker/src/index.ts. "economica" es el tipo de
// documento de esta app, parte de la ruta (/reports/economica/:code).
const KIND = 'economica'

export type SyncState = 'idle' | 'saving' | 'saved' | 'offline' | 'error'

export function getStoredAccessKey(): string {
  return localStorage.getItem(ACCESS_KEY_STORAGE) ?? ''
}

export function setStoredAccessKey(key: string) {
  localStorage.setItem(ACCESS_KEY_STORAGE, key)
}

export function clearStoredAccessKey() {
  localStorage.removeItem(ACCESS_KEY_STORAGE)
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const key = getStoredAccessKey()
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
      Authorization: `Bearer ${key}`,
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new ApiError(res.status, text || res.statusText)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export interface ReportSummary {
  code: string
  client: string
  date: string
  updatedAt: number
}

interface ReportEnvelope {
  code: string
  kind: string
  client: string
  date: string
  updatedAt: number
  doc: QuoteState
}

export async function verifyAccessKey(key: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/reports/${KIND}`, { headers: { Authorization: `Bearer ${key}` } })
  return res.ok
}

export function listReports(): Promise<ReportSummary[]> {
  return request<ReportSummary[]>(`/reports/${KIND}`)
}

export async function fetchReport(code: string): Promise<QuoteState> {
  const envelope = await request<ReportEnvelope>(`/reports/${KIND}/${encodeURIComponent(code)}`)
  return envelope.doc
}

export function saveReport(quote: QuoteState): Promise<{ ok: boolean; updatedAt: number }> {
  const client = [quote.clientName, quote.assetName].filter(Boolean).join(' — ')
  return request(`/reports/${KIND}/${encodeURIComponent(quote.code)}`, {
    method: 'PUT',
    body: JSON.stringify({ code: quote.code, client, date: quote.date, doc: quote }),
  })
}

export function deleteReport(code: string): Promise<{ ok: boolean }> {
  return request(`/reports/${KIND}/${encodeURIComponent(code)}`, { method: 'DELETE' })
}
