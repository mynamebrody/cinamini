import fs from 'fs'
import path from 'path'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://cinamini.app"

/**
 * Get the OG image URL for a specific page
 * Checks if a static PNG exists, otherwise falls back to dynamic generation
 */
export function getOGImageUrl(imageName: string, gameName?: string): string {
  // In production, always use the defined paths
  if (process.env.NODE_ENV === 'production') {
    return `${BASE_URL}/og-images/${imageName}.png`
  }
  
  // In development, check if static file exists
  const staticPath = path.join(process.cwd(), 'public', 'og-images', `${imageName}.png`)
  const staticExists = fs.existsSync(staticPath)
  
  if (staticExists) {
    return `${BASE_URL}/og-images/${imageName}.png`
  }
  
  // Check for SVG fallback
  const svgPath = path.join(process.cwd(), 'public', 'og-images', `${imageName}.svg`)
  const svgExists = fs.existsSync(svgPath)
  
  if (svgExists) {
    return `${BASE_URL}/og-images/${imageName}.svg`
  }
  
  // Fall back to dynamic generation
  if (gameName) {
    return `${BASE_URL}/api/og?game=${gameName}`
  }
  
  return `${BASE_URL}/api/og`
}