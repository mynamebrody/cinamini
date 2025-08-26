"use client"

import { useState, useCallback, useRef, useEffect } from "react"
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
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
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
  
  // Get TMDB image URL or use fallback
  const imageUrl = posterPath 
    ? `https://image.tmdb.org/t/p/w342${posterPath}`
    : null

  // Pixelation effect (same logic as the game)
  const drawPixelatedPoster = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      console.log("No canvas ref")
      return
    }
    
    if (!imageUrl) {
      console.log("No image URL")
      const ctx = canvas.getContext("2d")
      if (ctx) drawFallbackPoster(ctx, canvas)
      return
    }
    
    console.log("Drawing pixelated poster with URL:", imageUrl)
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    const img = new Image()
    // Try without CORS first for TMDB images
    img.src = imageUrl
    
    img.onload = () => {
      console.log("Image loaded successfully")
      try {
        // Calculate pixel size based on clarity (inverted - lower clarity = more pixelation)
        const pixelSize = Math.max(1, Math.floor((1 - clarity / 100) * 50) + 1)
        
        canvas.width = 300
        canvas.height = 450
        ctx.imageSmoothingEnabled = false
        
        // Create temporary canvas for downscaling
        const tempCanvas = document.createElement("canvas")
        const tempCtx = tempCanvas.getContext("2d")
        if (!tempCtx) return
        
        const scaledWidth = Math.max(1, Math.floor(canvas.width / pixelSize))
        const scaledHeight = Math.max(1, Math.floor(canvas.height / pixelSize))
        tempCanvas.width = scaledWidth
        tempCanvas.height = scaledHeight
        
        // Draw image small first
        tempCtx.drawImage(img, 0, 0, scaledWidth, scaledHeight)
        
        // Then scale it back up for pixelation effect
        ctx.drawImage(tempCanvas, 0, 0, scaledWidth, scaledHeight, 0, 0, canvas.width, canvas.height)
      } catch (error) {
        console.error("Error drawing pixelated poster:", error)
        drawFallbackPoster(ctx, canvas)
      }
    }
    
    img.onerror = (error) => {
      console.error("Failed to load image:", error, "URL:", imageUrl)
      // Try with CORS as fallback
      const imgWithCors = new Image()
      imgWithCors.crossOrigin = "anonymous"
      imgWithCors.src = imageUrl
      
      imgWithCors.onload = () => {
        console.log("Image loaded with CORS")
        const pixelSize = Math.max(1, Math.floor((1 - clarity / 100) * 50) + 1)
        
        canvas.width = 300
        canvas.height = 450
        ctx.imageSmoothingEnabled = false
        
        const tempCanvas = document.createElement("canvas")
        const tempCtx = tempCanvas.getContext("2d")
        if (!tempCtx) return
        
        const scaledWidth = Math.max(1, Math.floor(canvas.width / pixelSize))
        const scaledHeight = Math.max(1, Math.floor(canvas.height / pixelSize))
        tempCanvas.width = scaledWidth
        tempCanvas.height = scaledHeight
        
        tempCtx.drawImage(imgWithCors, 0, 0, scaledWidth, scaledHeight)
        ctx.drawImage(tempCanvas, 0, 0, scaledWidth, scaledHeight, 0, 0, canvas.width, canvas.height)
      }
      
      imgWithCors.onerror = () => {
        console.error("Failed to load image even with CORS")
        drawFallbackPoster(ctx, canvas)
      }
    }
  }, [clarity, imageUrl])

  const drawFallbackPoster = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    canvas.width = 300
    canvas.height = 450
    ctx.fillStyle = '#f3f4f6'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#d1d5db'
    ctx.lineWidth = 2
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2)
    ctx.fillStyle = '#6b7280'
    ctx.font = '16px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('No Poster Available', canvas.width / 2, canvas.height / 2)
  }

  // Initial canvas setup
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    // Initialize canvas size
    canvas.width = 300
    canvas.height = 450
    
    // Draw initial state
    drawPixelatedPoster()
  }, []) // Run once on mount

  // Redraw when clarity changes
  useEffect(() => {
    if (canvasRef.current && imageUrl) {
      drawPixelatedPoster()
    }
  }, [clarity, drawPixelatedPoster, imageUrl])

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
          <div className="relative bg-gray-100 rounded-lg overflow-hidden border">
            <canvas
              ref={canvasRef}
              className="max-w-full h-auto"
              width={300}
              height={450}
              style={{ 
                width: '192px', 
                height: '288px',
                imageRendering: 'pixelated'
              }}
            />
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
              <span>Pixel Size:</span>
              <span>{Math.max(1, Math.floor((1 - clarity / 100) * 50) + 1)}px</span>
            </div>
            <div className="flex justify-between">
              <span>Effect:</span>
              <span className="font-mono">Pixelation</span>
            </div>
            <div className="flex justify-between">
              <span>Canvas Size:</span>
              <span>300x450px</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}