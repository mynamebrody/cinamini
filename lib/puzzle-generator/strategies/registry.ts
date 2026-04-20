/**
 * Maps `gameType` → strategy singleton. Import sites (`generatePuzzle`, tests)
 * should rely on this instead of instantiating strategies directly.
 */

import type { PuzzleGameType } from '../types'
import type { PuzzleStrategy } from './base'
import { retitledStrategy } from './retitled'
import { castClimbStrategy } from './cast-climb'
import { posterPixelsStrategy } from './poster-pixels'

const REGISTRY: Record<PuzzleGameType, PuzzleStrategy<any>> = {
  retitled: retitledStrategy,
  'cast-climb': castClimbStrategy,
  'poster-pixels': posterPixelsStrategy,
}

export function getStrategy(gameType: PuzzleGameType): PuzzleStrategy<unknown> {
  const strategy = REGISTRY[gameType]
  if (!strategy) {
    throw new Error(`No strategy registered for game type "${gameType}"`)
  }
  return strategy
}
