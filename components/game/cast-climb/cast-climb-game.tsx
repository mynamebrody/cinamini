"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ArrowLeft, Play } from "lucide-react"
import { GameSettingsButton } from "@/components/game-settings"
import { useRouter } from "next/navigation"
import Image from "next/image"

interface ActorHint {
  name: string
  image?: string
}

const demoPuzzle = {
  puzzleNumber: 1,
  filmTitle: "Die Hard",
  actors: [
    { name: "Bruce Willis" },
    { name: "Alan Rickman" },
    { name: "Bonnie Bedelia" },
    { name: "Reginald VelJohnson" }
  ],
  poster: "/placeholder-poster.svg",
  funFact: "This was Actor #1\u2019s debut role."
}

type GameState = "start" | "playing" | "complete" | "fail"

export default function CastClimbGame() {
  const router = useRouter()
  const [gameState, setGameState] = useState<GameState>("start")
  const [revealedIndex, setRevealedIndex] = useState(0)
  const [guess, setGuess] = useState("")
  const [shareText, setShareText] = useState("")

  const handleGuess = () => {
    if (guess.trim().toLowerCase() === demoPuzzle.filmTitle.toLowerCase()) {
      const pattern = "\u274C".repeat(revealedIndex) + "\u2705"
      setShareText(`Cast\u00A0Climb #${demoPuzzle.puzzleNumber} ${pattern}`)
      setGameState("complete")
    } else {
      if (revealedIndex < demoPuzzle.actors.length - 1) {
        setRevealedIndex(revealedIndex + 1)
        setGuess("")
      } else {
        const pattern = "\u274C".repeat(demoPuzzle.actors.length)
        setShareText(`Cast\u00A0Climb #${demoPuzzle.puzzleNumber} ${pattern}`)
        setGameState("fail")
      }
    }
  }

  const handleSkip = () => {
    if (revealedIndex < demoPuzzle.actors.length - 1) {
      setRevealedIndex(revealedIndex + 1)
    } else {
      const pattern = "\u274C".repeat(demoPuzzle.actors.length)
      setShareText(`Cast\u00A0Climb #${demoPuzzle.puzzleNumber} ${pattern}`)
      setGameState("fail")
    }
  }

  if (gameState === "complete" || gameState === "fail") {
    return (
      <div className="game-container">
        <header className="game-header">
          <Button variant="ghost" size="sm" onClick={() => router.push("/")}>\
            <ArrowLeft className="w-4 h-4 mr-2" />
            Home
          </Button>
          <h1 className="game-title">Cast Climb</h1>
          <GameSettingsButton />
        </header>
        <main className="flex-1 overflow-auto p-4">
          <div className="max-w-md mx-auto space-y-4">
            <Card>
              <CardHeader className="text-center">
                <CardTitle>{demoPuzzle.filmTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-center">
                <Image src={demoPuzzle.poster} alt="Poster" width={200} height={300} className="mx-auto" />
                <p>{demoPuzzle.funFact}</p>
                <p className="font-mono">{shareText}</p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  if (gameState === "playing") {
    return (
      <div className="game-container">
        <header className="game-header">
          <Button variant="ghost" size="sm" onClick={() => setGameState('start')}>\
            <ArrowLeft className="w-4 h-4 mr-2" />
            End
          </Button>
          <h1 className="game-title">Cast Climb</h1>
          <GameSettingsButton />
        </header>
        <main className="flex-1 overflow-auto p-4">
          <div className="max-w-md mx-auto space-y-4">
            <Card>
              <CardHeader className="text-center">
                <CardTitle>Hint {revealedIndex + 1}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-center">{demoPuzzle.actors[revealedIndex].name}</p>
                <input
                  className="w-full border rounded p-2 bg-background text-foreground"
                  placeholder="Your guess..."
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={handleGuess}>Guess</Button>
                  <Button variant="outline" className="flex-1" onClick={handleSkip}>Skip</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="game-container">
      <header className="game-header">
        <Button variant="ghost" size="sm" onClick={() => router.push('/')}>\
          <ArrowLeft className="w-4 h-4 mr-2" />
          Home
        </Button>
        <h1 className="game-title">Cast Climb</h1>
        <GameSettingsButton />
      </header>
      <main className="flex-1 overflow-auto p-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Cast Climb #{demoPuzzle.puzzleNumber}</CardTitle>
              <p className="text-muted-foreground">
                Guess the movie by its cast. Wrong guesses reveal more actors.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={() => { setGameState('playing'); setRevealedIndex(0); setGuess(''); }} className="w-full" size="lg">
                <Play className="w-4 h-4 mr-2" />
                Start Playing
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                Daily puzzle • {new Date().toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
