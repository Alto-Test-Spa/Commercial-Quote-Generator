// Logo del encabezado del documento — replica el markup EXACTO del original ("ALTO TEST"
// en mono grande + la curva con puntos naranjos debajo, viewBox 0 0 152 14), no el
// Logomark/Wordmark genéricos de Alto Test: esos usan otras proporciones y puntos
// oscuros, no coinciden con lo que Camilo ya conoce de este documento en particular.
export function DocWordmark() {
  return (
    <div className="doc-wm-block">
      <div className="doc-wm">ALTO TEST</div>
      <svg className="doc-wm-svg" width={132} height={12} viewBox="0 0 152 14" aria-hidden="true">
        <path d="M2,4 Q76,15 150,4" stroke="#C2491F" strokeWidth={2} fill="none" />
        <circle cx={2} cy={4} r={2.4} fill="#C2491F" />
        <circle cx={150} cy={4} r={2.4} fill="#C2491F" />
      </svg>
    </div>
  )
}
