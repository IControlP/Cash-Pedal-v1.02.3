import { useState } from 'react'

function detectInAppBrowser() {
  const ua = navigator.userAgent || ''
  const isInstagram = /Instagram/i.test(ua)
  const isFacebook = /FBAN|FBAV/i.test(ua)
  if (!isInstagram && !isFacebook) return null

  const platform = isInstagram ? 'Instagram' : 'Facebook'
  const isIOS = /iPhone|iPad|iPod/i.test(ua)

  let instruction
  if (isIOS) {
    instruction = 'Tap ··· or the Share icon below, then choose "Open in Browser" for the best experience.'
  } else {
    instruction = 'Tap ⋮ in the top-right corner, then choose "Open in Chrome" for the best experience.'
  }

  return { platform, instruction }
}

export default function InAppBrowserBanner() {
  const [dismissed, setDismissed] = useState(false)
  const info = detectInAppBrowser()

  if (!info || dismissed) return null

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 9999,
        backgroundColor: '#1e1b4b',
        borderBottom: '2px solid #c8ff00',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
      }}
      role="alert"
    >
      <p style={{ margin: 0, fontSize: '0.875rem', color: '#c7d2fe', lineHeight: 1.4 }}>
        <span style={{ color: '#a5b4fc', fontWeight: 600 }}>
          {info.platform} browser detected.
        </span>{' '}
        {info.instruction}
      </p>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss banner"
        style={{
          background: 'none',
          border: 'none',
          color: '#a5b4fc',
          cursor: 'pointer',
          fontSize: '1.1rem',
          lineHeight: 1,
          padding: '2px 4px',
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  )
}
