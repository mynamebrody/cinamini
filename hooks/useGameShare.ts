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
  puzzleId: string
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
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game, puzzleId }),
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
  }, [game, puzzleId])
  
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
export function useRetitledShare(puzzleId: string) {
  return useGameShare('retitled', puzzleId)
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