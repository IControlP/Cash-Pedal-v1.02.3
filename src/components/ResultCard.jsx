import { useEffect, useRef, useState } from 'react'

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export default function ResultCard({ label, value, highlight = false, delay = 0 }) {
  const [animKey, setAnimKey] = useState(0)
  const prevValue = useRef(value)

  useEffect(() => {
    if (prevValue.current !== value) {
      setAnimKey(k => k + 1)
      prevValue.current = value
    }
  }, [value])

  return (
    <div
      className={`card flex flex-col gap-2 transition-all duration-200 ${
        highlight
          ? 'border-[var(--accent)] bg-[var(--accent-muted)] shadow-[0_0_32px_rgba(255,184,0,0.08)]'
          : 'hover:border-[#3a3a3e]'
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-widest"
        style={{ color: highlight ? 'var(--accent)' : 'var(--text-muted)' }}
      >
        {label}
      </p>
      <p
        key={animKey}
        className={`font-display font-bold num-reveal ${
          highlight ? 'text-[var(--accent)] text-3xl sm:text-4xl' : 'text-white text-2xl sm:text-3xl'
        }`}
      >
        {formatCurrency(value)}
      </p>
    </div>
  )
}
