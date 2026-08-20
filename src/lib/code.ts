function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

// Mismo formato que la versión vanilla: COT-aaaammdd-hhmmss.
export function generateCode(): string {
  const d = new Date()
  const date = `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`
  const time = `${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`
  return `COT-${date}-${time}`
}

const CODE_PATTERN = /^COT-\d{8}-\d{6}$/

export function isValidCode(code: string): boolean {
  return CODE_PATTERN.test(code)
}

export function generateId(): string {
  return crypto.randomUUID()
}
