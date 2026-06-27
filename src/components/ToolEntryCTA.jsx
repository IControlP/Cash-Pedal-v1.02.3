import { Fragment } from 'react'

/**
 * Entry CTA for free-tool pages — gives cold / paid-ad traffic one obvious
 * next step instead of landing on a wall of inputs and doing nothing.
 *
 * Props:
 *  - headline:    bold one-liner pitch
 *  - points:      array of short trust signals (rendered with ✓ separators)
 *  - buttonLabel: primary button text
 *  - onStart:     click handler (typically scrolls to + focuses the first input)
 *  - className:   optional extra classes on the wrapper
 */
export default function ToolEntryCTA({ headline, points = [], buttonLabel, onStart, className = '' }) {
  return (
    <div
      className={`anim-2 mt-6 rounded-2xl border p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 ${className}`}
      style={{
        borderColor: 'rgba(200,255,0,0.25)',
        background: 'linear-gradient(135deg, rgba(200,255,0,0.07), rgba(200,255,0,0.01))',
      }}
    >
      <div className="flex-1 min-w-0">
        <p className="font-display font-bold text-white text-lg sm:text-xl leading-snug">
          {headline}
        </p>
        {points.length > 0 && (
          <p className="text-sm text-[var(--text-muted)] mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            {points.map((p, i) => (
              <Fragment key={p}>
                {i > 0 && <span className="opacity-40">·</span>}
                <span className="inline-flex items-center gap-1.5">
                  <span style={{ color: 'var(--accent)' }}>✓</span> {p}
                </span>
              </Fragment>
            ))}
          </p>
        )}
      </div>
      <button
        onClick={onStart}
        className="btn-primary btn-lg shrink-0 w-full sm:w-auto justify-center"
      >
        {buttonLabel}
      </button>
    </div>
  )
}
