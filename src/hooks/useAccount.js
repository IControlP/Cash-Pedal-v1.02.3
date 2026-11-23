import { useState, useEffect, useCallback } from 'react'

// Talks to the account API (account.js on the server). Requests carry the session cookie and
// the custom header the server requires for state-changing calls.
export async function accountApi(method, path, body) {
  const r = await fetch(path, {
    method, credentials: 'same-origin',
    headers: { 'content-type': 'application/json', 'x-cp-request': '1' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  let json = null
  try { json = await r.json() } catch { /* empty body */ }
  return { ok: r.ok, status: r.status, json }
}

export function useAccount() {
  const [state, setState] = useState({ loading: true, me: null, profiles: [], error: null })

  const refresh = useCallback(async () => {
    try {
      const status = await accountApi('GET', '/api/account/status')
      if (status.ok && status.json?.signedIn === false) return setState({ loading: false, me: null, profiles: [], error: null })
      const me = await accountApi('GET', '/api/account/me')
      if (me.status === 401) return setState({ loading: false, me: null, profiles: [], error: null })
      if (!me.ok) return setState({ loading: false, me: null, profiles: [], error: me.json?.error || 'unavailable' })
      let profiles = []
      if (me.json.features.storage) {
        const p = await accountApi('GET', '/api/account/profiles')
        if (p.ok) profiles = p.json.profiles
      }
      setState({ loading: false, me: me.json, profiles, error: null })
    } catch {
      setState({ loading: false, me: null, profiles: [], error: 'unavailable' })
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return {
    ...state, refresh,
    save: async (label, kind, payload) => { const r = await accountApi('POST', '/api/account/profiles', { label, kind, payload }); if (r.ok) await refresh(); return r },
    rename: async (id, label) => { const r = await accountApi('PUT', `/api/account/profiles/${id}`, { label }); if (r.ok) await refresh(); return r },
    remove: async id => { const r = await accountApi('DELETE', `/api/account/profiles/${id}`); if (r.ok) await refresh(); return r },
    setConsent: async (purpose, granted) => { const r = await accountApi('POST', '/api/account/consent', { purpose, granted }); if (r.ok) await refresh(); return r },
    signOut: async () => { await accountApi('POST', '/api/auth/logout', {}); await refresh() },
    deleteAccount: async () => { const r = await accountApi('POST', '/api/account/delete', { confirm: 'DELETE' }); await refresh(); return r },
  }
}
