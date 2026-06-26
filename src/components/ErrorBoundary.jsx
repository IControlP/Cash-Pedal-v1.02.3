import { Component } from 'react'

// Catches render-time crashes anywhere in the tree and shows a friendly
// recovery screen instead of a blank white page. Without this, a single thrown
// error (e.g. an unsupported browser API in an Instagram/Facebook in-app
// browser) unmounts the entire SPA and the visitor sees nothing — which reads
// as an immediate bounce in session recordings.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // Surface for debugging; analytics scripts can pick this up too.
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#0a0a0f',
          color: '#e5e7eb',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>🚗</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 10, color: '#fff' }}>
            Something hit a pothole
          </h1>
          <p style={{ fontSize: '0.95rem', color: '#9ca3af', marginBottom: 24, lineHeight: 1.5 }}>
            We ran into an unexpected error. Reloading usually fixes it. If you opened this from
            Instagram or Facebook, opening it in Safari or Chrome works best.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#FFB800',
                color: '#0a0a0f',
                border: 'none',
                borderRadius: 8,
                padding: '10px 20px',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Reload page
            </button>
            <a
              href="/"
              style={{
                background: 'transparent',
                color: '#e5e7eb',
                border: '1px solid #2a2a35',
                borderRadius: 8,
                padding: '10px 20px',
                fontWeight: 600,
                textDecoration: 'none',
                fontSize: '0.9rem',
              }}
            >
              Go home
            </a>
          </div>
        </div>
      </div>
    )
  }
}
