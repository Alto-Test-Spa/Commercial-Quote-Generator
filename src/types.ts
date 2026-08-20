export type Currency = 'UF' | 'CLP'

export interface ItemRow {
  id: string
  concept: string
  quantity: number
  // Siempre en la moneda activa (QuoteState.currency) — al cambiar de moneda se
  // convierten todos los precios para conservar el valor real, ver lib/currency.ts.
  price: number
}

// Los 5 pasos de "¿Por qué Alto Test?" son slots fijos (mismo criterio que la versión
// vanilla): se pueden ocultar entero, no hay forma de agregar un sexto paso ni cambiar
// su ícono — si hiciera falta, es una decisión más grande, no se implementa sin pedirla.
export type WhyItemId = 'diagnosis' | 'engineering' | 'installation' | 'certification' | 'monitoring'

export interface WhyItem {
  id: WhyItemId
  title: string
  description: string
  hidden: boolean
}

export interface QuoteState {
  code: string
  date: string

  docTitle: string
  docSubtitle: string

  clientName: string
  assetName: string
  rut: string
  address: string
  email: string
  phone: string

  currency: Currency
  ufValue: number

  whyLead: string
  whyItems: WhyItem[]

  items: ItemRow[]
  notes: string
  discountPct: number

  commercialContactName: string
  commercialContactEmail: string
  commercialContactPhone: string

  sloganBig: string
  sloganDesc: string
}
