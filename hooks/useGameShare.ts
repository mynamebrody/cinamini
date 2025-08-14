"use client"

import { useState, useCallback } from 'react'
import type { GameType, ShareResult } from '@/lib/sharing'

interface UseSimpleShareState {
  shareText: string | null
  shareUrl: string | null
  isLoading: boolean
  error: Error | null
}

interface UseSimpleShareActions {
  fetchShare: () => Promise<void>
  resetShare: () => void
}

/**
 * Simple, stable hook for game sharing
 * 
 * Uses server-side data fetching to avoid client-side dependency issues
 */
export function useGameShare(
  game: GameType,
  puzzleId: string,
  extraData?: any
): UseSimpleShareState & UseSimpleShareActions {
  const [state, setState] = useState<UseSimpleShareState>({
    shareText: null,
    shareUrl: null,
    isLoading: false,
    error: null,
  })
  
  const fetchShare = useCallback(async () => {
    if (!puzzleId) return
    
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const requestBody: any = { game, puzzleId }
      
      // Add extra data if provided (e.g., solveTimeMs for anonymous users)
      if (extraData) {
        Object.assign(requestBody, extraData)
      }
      
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate share text')
      }
      
      const result = await response.json()
      
      setState({
        shareText: result.shareText,
        shareUrl: result.shareUrl,
        isLoading: false,
        error: null,
      })
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error')
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err,
      }))
    }
  }, [game, puzzleId, extraData])
  
  const resetShare = useCallback(() => {
    setState({
      shareText: null,
      shareUrl: null,
      isLoading: false,
      error: null,
    })
  }, [])
  
  return {
    ...state,
    fetchShare,
    resetShare,
  }
}

/**
 * Type-safe convenience hooks for specific games
 */
export function useRetitledShare(puzzleId: string, solveTimeMs?: number, isCorrect?: boolean) {
  const extraData: any = {}
  if (solveTimeMs !== undefined) extraData.solveTimeMs = solveTimeMs
  if (isCorrect !== undefined) extraData.isCorrect = isCorrect
  return useGameShare('retitled', puzzleId, Object.keys(extraData).length > 0 ? extraData : undefined)
}

export function useBudgetBracketShare(puzzleId: string) {
  return useGameShare('budget-bracket', puzzleId)
}

export function useCastClimbShare(puzzleId: string) {
  return useGameShare('cast-climb', puzzleId)
}

export function usePosterPixelsShare(puzzleId: string) {
  return useGameShare('poster-pixels', puzzleId)
}