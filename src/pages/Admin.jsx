import { useState, useEffect, useRef } from 'react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function authHeader(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="input-label">{label}</label>
      {children}
    </div>
  )
}

function PostForm({ initial, token, onSaved, onCancel }) {
  const originalSlug = initial?.slug || ''
  const [title, setTitle]     = useState(initial?.title || '')
  const [slug, setSlug]       = useState(initial?.slug || '')
  const [date, setDate]       = useState(initial?.date || today())
  const [excerpt, setExcerpt] = useState(initial?.excerpt || '')
  const [tags, setTags]       = useState((initial?.tags || []).join(', '))
  const [content, setContent] = useState(initial?.content || '')
  const [imgUrl, setImgUrl]   = useState('')
  const [imgAlt, setImgAlt]   = useState('')
  const [error, setError]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [preview, setPreview] = useState(false)
  const contentRef            = useRef(null)

  const isEdit = !!initial

  function handleTitleChange(val) {
    setTitle(val)
    if (!isEdit) setSlug(slugify(val))
  }

  function insertImage() {
    if (!imgUrl.trim()) return
    const tag = `<img src="${imgUrl.trim()}" alt="${imgAlt.trim()}" style="max-width:100%;border-radius:8px;margin:1rem 0;">`
    const el = contentRef.current
    const start = el.selectionStart
    const end   = el.selectionEnd
    const next  = content.slice(0, start) + '\n' + tag + '\n' + content.slice(end)
    setContent(next)
    setImgUrl('')
    setImgAlt('')
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + tag.length + 2, start + tag.length + 2)
    }, 0)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!title || !slug || !date || !excerpt || !content) {
      setError('All fields except Tags are required.')
      return
    }
    setSaving(true)
    const body = {
      slug,
      title,
      date,
      excerpt,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      content,
    }
    try {
      const url    = isEdit ? `/api/admin/posts/${originalSlug}` : '/api/admin/posts'
      const method = isEdit ? 'PUT' : 'POST'
      const res    = await fetch(url, { method, headers: authHeader(token), body: JSON.stringify(body) })
      const data   = await res.json()
      if (!res.ok) { setError(data.error || 'Save failed'); return }
      onSaved(data)
    } catch {
      setError('Network error — try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-display font-bold text-white text-xl">
          {isEdit ? 'Edit Post' : 'New Post'}
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPreview(p => !p)}
            className="btn-ghost text-xs px-3 py-1.5"
          >
            {preview ? 'Edit' : 'Preview'}
          </button>
          <button type="button" onClick={onCancel} className="btn-ghost text-xs px-3 py-1.5">
            Cancel
          </button>
        </div>
      </div>

      {preview ? (
        <div className="card">
          <h1 className="font-display font-extrabold text-white text-2xl mb-2">{title || 'Untitled'}</h1>
          <p className="text-[var(--text-muted)] text-sm mb-6 pb-6 border-b border-[var(--border)]">{excerpt}</p>
          <div className="prose-cashpedal" dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      ) : (
        <>
          <Field label="Title">
            <input
              className="input-field"
              value={title}
              onChange={e => handleTitleChange(e.target.value)}
              placeholder="How to Negotiate Your Car Price"
            />
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Slug (URL)">
              <input
                className="input-field"
                value={slug}
                onChange={e => setSlug(slugify(e.target.value))}
                placeholder="how-to-negotiate-car-price"
              />
            </Field>
            <Field label="Date">
              <input
                type="date"
                className="input-field"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Excerpt (shown on blog index)">
            <textarea
              className="input-field"
              rows={2}
              value={excerpt}
              onChange={e => setExcerpt(e.target.value)}
              placeholder="One or two sentences summarising the post."
            />
          </Field>

          <Field label="Tags (comma-separated, optional)">
            <input
              className="input-field"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="Buying Tips, Finance"
            />
          </Field>

          {/* Image inserter */}
          <div className="card" style={{ background: 'rgba(255,184,0,0.04)', borderColor: 'rgba(255,184,0,0.2)' }}>
            <p className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider mb-3">Insert Image</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                className="input-field flex-1"
                value={imgUrl}
                onChange={e => setImgUrl(e.target.value)}
                placeholder="Paste image URL"
              />
              <input
                className="input-field sm:w-40"
                value={imgAlt}
                onChange={e => setImgAlt(e.target.value)}
                placeholder="Alt text (optional)"
              />
              <button
                type="button"
                onClick={insertImage}
                className="btn-ghost text-sm px-4 whitespace-nowrap"
              >
                Insert ↓
              </button>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Pastes an <code style={{ color: 'var(--accent)' }}>&lt;img&gt;</code> tag at the cursor position in the content below.
            </p>
          </div>

          <Field label="Content (HTML)">
            <textarea
              ref={contentRef}
              className="input-field font-mono text-sm"
              rows={18}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={`<p>Your first paragraph here.</p>\n\n<h2>A section heading</h2>\n<p>More content…</p>`}
              spellCheck={false}
            />
          </Field>
        </>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Publish Post'}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost">
          Cancel
        </button>
      </div>
    </form>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Admin() {
  const [token, setToken]       = useState(() => sessionStorage.getItem('admin_token') || '')
  const [password, setPassword] = useState('')
  const [loginErr, setLoginErr] = useState('')
  const [posts, setPosts]       = useState([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [view, setView]         = useState('list') // 'list' | 'new' | 'edit'
  const [editing, setEditing]   = useState(null)

  // ── Login ──────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault()
    setLoginErr('')
    try {
      const res  = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) { setLoginErr(data.error || 'Wrong password'); return }
      sessionStorage.setItem('admin_token', data.token)
      setToken(data.token)
    } catch {
      setLoginErr('Network error — try again.')
    }
  }

  // ── Load posts ─────────────────────────────────────
  async function loadPosts() {
    setLoadingPosts(true)
    try {
      const res  = await fetch('/api/posts')
      const data = await res.json()
      setPosts(Array.isArray(data) ? data : [])
    } catch {
      setPosts([])
    } finally {
      setLoadingPosts(false)
    }
  }

  useEffect(() => {
    if (token) loadPosts()
  }, [token])

  // ── Delete ─────────────────────────────────────────
  async function handleDelete(slug) {
    if (!window.confirm(`Delete "${slug}"? This cannot be undone.`)) return
    await fetch(`/api/admin/posts/${slug}`, {
      method: 'DELETE',
      headers: authHeader(token),
    })
    loadPosts()
  }

  // ── Saved callback ─────────────────────────────────
  function handleSaved() {
    setView('list')
    setEditing(null)
    loadPosts()
  }

  function handleLogout() {
    sessionStorage.removeItem('admin_token')
    setToken('')
    setPassword('')
  }

  // ── Login screen ───────────────────────────────────
  if (!token) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <span className="font-display font-bold text-2xl text-white">
              <span className="text-[var(--accent)]">$</span> Admin
            </span>
          </div>
          <form onSubmit={handleLogin} className="card flex flex-col gap-4">
            <Field label="Password">
              <input
                type="password"
                className="input-field"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
                placeholder="••••••••"
              />
            </Field>
            {loginErr && <p className="text-red-400 text-sm">{loginErr}</p>}
            <button type="submit" className="btn-primary w-full justify-center">
              Sign in
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Editor screen ──────────────────────────────────
  if (view === 'new' || view === 'edit') {
    return (
      <div className="min-h-screen bg-[var(--bg)] py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <PostForm
            initial={view === 'edit' ? editing : null}
            token={token}
            onSaved={handleSaved}
            onCancel={() => { setView('list'); setEditing(null) }}
          />
        </div>
      </div>
    )
  }

  // ── Post list screen ───────────────────────────────
  return (
    <div className="min-h-screen bg-[var(--bg)] py-10 px-4">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <span className="font-display font-bold text-2xl text-white">
            <span className="text-[var(--accent)]">$</span> Blog Admin
          </span>
          <div className="flex gap-2">
            <button onClick={() => setView('new')} className="btn-primary text-sm">
              + New Post
            </button>
            <button onClick={handleLogout} className="btn-ghost text-sm">
              Sign out
            </button>
          </div>
        </div>

        {/* Post list */}
        {loadingPosts ? (
          <p className="text-[var(--text-muted)] text-sm">Loading…</p>
        ) : posts.length === 0 ? (
          <div className="card text-center py-10">
            <p className="text-[var(--text-muted)] text-sm mb-4">No posts yet.</p>
            <button onClick={() => setView('new')} className="btn-primary text-sm">
              Write your first post
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {posts.map(post => (
              <div key={post.slug} className="card flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-display font-bold text-white truncate">{post.title}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {post.date} &nbsp;·&nbsp; /blog/{post.slug}
                  </p>
                  {(post.tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {post.tags.map(tag => (
                        <span
                          key={tag}
                          className="text-xs px-1.5 py-0.5 rounded font-semibold"
                          style={{ background: 'rgba(255,184,0,0.10)', color: 'var(--accent)' }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={async () => {
                      const res  = await fetch(`/api/posts/${post.slug}`)
                      const data = await res.json()
                      setEditing(data)
                      setView('edit')
                    }}
                    className="btn-ghost text-xs px-3 py-1.5"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(post.slug)}
                    className="btn-ghost text-xs px-3 py-1.5"
                    style={{ borderColor: 'rgba(255,80,80,0.3)', color: '#f87171' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
