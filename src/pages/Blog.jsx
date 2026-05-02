import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { posts } from '../data/posts'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export default function Blog() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <Navbar />
      <main className="flex-1 pt-20 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 pb-8">
          <div className="anim-0 mb-2 inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
            <span className="w-4 h-px bg-[var(--accent)]" />
            Blog
          </div>
          <h1 className="anim-1 font-display font-extrabold text-white text-3xl sm:text-4xl leading-tight mt-1 mb-3">
            Car buying, demystified
          </h1>
          <p className="anim-2 text-[var(--text-muted)] text-base max-w-xl">
            Guides, tips, and straight talk to help you drive smarter deals.
          </p>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          {posts.length === 0 ? (
            <p className="text-[var(--text-muted)] text-sm">No posts yet — check back soon.</p>
          ) : (
            <div className="flex flex-col gap-5">
              {posts.map((post, i) => (
                <Link
                  key={post.slug}
                  to={`/blog/${post.slug}`}
                  className={`card hover:border-[#3a3a3e] transition-colors anim-${Math.min(i + 2, 5)} group block`}
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-xs text-[var(--text-muted)]">{formatDate(post.date)}</span>
                    {post.tags.map(tag => (
                      <span
                        key={tag}
                        className="text-xs px-1.5 py-0.5 rounded font-semibold"
                        style={{ background: 'rgba(200,255,0,0.10)', color: 'var(--accent)' }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h2 className="font-display font-bold text-white text-xl mb-1 group-hover:text-[var(--accent)] transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-[var(--text-muted)] text-sm leading-relaxed">{post.excerpt}</p>
                  <p className="mt-3 text-xs font-semibold text-[var(--accent)]">Read more →</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
