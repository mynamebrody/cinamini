// Simple utility to combine class names without external dependencies
export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(' ')
}

// Smart time formatting utility for game result displays
export function formatGameTime(ms: number | null): string {
  if (!ms || ms <= 0) return '0s'
  
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  } else if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  } else {
    return `${seconds}s`
  }
}