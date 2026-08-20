// RUT chileno con dígito verificador (módulo 11) — mismo algoritmo que la versión vanilla.
export function isValidRut(rut: string): boolean {
  const clean = String(rut).replace(/[.\-\s]/g, '').toUpperCase()
  if (!/^[0-9]{7,8}[0-9K]$/.test(clean)) return false
  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)
  let sum = 0
  let mul = 2
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * mul
    mul = mul === 7 ? 2 : mul + 1
  }
  const rest = 11 - (sum % 11)
  const dvCalc = rest === 11 ? '0' : rest === 10 ? 'K' : String(rest)
  return dv === dvCalc
}

export function formatRut(rut: string): string {
  const clean = String(rut).replace(/[.\-\s]/g, '').toUpperCase()
  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)
  return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`
}

// Recorta lo que se tipea en vivo para que no pasen de `maxDigits` dígitos, sin tocar
// los separadores ya escritos (el autoformato final llega recién al perder el foco).
function capDigits(value: string, maxDigits: number, extraDigitChars = ''): string {
  const isDigit = new RegExp(`[0-9${extraDigitChars}]`)
  let count = 0
  let out = ''
  for (const ch of value) {
    if (isDigit.test(ch)) {
      if (count >= maxDigits) continue
      count++
    }
    out += ch
  }
  return out
}

// Un RUT chileno no tiene más de 8 dígitos en el cuerpo + 1 dígito verificador (que
// puede ser "K") — evita que seguir tipeando después de eso, en vez de solo marcar
// "inválido" y dejar crecer el campo sin límite.
export function cleanRutInput(value: string): string {
  return capDigits(String(value).toUpperCase(), 9, 'K')
}

export function isValidEmail(value: string): boolean {
  const v = String(value).trim()
  if (v.includes('..') || v.startsWith('.') || v.endsWith('.')) return false
  // Exige un dominio con extensión de solo letras (.cl, .com, etc.) — el regex simple
  // "algo@algo.algo" dejaba pasar cosas como "asd@..l-133123F".
  return /^[^\s@.][^\s@]*@[^\s@.][^\s@]*\.[a-zA-Z]{2,}$/.test(v)
}

// Teléfono chileno: acepta con o sin "+56", con o sin espacios/guiones — siempre que
// queden 9 dígitos empezando en 9 (celular). Mismo criterio (validar + autoformatear
// al perder el foco) que el RUT.
export function isValidPhone(value: string): boolean {
  let digits = String(value).replace(/\D/g, '')
  if (digits.startsWith('56')) digits = digits.slice(2)
  return /^9\d{8}$/.test(digits)
}

export function formatPhone(value: string): string {
  let digits = String(value).replace(/\D/g, '')
  if (digits.startsWith('56')) digits = digits.slice(2)
  return `+56 9 ${digits.slice(1, 5)} ${digits.slice(5, 9)}`
}

// Un celular chileno son 9 dígitos (empezando en 9), más los 2 del código de país si el
// usuario los tipea — 11 como máximo.
export function cleanPhoneInput(value: string): string {
  return capDigits(String(value), 11)
}
