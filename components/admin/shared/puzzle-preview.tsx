"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Film, DollarSign, Users, Calendar } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import PosterClarityPreview from "./poster-clarity-preview"

interface BasePreviewProps {
  puzzleDate: string
  isPublished: boolean
}

interface RetitledPreviewProps extends BasePreviewProps {
  type: "retitled"
  data: {
    flagEmoji: string
    countryName: string
    localizedTitle: string
    englishTranslation?: string
    options: Array<{ id: number; title: string; isCorrect?: boolean }>
  }
}

interface BudgetBracketPreviewProps extends BasePreviewProps {
  type: "budget-bracket"
  data: {
    rounds: Array<{
      pairs: Array<{
        movieA: { title: string; poster_path?: string; budget: number }
        movieB: { title: string; poster_path?: string; budget: number }
      }>
    }>
  }
}

interface CastClimbPreviewProps extends BasePreviewProps {
  type: "cast-climb"
  data: {
    movie: {
      title: string
      poster_path?: string
      release_date: string
    }
    actors: Array<{
      name: string
      character: string
      profile_path?: string
      order: number
    }>
  }
}

interface PosterPixelsPreviewProps extends BasePreviewProps {
  type: "poster-pixels"
  data: {
    movie: { title: string; poster_path: string; release_date: string }
    clarityLevels: number[]
    funFact?: string
  }
}

type PuzzlePreviewProps = RetitledPreviewProps | BudgetBracketPreviewProps | CastClimbPreviewProps | PosterPixelsPreviewProps

