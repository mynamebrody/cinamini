// Centralized game splash styles used across Admin and app UIs

export type CanonicalGameId = 'retitled' | 'budget-bracket' | 'cast-climb' | 'poster-pixels'

interface GameStyle {
  bgHex: string
  textHex: string
}

const GAME_STYLES: Record<CanonicalGameId, GameStyle> = {
  'cast-climb': { bgHex: '#99251d', textHex: '#ffffff' },
  'retitled': { bgHex: '#ebbb4a', textHex: '#ffffff' },
  'budget-bracket': { bgHex: '#278646', textHex: '#ffffff' },
  'poster-pixels': { bgHex: '#3a3a3c', textHex: '#ffffff' }
}

function normalizeGameId(id: string): CanonicalGameId | null {
  const canonical = id.replace(/_/g, '-') as CanonicalGameId
  if (canonical in GAME_STYLES) return canonical
  return null
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const bigint = parseInt(clean, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function getGameStyle(id: string): {
  bgHex: string
  textHex: string
  lightBgRgba: string
  borderRgba: string
} {
  const normalized = normalizeGameId(id)
  const fallback: GameStyle = { bgHex: '#d1d2d4', textHex: '#3a3a3c' }
  const base = normalized ? GAME_STYLES[normalized] : fallback
  return {
    bgHex: base.bgHex,
    textHex: base.textHex,
    lightBgRgba: hexToRgba(base.bgHex, 0.6),
    borderRgba: hexToRgba(base.bgHex, 0.30)
  }
}

export { GAME_STYLES }

