import Cookies from "js-cookie"

/**
 * Game types that have tutorial modals
 */
export type GameType = 'retitled' | 'budget-bracket' | 'cast-climb' | 'poster-pixels'

/**
 * Cookie names for each game's tutorial status
 */
const TUTORIAL_COOKIES: Record<GameType, string> = {
  'retitled': 'cinamini_tutorial_retitled',
  'budget-bracket': 'cinamini_tutorial_budget_bracket',
  'cast-climb': 'cinamini_tutorial_cast_climb',
  'poster-pixels': 'cinamini_tutorial_poster_pixels'
}

/**
 * Legacy localStorage keys for migration purposes
 */
const LEGACY_STORAGE_KEYS: Record<GameType, string> = {
  'retitled': 'retitled-played',
  'budget-bracket': 'budget-bracket-played', 
  'cast-climb': 'cast-climb-played',
  'poster-pixels': 'poster-pixels-played'
}

/**
 * Check if a user has already seen the tutorial for a specific game
 * Also handles migration from legacy localStorage
 * @param gameType - The game type to check
 * @returns true if tutorial has been viewed, false otherwise
 */
export function hasTutorialBeenViewed(gameType: GameType): boolean {
  const cookieName = TUTORIAL_COOKIES[gameType]
  const legacyKey = LEGACY_STORAGE_KEYS[gameType]
  
  // Check if cookie exists
  const cookieValue = Cookies.get(cookieName)
  if (cookieValue === 'true') {
    return true
  }
  
  // Migration: Check legacy localStorage and migrate to cookie if found
  if (typeof window !== 'undefined') {
    const legacyValue = localStorage.getItem(legacyKey)
    if (legacyValue === 'true') {
      // Migrate from localStorage to cookie
      setTutorialViewed(gameType)
      return true
    }
  }
  
  return false
}

/**
 * Mark a tutorial as viewed for a specific game
 * @param gameType - The game type to mark as viewed
 */
export function setTutorialViewed(gameType: GameType): void {
  const cookieName = TUTORIAL_COOKIES[gameType]
  const legacyKey = LEGACY_STORAGE_KEYS[gameType]
  
  // Set cookie with 1 year expiry
  Cookies.set(cookieName, 'true', { 
    expires: 365,
    ...(process.env.NODE_ENV === 'production' ? { secure: true, sameSite: 'lax' as const } : {})
  })
  
  // Also set localStorage for backward compatibility during transition period
  if (typeof window !== 'undefined') {
    localStorage.setItem(legacyKey, 'true')
  }
}

/**
 * Reset tutorial status for a specific game (useful for development/testing)
 * @param gameType - The game type to reset
 */
export function resetTutorialStatus(gameType: GameType): void {
  const cookieName = TUTORIAL_COOKIES[gameType]
  const legacyKey = LEGACY_STORAGE_KEYS[gameType]
  
  Cookies.remove(cookieName)
  
  if (typeof window !== 'undefined') {
    localStorage.removeItem(legacyKey)
  }
}

/**
 * Reset all tutorial statuses (useful for development/testing)
 */
export function resetAllTutorialStatuses(): void {
  const gameTypes: GameType[] = ['retitled', 'budget-bracket', 'cast-climb', 'poster-pixels']
  gameTypes.forEach(resetTutorialStatus)
}

/**
 * Get all tutorial statuses for debugging purposes
 */
export function getAllTutorialStatuses(): Record<GameType, boolean> {
  const gameTypes: GameType[] = ['retitled', 'budget-bracket', 'cast-climb', 'poster-pixels']
  const statuses: Record<GameType, boolean> = {} as Record<GameType, boolean>
  
  gameTypes.forEach(gameType => {
    statuses[gameType] = hasTutorialBeenViewed(gameType)
  })
  
  return statuses
}