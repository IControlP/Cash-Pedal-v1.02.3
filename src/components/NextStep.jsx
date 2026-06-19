import { Link } from 'react-router-dom'

// A lightweight "continue the journey" nudge shown at the bottom of each tool,
// pointing the user to the next logical step in the car-buying flow. Keeps the
// journey going past the landing page so the tools feel like one path, not ten
// disconnected pages.
export default function NextStep({ tag, title, body, to, cta }) {
  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-16">
      <Link to={to} className="next-step">
        <div className="next-step-body">
          <span className="next-step-tag">{tag}</span>
          <h3 className="next-step-title font-display">{title}</h3>
          <p className="next-step-text">{body}</p>
        </div>
        <span className="next-step-cta">{cta} →</span>
      </Link>
    </section>
  )
}
