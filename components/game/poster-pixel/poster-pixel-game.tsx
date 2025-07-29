"use client"

import React, { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Loader2, Play, RefreshCw } from "lucide-react"
import Image from "next/image"
import { MovieSearchModal } from "@/components/movie-search-modal"
import { MovieSearchResult } from "@/types/movie"

interface PosterPixelPuzzle {
  id: number
  filmTitle: string
  filmPosterUrl: string | null
  tmdbId: number
  releaseYear: number
}

export default function PosterPixelGame() {
  const [puzzle, setPuzzle] = useState<PosterPixelPuzzle | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [guesses, setGuesses] = useState<MovieSearchResult[]>([])
  const [gameWon, setGameWon] = useState(false)
  const [gameLost, setGameLost] = useState(false)
  const [currentClarity, setCurrentClarity] = useState(0)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const MAX_GUESSES = 6
  const POSTER_WIDTH = 300
  const POSTER_HEIGHT = 450

  // Improved progression curve - fast early, slow late
  const getPixelationLevel = (guessCount: number): number => {
    if (guessCount === 0) return 5 // 5% clarity to start
    
    // Fast progression from 5% to 80% in first 3 guesses
    if (guessCount <= 3) {
      const progress = guessCount / 3
      return 5 + (75 * progress) // 5% -> 80%
    }
    
    // Slow progression from 80% to 95% in last 3 guesses
    const remainingGuesses = guessCount - 3
    const slowProgress = remainingGuesses / 3
    return 80 + (15 * slowProgress) // 80% -> 95%
  }

  // Load a sample puzzle (in production this would fetch from API)
  useEffect(() => {
    const loadPuzzle = async () => {
      setIsLoading(true)
      // Simulating API call with sample data
      const samplePuzzle: PosterPixelPuzzle = {
        id: 1,
        filmTitle: "The Matrix",
        filmPosterUrl: "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
        tmdbId: 603,
        releaseYear: 1999
      }
      setPuzzle(samplePuzzle)
      setIsLoading(false)
    }
    loadPuzzle()
  }, [])

  // Draw pixelated poster whenever clarity changes or puzzle loads
  useEffect(() => {
    if (!puzzle?.filmPosterUrl || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new window.Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      imageRef.current = img
      drawPixelatedImage(currentClarity)
    }
    img.src = puzzle.filmPosterUrl
  }, [puzzle, currentClarity])

  const drawPixelatedImage = (clarityPercent: number) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const img = imageRef.current
    if (!canvas || !ctx || !img) return

    // Calculate pixelation size based on clarity
    // Higher clarity = smaller pixels (less pixelation)
    const minPixelSize = 2
    const maxPixelSize = 50
    const pixelSize = Math.max(
      minPixelSize,
      Math.floor(maxPixelSize * (1 - clarityPercent / 100))
    )

    // Draw the pixelated image
    canvas.width = POSTER_WIDTH
    canvas.height = POSTER_HEIGHT

    // First draw the image at low resolution
    const tempCanvas = document.createElement('canvas')
    const tempCtx = tempCanvas.getContext('2d')
    if (!tempCtx) return

    const scaledWidth = Math.ceil(POSTER_WIDTH / pixelSize)
    const scaledHeight = Math.ceil(POSTER_HEIGHT / pixelSize)
    
    tempCanvas.width = scaledWidth
    tempCanvas.height = scaledHeight

    // Disable image smoothing for pixelated effect
    tempCtx.imageSmoothingEnabled = false
    tempCtx.drawImage(img, 0, 0, scaledWidth, scaledHeight)

    // Draw the scaled image back at full size
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(tempCanvas, 0, 0, POSTER_WIDTH, POSTER_HEIGHT)
  }

  const handleGuess = (movie: MovieSearchResult) => {
    if (gameWon || gameLost) return

    const newGuesses = [...guesses, movie]
    setGuesses(newGuesses)
    setShowSearchModal(false)

    // Check if correct
    if (movie.id === puzzle?.tmdbId) {
      setGameWon(true)
      setCurrentClarity(100) // Full clarity on win
    } else {
      // Update clarity based on new progression curve
      const newClarity = getPixelationLevel(newGuesses.length)
      setCurrentClarity(newClarity)

      // Check if game lost
      if (newGuesses.length >= MAX_GUESSES) {
        setGameLost(true)
        setCurrentClarity(100) // Reveal full image on loss
      }
    }
  }

  const resetGame = () => {
    setGuesses([])
    setGameWon(false)
    setGameLost(false)
    setCurrentClarity(getPixelationLevel(0))
    setShowSearchModal(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Poster Pixel</h1>
          <p className="text-gray-400">
            Guess the movie from its pixelated poster. Each wrong guess reveals more detail!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Pixelated Poster */}
          <div className="flex flex-col items-center">
            <Card className="p-4 bg-background/50 border-white/20">
              <canvas
                ref={canvasRef}
                width={POSTER_WIDTH}
                height={POSTER_HEIGHT}
                className="rounded-lg"
                style={{ imageRendering: 'pixelated' }}
              />
            </Card>
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-400">
                Clarity: {Math.round(currentClarity)}%
              </p>
              <div className="w-48 h-2 bg-gray-700 rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${currentClarity}%` }}
                />
              </div>
            </div>
          </div>

          {/* Game Controls */}
          <div className="flex flex-col space-y-4">
            {/* Guesses */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold mb-2">
                Guesses ({guesses.length}/{MAX_GUESSES})
              </h3>
              <div className="space-y-2">
                {Array.from({ length: MAX_GUESSES }).map((_, index) => {
                  const guess = guesses[index]
                  const isCorrect = guess && guess.id === puzzle?.tmdbId
                  
                  return (
                    <Card 
                      key={index} 
                      className={`p-3 border ${
                        !guess 
                          ? 'border-gray-700 bg-gray-900/50' 
                          : isCorrect 
                            ? 'border-green-500 bg-green-500/10' 
                            : 'border-red-500 bg-red-500/10'
                      }`}
                    >
                      {guess ? (
                        <div className="flex items-center justify-between">
                          <span className={isCorrect ? 'text-green-500' : 'text-red-500'}>
                            {guess.title} ({guess.releaseYear})
                          </span>
                          <span className="text-sm text-gray-400">
                            {Math.round(getPixelationLevel(index + 1))}% clarity
                          </span>
                        </div>
                      ) : (
                        <div className="h-6" />
                      )}
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* Game Status */}
            {gameWon && (
              <Card className="p-4 bg-green-500/10 border-green-500">
                <h3 className="text-lg font-semibold text-green-500 mb-2">
                  Congratulations! 🎉
                </h3>
                <p className="text-gray-300">
                  You correctly guessed "{puzzle?.filmTitle}" in {guesses.length} {guesses.length === 1 ? 'guess' : 'guesses'}!
                </p>
              </Card>
            )}

            {gameLost && (
              <Card className="p-4 bg-red-500/10 border-red-500">
                <h3 className="text-lg font-semibold text-red-500 mb-2">
                  Game Over 😔
                </h3>
                <p className="text-gray-300">
                  The movie was "{puzzle?.filmTitle}" ({puzzle?.releaseYear})
                </p>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              {!gameWon && !gameLost && (
                <Button
                  onClick={() => setShowSearchModal(true)}
                  className="flex-1"
                  size="lg"
                >
                  Make a Guess
                </Button>
              )}
              {(gameWon || gameLost) && (
                <Button
                  onClick={resetGame}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Play Again
                </Button>
              )}
            </div>

            {/* Instructions */}
            <Card className="p-4 bg-background/50 border-white/20">
              <h3 className="font-semibold mb-2">How to Play</h3>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Start with a heavily pixelated movie poster</li>
                <li>• Each wrong guess increases clarity significantly</li>
                <li>• You have {MAX_GUESSES} guesses to identify the movie</li>
                <li>• The poster becomes clearer with each guess</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>

      {/* Movie Search Modal */}
      <MovieSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSelectMovie={handleGuess}
        title="Guess the Movie"
        description="Search for the movie you think matches the pixelated poster"
      />
    </div>
  )
}