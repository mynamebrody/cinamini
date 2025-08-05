import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

const games = {
  retitled: {
    title: 'Retitled',
    subtitle: '🎬 🏳️ ?',
    description: 'Can you guess the movie from its alternative title?',
    titleColor: '#ffcc00',
  },
  'budget-bracket': {
    title: 'Budget Bracket',
    subtitle: '💰 VS 💰',
    description: 'Which movie had the bigger budget?',
    titleColor: '#00ff88',
  },
  'cast-climb': {
    title: 'Cast Climb',
    subtitle: '🎭 → 🎬',
    description: 'Connect actors through their shared movies',
    titleColor: '#ff6b6b',
  },
  'poster-pixels': {
    title: 'Poster Pixels',
    subtitle: '🖼️ ⟶ 🎬',
    description: 'Identify the movie from its pixelated poster',
    titleColor: '#bb66ff',
  },
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const game = searchParams.get('game') as keyof typeof games
    
    const isGame = game && games[game]
    const title = isGame ? games[game].title : 'cinamini'
    const subtitle = isGame ? games[game].subtitle : 'Daily Movie Puzzles'
    const description = isGame 
      ? games[game].description 
      : 'Test your film knowledge with our collection of daily games!'
    const titleColor = isGame ? games[game].titleColor : '#ffffff'

    return new ImageResponse(
      (
        <div
          style={{
            background: '#1e1e1e',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            style={{
              fontSize: isGame ? 60 : 90,
              fontWeight: 'bold',
              color: titleColor,
              marginBottom: 20,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: isGame ? 80 : 48,
              fontWeight: 'bold',
              color: isGame ? '#ffffff' : '#888888',
              marginBottom: 40,
            }}
          >
            {subtitle}
          </div>
          <div
            style={{
              fontSize: 32,
              color: '#888888',
              textAlign: 'center',
              maxWidth: 800,
              marginBottom: 30,
            }}
          >
            {description}
          </div>
          {isGame && (
            <div
              style={{
                fontSize: 24,
                color: '#666666',
              }}
            >
              Daily puzzle game on cinamini
            </div>
          )}
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (e: any) {
    console.log(`${e.message}`)
    return new Response(`Failed to generate the image`, {
      status: 500,
    })
  }
}