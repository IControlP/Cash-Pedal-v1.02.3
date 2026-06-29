import { safeGet, safeSet } from './safeStorage'

const LS_KEY = 'cashpedal_ab_hero_v1'

/**
 * Returns the persistently-assigned hero A/B variant ('A' or 'B').
 * On first call, randomly assigns 50/50 and writes to localStorage so the
 * same visitor always sees the same variant across sessions.
 * Falls back to 'A' if storage is unavailable (locked-down in-app browsers).
 */
export function getHeroVariant() {
  const stored = safeGet(LS_KEY)
  if (stored === 'A' || stored === 'B') return stored
  const variant = Math.random() < 0.5 ? 'A' : 'B'
  safeSet(LS_KEY, variant)
  return variant
}