export default function PuzzlePreview(props: PuzzlePreviewProps) {
  const { puzzleDate, isPublished } = props

  const renderPreview = () => {
    switch (props.type) {
      case "retitled":
        return <RetitledPreview {...props.data} />
      case "budget-bracket":
        return <BudgetBracketPreview {...props.data} />
      case "cast-climb":
        return <CastClimbPreview {...props.data} />
      case "poster-pixels":
        return <PosterPixelsPreview {...props.data} />
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>{format(new Date(puzzleDate), "MMMM d, yyyy")}</span>
          </div>
          <Badge variant={isPublished ? "default" : "secondary"}>
            {isPublished ? "Published" : "Draft"}
          </Badge>
        </div>
        <div className="text-sm font-medium text-gray-700">
          Preview
        </div>
      </div>
      
      <div className="p-6">
        {renderPreview()}
      </div>
    </Card>
  )
}

function RetitledPreview({ 
  flagEmoji, 
  countryName, 
  localizedTitle, 
  englishTranslation,
  options 
}: RetitledPreviewProps["data"]) {
  return (
    <div className="space-y-6">
      {/* Flag and Title */}
      <div className="text-center space-y-3">
        <div className="text-5xl">{flagEmoji}</div>
        <div className="text-sm text-gray-500">{countryName}</div>
        <h3 className="text-2xl font-bold">"{localizedTitle}"</h3>
        {englishTranslation && (
          <p className="text-base text-gray-500 italic">"{englishTranslation}"</p>
        )}
        <p className="text-gray-600">Which movie is this?</p>
      </div>

      {/* Options */}
      <div className="space-y-2 max-w-md mx-auto">
        {options.map((option, idx) => (
          <div
            key={`option-${option.id || option.title || idx}`}
            className={cn(
              "p-3 rounded-lg border transition-all",
              option.isCorrect
                ? "bg-green-50 border-green-300"
                : "bg-white border-gray-200 hover:bg-gray-50"
            )}
          >
            <p className="text-center font-medium">
              {option.title}
            </p>
            {option.isCorrect && (
              <p className="text-xs text-green-600 text-center mt-1">Correct Answer</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function BudgetBracketPreview({ rounds }: BudgetBracketPreviewProps["data"]) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold mb-2">Budget Bracket</h3>
        <p className="text-gray-600">Which movie had the bigger budget?</p>
      </div>

      <div className="space-y-4">
        {rounds.slice(0, 2).map((round, roundIdx) => (
          <div key={`round-${roundIdx}`}>
            <p className="text-sm font-medium text-gray-600 mb-2">
              Round {roundIdx + 1}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {round.pairs[0] && (
                <>
                  <MovieCard 
                    movie={round.pairs[0].movieA} 
                    isWinner={round.pairs[0].movieA.budget > round.pairs[0].movieB.budget}
                  />
                  <MovieCard 
                    movie={round.pairs[0].movieB} 
                    isWinner={round.pairs[0].movieB.budget > round.pairs[0].movieA.budget}
                  />
                </>
              )}
            </div>
          </div>
        ))}
        
        {rounds.length > 2 && (
          <p className="text-center text-sm text-gray-500">
            ...and {rounds.length - 2} more rounds
          </p>
        )}
      </div>
    </div>
  )
}

function MovieCard({ movie, isWinner }: { 
  movie: { title: string; poster_path?: string; budget: number }
  isWinner: boolean 
}) {
  return (
    <div className={cn(
      "relative rounded-lg overflow-hidden border-2 transition-all",
      isWinner ? "border-green-400" : "border-gray-200"
    )}>
      {movie.poster_path ? (
        <img
          src={`https://image.tmdb.org/t/p/w185${movie.poster_path}`}
          alt={movie.title}
          className="w-full aspect-[2/3] object-cover"
        />
      ) : (
        <div className="w-full aspect-[2/3] bg-gray-200 flex items-center justify-center">
          <Film className="w-8 h-8 text-gray-400" />
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
        <p className="text-white text-sm font-medium line-clamp-2">{movie.title}</p>
        <p className="text-white/80 text-xs mt-1">
          ${(movie.budget / 1000000).toFixed(1)}M
        </p>
        {isWinner && (
          <Badge className="absolute top-2 right-2 bg-green-500 text-white">
            Higher
          </Badge>
        )}
      </div>
    </div>
  )
}

function CastClimbPreview({ movie, actors }: CastClimbPreviewProps["data"]) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold mb-2">Cast Climb</h3>
        <p className="text-gray-600">Guess the movie from its cast</p>
      </div>

      <div className="flex gap-4">
        {/* Movie Poster */}
        <div className="flex-shrink-0">
          {movie.poster_path ? (
            <img
              src={`https://image.tmdb.org/t/p/w185${movie.poster_path}`}
              alt={movie.title}
              className="w-32 rounded-lg shadow-md"
            />
          ) : (
            <div className="w-32 aspect-[2/3] bg-gray-200 rounded-lg flex items-center justify-center">
              <Film className="w-8 h-8 text-gray-400" />
            </div>
          )}
          <p className="text-sm font-medium text-center mt-2">{movie.title}</p>
          <p className="text-xs text-gray-500 text-center">
            {new Date(movie.release_date).getFullYear()}
          </p>
        </div>

        {/* Cast List */}
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium text-gray-600 mb-2">Cast (4 actors):</p>
          {actors.slice(0, 4).map((actor, idx) => (
            <div key={`actor-${actor.id || actor.name}-${idx}`} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
              {actor.profile_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w92${actor.profile_path}`}
                  alt={actor.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-gray-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{actor.name}</p>
                <p className="text-xs text-gray-500 truncate">as {actor.character}</p>
              </div>
              <Badge variant="outline" className="text-xs">
                Hint {idx + 1}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PosterPixelsPreview({ movie, clarityLevels, funFact }: PosterPixelsPreviewProps["data"]) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold mb-2">Poster Pixels</h3>
        <p className="text-gray-600">Guess the movie from the pixelated poster</p>
      </div>

      <div className="flex flex-col items-center space-y-4">
        {/* Movie Info */}
        <div className="text-center space-y-1">
          <p className="text-lg font-semibold">{movie.title}</p>
          <p className="text-sm text-gray-500">
            {new Date(movie.release_date).getFullYear()}
          </p>
        </div>

        {/* Poster Clarity Preview */}
        <div className="w-full max-w-md">
          <PosterClarityPreview
            posterPath={movie.poster_path}
            movieTitle={movie.title}
            clarityLevels={clarityLevels}
            currentLevel={clarityLevels[0]} // Start with the lowest clarity level
          />
        </div>

        {/* Fun Fact */}
        {funFact && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 max-w-md">
            <div className="flex items-start gap-2">
              <Badge variant="secondary" className="text-xs mt-0.5">Fun Fact</Badge>
              <p className="text-sm text-gray-700 flex-1">{funFact}</p>
            </div>
          </div>
        )}

        {/* Clarity Levels Info */}
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-gray-600">Clarity Progression:</p>
          <div className="flex gap-2 justify-center">
            {clarityLevels.map((level, idx) => (
              <Badge key={`clarity-${level}-${idx}`} variant="outline" className="text-xs">
                {idx + 1}: {level}%
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}