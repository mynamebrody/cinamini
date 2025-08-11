export const POSTER_PIXELS_LEVELS = [20, 40, 60, 80, 90] as const
export type PosterPixelsClarityPercent = typeof POSTER_PIXELS_LEVELS[number]

export const POSTER_PIXELS_MAX_ATTEMPTS = POSTER_PIXELS_LEVELS.length

export const POSTER_PIXELS_SCORING: Record<PosterPixelsClarityPercent, number> = {
  20: 1000,
  40: 750,
  60: 500,
  80: 250,
  90: 100,
}

export function getClarityPercentForIndex(index: number): PosterPixelsClarityPercent {
  const clamped = Math.max(0, Math.min(POSTER_PIXELS_LEVELS.length - 1, index))
  return POSTER_PIXELS_LEVELS[clamped]
}

export function getIndexForClarityPercent(percent: number): number {
  const p = Math.max(0, Math.min(100, Math.round(percent)))
  for (let i = 0; i < POSTER_PIXELS_LEVELS.length; i++) {
    if (p <= POSTER_PIXELS_LEVELS[i]) return i
  }
  return POSTER_PIXELS_LEVELS.length - 1
}

export function getScoreForClarityPercent(percent: number): number {
  const idx = getIndexForClarityPercent(percent)
  const level = POSTER_PIXELS_LEVELS[idx]
  return POSTER_PIXELS_SCORING[level]
}
