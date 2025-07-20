# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**CineMini** is a daily movie puzzle platform featuring multiple games, starting with "Retitled" - a quick, mobile-first game where players identify English films from their localized titles. Think "Wordle for movie buffs" with spoiler-free sharing.

**Retitled Game Loop:**
1. Show flag 🇪🇸 + localized title "*Solo en Casa*"
2. Player selects from 4-5 English movie options
3. Instant feedback with optional translation tooltip
4. Generate spoiler-free emoji share card

## Development Commands

- `npm dev` - Start development server (uses npm, not pnpm per project setup)
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run Next.js linting

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15 with React 19 & App Router
- **Authentication**: Supabase Auth with SSR support
- **Database**: Supabase PostgreSQL
- **Styling**: Tailwind CSS with shadcn/ui components
- **External API**: TMDB (The Movie Database) for film data
- **Package Manager**: npm (not pnpm - project was migrated)

### Project Structure
```
app/                          # Next.js App Router
├── auth/login/              # Authentication pages
├── auth/sign-up/
├── game/                    # Game-related pages (to be added)
├── stats/                   # User statistics (to be added)
└── share/[id]/             # Share pages for SEO (to be added)

components/                   # React components
├── ui/                      # shadcn/ui component library
├── game/                    # Game-specific components (to be added)
├── login-form.tsx          # Existing auth forms
└── signup-form.tsx

lib/                         # Utilities and configurations
├── supabase/               # Supabase client configurations
├── tmdb/                   # TMDB API utilities (to be added)
├── game/                   # Game logic and puzzle generation (to be added)
└── actions.ts              # Server actions
```

## Database Schema

### Multi-Game Architecture

The database is designed to support multiple puzzle games under the CineMini platform. Core tables use `cinamini_` prefix, while game-specific tables use the game name prefix (e.g., `retitled_` for the localized titles game).

### Core Platform Tables
```sql
-- Users (handled by Supabase Auth)
-- Extends auth.users with profile data

-- User profiles and cross-game statistics
CREATE TABLE cinamini_user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    display_name VARCHAR(100),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cross-game user statistics
CREATE TABLE cinamini_user_stats (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    total_games_played INTEGER DEFAULT 0,
    total_days_active INTEGER DEFAULT 0,
    longest_daily_streak INTEGER DEFAULT 0,
    current_daily_streak INTEGER DEFAULT 0,
    last_played_date DATE,
    favorite_game VARCHAR(50),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game registry for platform management
CREATE TABLE cinamini_games (
    game_id VARCHAR(50) PRIMARY KEY,     -- e.g., 'retitled', 'tagline_tracker'
    display_name VARCHAR(100) NOT NULL,  -- e.g., 'Retitled', 'Tagline Tracker'
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    launch_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Game-Specific Tables (Retitled Game)
```sql
-- Daily puzzles for Retitled game
CREATE TABLE retitled_puzzles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    puzzle_date DATE UNIQUE NOT NULL,
    film_id INTEGER NOT NULL,           -- TMDB film ID
    film_title VARCHAR NOT NULL,        -- Original English title
    localized_title VARCHAR NOT NULL,   -- Foreign title shown to player
    country_code VARCHAR(2) NOT NULL,   -- ISO country code for flag
    distractor_ids INTEGER[] NOT NULL,  -- Array of wrong answer film IDs
    difficulty_level INTEGER DEFAULT 1, -- 1-5 difficulty rating
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User guesses for Retitled game
CREATE TABLE retitled_guesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    puzzle_id UUID REFERENCES retitled_puzzles(id),
    guess_film_id INTEGER NOT NULL,     -- TMDB ID of guessed film
    is_correct BOOLEAN NOT NULL,
    solve_time_ms INTEGER,              -- Time to solve in milliseconds
    hint_used BOOLEAN DEFAULT FALSE,    -- Did player use a hint?
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, puzzle_id)          -- One guess per user per puzzle
);

