"use client"

import { useState, useCallback } from "react"
import { Film } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export interface PosterClarityPreviewProps {
  posterPath: string | null
  movieTitle: string
  clarityLevels?: number[]
  currentLevel?: number
  onClarityChange?: (level: number) => void
}

export default function PosterClarityPreview({
  posterPath,
  movieTitle,
  clarityLevels = [5, 15, 35, 65, 100],
  currentLevel = 100,
  onClarityChange
}: PosterClarityPreviewProps) {
  const [internalClarity, setInternalClarity] = useState(currentLevel)
  
  // Use controlled value if provided, otherwise use internal state
  const clarity = onClarityChange ? currentLevel : internalClarity
  
  const handleClarityChange = useCallback((values: number[]) => {
    const newValue = values[0]
    if (onClarityChange) {
      onClarityChange(newValue)
    } else {
      setInternalClarity(newValue)
    }
  }, [onClarityChange])

  const handlePresetClick = useCallback((level: number) => {
    if (onClarityChange) {
      onClarityChange(level)
    } else {
      setInternalClarity(level)
    }
  }, [onClarityChange])

  // Calculate blur amount based on clarity percentage
  const blurAmount = Math.max(0, (100 - clarity) / 10)
  
  // Get TMDB image URL or use fallback
  const imageUrl = posterPath 
    ? `https://image.tmdb.org/t/p/w342${posterPath}`
    : null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Poster Clarity Preview</CardTitle>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">{movieTitle}</span>
          <Badge variant="secondary" className="text-sm">
            {clarity}% clarity
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Poster Preview */}
        <div className="flex justify-center">
          <div className="relative w-48 h-72 bg-gray-100 rounded-lg overflow-hidden border">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={`${movieTitle} poster`}
                className="w-full h-full object-cover transition-all duration-300 ease-in-out"
                style={{
                  filter: `blur(${blurAmount}px)`
                }}
              />
            ) : (
              <div 
                className="w-full h-full flex items-center justify-center bg-gray-200 transition-all duration-300 ease-in-out"
                style={{
                  filter: `blur(${blurAmount}px)`
                }}
              >
                <Film className="w-12 h-12 text-gray-400" />
              </div>
            )}
          </div>
        </div>

        {/* Clarity Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Clarity Level</label>
            <span className="text-sm text-gray-500">{clarity}%</span>
          </div>
          
          <Slider
            value={[clarity]}
            onValueChange={handleClarityChange}
            min={5}
            max={100}
            step={5}
            className="w-full"
          />
        </div>

        {/* Preset Clarity Buttons */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Quick Presets</label>
          <div className="flex flex-wrap gap-2">
            {clarityLevels.map((level) => (
              <Button
                key={level}
                variant={clarity === level ? "primary" : "outline"}
                size="sm"
                onClick={() => handlePresetClick(level)}
                className="text-xs px-3 py-1 h-8"
              >
                {level}%
              </Button>
            ))}
          </div>
        </div>

        {/* Clarity Info */}
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Blur Amount:</span>
              <span>{blurAmount.toFixed(1)}px</span>
            </div>
            <div className="flex justify-between">
              <span>Filter:</span>
              <span className="font-mono">blur({blurAmount.toFixed(1)}px)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}