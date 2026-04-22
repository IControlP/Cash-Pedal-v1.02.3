import { Link } from 'react-router-dom'

export default function ProGate({ isPro, title, description, preview = null }) {
  if (isPro) return null // caller renders children directly when unlocked

  return (
    <div className="relative rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
      {/* Blurred ghost preview */}
      {preview && (
        <div className="opacity-[0.12] pointer-events-none select-none" aria-hidden>
          {preview}
        </div>
      )}

      {/* Lock overlay */}
      <div
        className={`${preview ? 'absolute inset-0' : ''} z-10 flex flex-col items-center justify-center gap-3 p-6 text-center`}
        style={preview ? { background: 'rgba(13,13,18,0.82)', backdropFilter: 'blur(6px)' } : {}}
      >
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0"
          style={{ background: 'rgba(255,184,0,0.1)', border: '1px solid rgba(255,184,0,0.25)' }}>
          🔒
        </div>
        <div>
          <p className="font-display font-bold text-white text-sm mb-1">{title}</p>
          <p className="text-[var(--text-muted)] text-xs max-w-xs leading-relaxed mx-auto">{description}</p>
        </div>
        <Link
          to="/subscribe"
          className="text-xs font-bold px-4 py-2 rounded-lg transition-all"
          style={{ background: 'var(--accent)', color: '#000' }}
        >
          Unlock with Pro →
        </Link>
      </div>
    </div>
  )
}