-- Retitled-specific user statistics
CREATE TABLE retitled_user_stats (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    games_played INTEGER DEFAULT 0,
    games_correct INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    average_solve_time_ms INTEGER,
    best_solve_time_ms INTEGER,
    countries_guessed JSONB DEFAULT '[]', -- Array of country codes guessed correctly
    last_played_date DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Extensible Design Pattern

When adding new games, follow this naming convention:
- `{game_name}_puzzles` - Daily puzzle data
- `{game_name}_guesses` - User interactions  
- `{game_name}_user_stats` - Game-specific statistics

Examples for future games:
- `tagline_tracker_puzzles` - Movie tagline guessing game
- `cast_connection_puzzles` - Actor connection game
- `poster_puzzle_puzzles` - Visual movie poster game

## Game Development Patterns

### Daily Puzzle Generation
- **Timing**: Use UTC midnight as day boundary
- **Seeding**: Deterministic daily seed ensures all users get same puzzle
- **Data Source**: TMDB `/movie/{id}/translations` endpoint
- **Cron Job**: Daily puzzle generation at 00:01 UTC

### TMDB API Integration
```typescript
// Example TMDB utilities structure
export interface TMDBFilm {
  id: number;
  title: string;
  original_title: string;
  release_date: string;
  genre_ids: number[];
}

export interface TMDBTranslation {
  iso_3166_1: string;  // Country code
  data: {
    title: string;
    overview: string;
  };
}

// Rate limiting: 40 requests per 10 seconds
// Cache responses in database for repeated use
```

### Game State Management
- **Streak Logic**: Must play consecutive days (UTC timezone)
- **Scoring**: Binary correct/incorrect with solve time tracking
- **Session Storage**: Temporary game state for incomplete sessions
- **Persistence**: Save to Supabase after each guess

### Share Card Generation
- **Format**: Server-side image generation (HTML-to-PNG)
- **Content**: Country flag emoji + colored squares grid (🟩⬜)
- **Size**: 2x resolution for retina displays
- **Text**: "CineMini #123 🟩⬜⬜🟩 cinemini.app"

## UI/UX Guidelines

### Brand Colors
```css
/* Cinema red (primary) */
--cinema-red: #B31B1B;

/* Background (existing) */
--background: #161616;
--card-background: #1c1c1c;

/* Accent green (existing) */
--accent-green: #2b725e;
--accent-green-hover: #235e4c;

/* Golden accent (for wins/streaks) */
--golden: #FFD700;

/* Text colors (existing) */
--text-primary: #ffffff;
--text-secondary: #gray-400;
```

### Mobile-First Patterns
- **Touch Targets**: Minimum 44px tap areas
- **Haptic Feedback**: Use `navigator.vibrate()` for correct/incorrect
- **Loading States**: Show skeleton UI during TMDB requests
- **Offline Support**: Cache today's puzzle for offline play

### Accessibility Requirements
- **Color Blind**: Use patterns + colors for game feedback
- **Screen Readers**: Proper ARIA labels for game buttons
- **Keyboard Navigation**: Tab order for non-touch devices
- **Focus Indicators**: Visible focus states for all interactive elements

## API Endpoints Structure

### Game API Routes
```typescript
// Multi-game API structure
// app/api/games/route.ts
GET /api/games
// Returns list of available games and their status

// app/api/retitled/puzzle/today/route.ts
GET /api/retitled/puzzle/today
// Returns today's Retitled puzzle data

// app/api/retitled/guess/route.ts  
POST /api/retitled/guess
// Submit guess for Retitled game

// app/api/user/stats/route.ts
GET /api/user/stats
// Cross-game user statistics

// app/api/retitled/stats/route.ts
GET /api/retitled/stats
// Retitled-specific user statistics

// app/api/share/[gameId]/[puzzleId]/route.ts
GET /api/share/retitled/[puzzleId]
// Generate share card for specific game
```

## Environment Variables

```bash
# Supabase (existing)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# TMDB API (required for game)
TMDB_API_KEY=
TMDB_BASE_URL=https://api.themoviedb.org/3

# Share card generation
SHARE_CARD_SECRET=  # For secure share URLs
```

## Development Workflow

1. **New Game Features**: Create in `components/game/` with Storybook stories
2. **Database Changes**: Use Supabase migrations via dashboard or CLI
3. **TMDB Testing**: Use mock data during development to avoid rate limits
4. **Mobile Testing**: Test on actual devices, not just browser dev tools
5. **Share Testing**: Verify share cards render correctly on social platforms

## Performance Considerations

- **TMDB Caching**: Store film data in database after first fetch
- **Image Optimization**: Use Next.js Image component for film posters
- **Bundle Size**: Import only needed Radix UI components
- **Database Indexing**: Index on `puzzle_date`, `user_id`, `created_at`

## Roadmap Integration

### Phase 0.5 (Current Target)
- Complete Retitled game mechanics
- Daily puzzle seeding system
- Basic share functionality

### Phase 1.0 
- User authentication integration (existing forms)
- Cross-game streak tracking and statistics
- Production deployment

### Phase 1.1+
- Additional games (Tagline Tracker, Cast Connection, etc.)
- Social features and leaderboards
- Mobile app wrapper (Capacitor)

## Testing Strategy

- **Game Logic**: Unit tests for puzzle generation and validation
- **API Routes**: Integration tests for all game endpoints  
- **User Flows**: E2E tests for complete game sessions
- **Mobile UX**: Manual testing on iOS/Android devices
- **Share Cards**: Visual regression testing for generated images