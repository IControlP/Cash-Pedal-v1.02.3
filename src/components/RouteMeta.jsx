import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getRouteMeta, SITE_URL, DEFAULT_DESCRIPTION } from '../data/seo'

function setTag(selector, create, attr, value) {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = create()
    document.head.appendChild(el)
  }
  el.setAttribute(attr, value)
}

// Keeps <title>, meta description and canonical in sync on client-side
// navigation. The server injects the same values (src/data/seo.js) into the
// initial HTML; this covers in-app route changes. Blog posts set their own
// title in BlogPost.jsx, so unknown paths are left alone here.
export default function RouteMeta() {
  const { pathname } = useLocation()
  useEffect(() => {
    const meta = getRouteMeta(pathname)
    if (!meta) return
    document.title = meta.title
    setTag('meta[name="description"]', () => {
      const m = document.createElement('meta'); m.setAttribute('name', 'description'); return m
    }, 'content', meta.description || DEFAULT_DESCRIPTION)
    setTag('link[rel="canonical"]', () => {
      const l = document.createElement('link'); l.setAttribute('rel', 'canonical'); return l
    }, 'href', SITE_URL + (meta.path === '/' ? '/' : meta.path))
  }, [pathname])
  return null
}
