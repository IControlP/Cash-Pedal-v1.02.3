import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export default function BlogPost() {
  const { slug } = useParams()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    setLoading(true)
    setNotFound(false)
    fetch(`/api/posts/${encodeURIComponent(slug)}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null }
        return r.json()
      })
      .then(data => { if (data) setPost(data) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--bg)]">
        <Navbar />
        <main className="flex-1 pt-20 pb-16 flex items-center justify-center">
          <p className="text-[var(--text-muted)] text-sm">Loading…</p>
        </main>
        <Footer />
      </div>
    )
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--bg)]">
        <Navbar />
        <main className="flex-1 pt-20 pb-16 flex flex-col items-center justify-center gap-4">
          <p className="text-white text-lg font-semibold">Post not found.</p>
          <Link to="/blog" className="btn-primary text-sm">← Back to blog</Link>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <Navbar />
      <main className="flex-1 pt-20 pb-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-10">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-white transition-colors mb-8"
          >
            ← All posts
          </Link>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs text-[var(--text-muted)]">{formatDate(post.date)}</span>
            {(post.tags || []).map(tag => (
              <span
                key={tag}
                className="text-xs px-1.5 py-0.5 rounded font-semibold"
                style={{ background: 'rgba(200,255,0,0.10)', color: 'var(--accent)' }}
              >
                {tag}
              </span>
            ))}
          </div>

          <h1 className="font-display font-extrabold text-white text-3xl sm:text-4xl leading-tight mb-4">
            {post.title}
          </h1>

          <p className="text-[var(--text-muted)] text-base mb-8 leading-relaxed border-b border-[var(--border)] pb-8">
            {post.excerpt}
          </p>

          <div
            className="prose-cashpedal"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </div>
      </main>
      <Footer />
    </div>
  )
}
