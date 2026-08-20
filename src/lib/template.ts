import type { QuoteState, WhyItem } from '../types'

const WHY_ITEMS: WhyItem[] = [
  { id: 'diagnosis', title: 'Diagnóstico', description: 'Evaluamos la condición real del sistema.', hidden: false },
  {
    id: 'engineering',
    title: 'Ingeniería',
    description: 'Diseño de la solución según normativa vigente.',
    hidden: false,
  },
  {
    id: 'installation',
    title: 'Instalación',
    description: 'Ejecución técnica especializada y certificada.',
    hidden: false,
  },
  {
    id: 'certification',
    title: 'Certificación',
    description: 'Evidencia técnica documentada y trazable.',
    hidden: false,
  },
  { id: 'monitoring', title: 'Seguimiento', description: 'Acompañamiento durante toda la vida útil.', hidden: false },
]

export function initialTemplate(): QuoteState {
  return {
    code: '',
    date: '',

    docTitle: 'PROPUESTA ECONÓMICA',
    docSubtitle: 'Sistemas de protección contra caídas',

    clientName: '',
    assetName: '',
    rut: '',
    address: '',
    email: '',
    phone: '',

    currency: 'UF',
    ufValue: 39000,

    whyLead:
      'No emitimos un certificado y desaparecemos: nos convertimos en un socio técnico, entregando información técnica confiable, trazable y accionable en cada etapa.',
    whyItems: WHY_ITEMS,

    items: [],
    notes:
      'Forma de pago: Transferencia 30 días contra entrega.\nIncluye retiro de sistema actual.\nValidez de la propuesta: 10 días.',
    discountPct: 0,

    commercialContactName: 'Camilo Jara Acevedo',
    commercialContactEmail: 'camilo.jara@altotest.cl',
    commercialContactPhone: '+56 9 3075 4624',

    sloganBig: 'La altura, bajo control.',
    sloganDesc: 'Diagnóstico · Diseño · Instalación · Certificación · Mantención',
  }
}
