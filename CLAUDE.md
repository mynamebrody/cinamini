# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**cinamini** is a daily movie puzzle platform featuring multiple games for movie enthusiasts. Think "Wordle for movie buffs" with spoiler-free sharing and competitive streaks.

### Current Games

#### **Retitled** 🇪🇸
Daily localized title guessing game:
1. Show flag 🇪🇸 + localized title "*Solo en Casa*"
2. Player selects from 4-5 English movie options
3. Instant feedback with optional translation tooltip
4. Generate spoiler-free emoji share card

#### **Budget Bracket** 💰
Progressive movie budget elimination game:
1. Show pairs of movies across 5 rounds
2. Player picks which has the higher budget
3. Wrong guess eliminates you from that round
4. Survive all rounds for a perfect game

#### **Cast Climb** 🎬
Cast member guessing game with progressive reveals:
1. Reveal actors one by one (supporting cast first, leads last)
2. Player searches and guesses the movie after each hint
3. Wrong guesses reveal the next actor in the cast (up to 4 total)
4. Players can keep guessing until they run out of actors (❌❌❌✅)
5. Try to guess with as few hints as possible for better scores!

## Development Commands

### Core Development
- `npm dev` - Start development server (uses npm, not pnpm per project setup)
- `npm run build` - Build for production  
- `npm start` - Start production server
- `npm run lint` - Run Next.js linting
- `npm run quick-dev` - Concurrently run dev server with turbopack and ngrok

**Note**: Do not run `npm run dev` commands automatically. Always hand over testing to human verification.

### Database Management
- `npm run db:reset` - Reset database to latest migration state
- `npm run db:pull` - Pull schema changes from remote database
- `npm run db:push` - Push local migrations to remote database
- `npm run db:start` - Start local Supabase instance
- `npm run db:stop` - Stop local Supabase instance

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
├── api/                     # API routes
│   ├── budget-bracket/      # Budget Bracket API endpoints
│   ├── cast-climb/          # Cast Climb API endpoints  
│   ├── retitled/            # Retitled API endpoints
│   ├── games/              # Multi-game status API
│   ├── movies/search/      # Movie search API
│   └── user/               # User profile and favorites API
├── auth/                   # Authentication pages
│   ├── login/page.tsx
│   └── sign-up/page.tsx
├── game/                   # Individual game pages
│   ├── budget-bracket/page.tsx
│   ├── cast-climb/page.tsx
│   └── retitled/page.tsx
├── profile/page.tsx        # User profile management
├── stats/page.tsx          # Cross-game statistics
└── page.tsx               # Homepage with game selection

components/                   # React components
├── ui/                      # shadcn/ui component library (full Radix UI suite)
├── game/                    # Game-specific components
│   ├── budget-bracket/      # Budget comparison game components
│   ├── cast-climb/          # Cast guessing game components
│   └── retitle/            # Localized title game components
├── auth-dialog.tsx         # Authentication modal
├── game-card.tsx           # Homepage game cards
├── games-list.tsx          # Featured games grid
├── movie-search-*.tsx      # Movie search functionality
└── profile-form.tsx        # User profile management

lib/                         # Utilities and configurations
├── supabase/               # Supabase client configurations
│   ├── client.ts           # Browser client
│   ├── server.ts           # Server client + service role
│   └── middleware.ts       # Auth middleware
├── types/tmdb.ts           # TMDB API type definitions
├── game-seeding.ts         # Unified seeding system for all games
├── budget-bracket.ts       # Budget Bracket game logic
├── cast-climb.ts           # Cast Climb game logic
├── retitled.ts             # Retitled game logic
├── tmdb.ts                 # TMDB API utilities
├── tmdb-trending.ts        # Trending movies caching
└── actions.ts              # Server actions
```

## Database Schema

### Multi-Game Architecture

The database is designed to support multiple puzzle games under the cinamini platform. Core tables use `cinamini_` prefix, while game-specific tables use the game name prefix (e.g., `retitled_` for the localized titles game).

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

### Game-Specific Tables

#### Retitled Game
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

-- User guesses for Retitled game (one guess per puzzle)
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

#### Budget Bracket Game
```sql
-- Daily puzzles for Budget Bracket game
CREATE TABLE budget_bracket_puzzles (
    id SERIAL PRIMARY KEY,
    puzzle_date DATE UNIQUE NOT NULL,
    seed_value VARCHAR(32) NOT NULL,
    pairs JSONB NOT NULL,               -- Array of movie pairs with budget data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User game sessions for Budget Bracket
CREATE TABLE budget_bracket_games (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    puzzle_id INTEGER REFERENCES budget_bracket_puzzles(id),
    choices JSONB NOT NULL,             -- Array of user choices per round
    rounds_completed INTEGER NOT NULL,
    final_result VARCHAR(20) NOT NULL,  -- 'perfect', 'eliminated_round_X'
    is_perfect_game BOOLEAN NOT NULL,
    total_duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, puzzle_id)
);

-- Budget Bracket-specific user statistics  
CREATE TABLE budget_bracket_user_stats (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    games_played INTEGER DEFAULT 0,
    perfect_games INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    total_rounds_won INTEGER DEFAULT 0,
    average_round_reached DECIMAL(3,2) DEFAULT 0,
    last_played_date DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Cast Climb Game
```sql
-- Daily puzzles for Cast Climb game
CREATE TABLE cast_climb_puzzles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    puzzle_date DATE UNIQUE NOT NULL,
    puzzle_number INTEGER NOT NULL,
    film_id INTEGER NOT NULL,           -- TMDB film ID
    film_title VARCHAR NOT NULL,        -- Original English title
    film_poster_url TEXT,
    film_release_year INTEGER,
    actors JSONB NOT NULL,              -- Array of actor objects (reversed order: supporting→leads)
    total_actors INTEGER NOT NULL DEFAULT 4,
    difficulty_level INTEGER DEFAULT 1,
    fun_fact TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User guesses for Cast Climb game (multiple attempts allowed)
CREATE TABLE cast_climb_guesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    puzzle_id UUID REFERENCES cast_climb_puzzles(id),
    guess_film_id INTEGER NOT NULL,     -- TMDB ID of guessed film
    guess_film_title VARCHAR NOT NULL,
    is_correct BOOLEAN NOT NULL,
    actors_revealed INTEGER NOT NULL,   -- How many actors were shown (1-4)
    solve_time_ms INTEGER,              -- Time from start to correct guess
    attempt_number INTEGER NOT NULL,    -- 1st guess, 2nd guess, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cast Climb-specific user statistics
CREATE TABLE cast_climb_user_stats (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    total_guesses INTEGER DEFAULT 0,
    perfect_games INTEGER DEFAULT 0,    -- Won with only 1 guess (first actor)
    average_actors_revealed NUMERIC(3,2),
    average_solve_time_ms INTEGER,
    best_solve_time_ms INTEGER,
    last_played_date DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Extensible Design Pattern

When adding new games, follow this naming convention:
- `{game_name}_puzzles` - Daily puzzle data
- `{game_name}_guesses` or `{game_name}_games` - User interactions  
- `{game_name}_user_stats` - Game-specific statistics

**Current Games Implementation:**
- **retitled_*** - Single guess per puzzle (simple guessing)
- **budget_bracket_*** - Session-based (multi-round elimination)
- **cast_climb_*** - Multiple guesses per puzzle (progressive actor reveals, up to 4 attempts)

**Examples for future games:**
- `tagline_tracker_puzzles` - Movie tagline guessing game
- `poster_puzzle_puzzles` - Visual movie poster game
- `director_connection_puzzles` - Director filmography game

## Game Development Patterns

### Daily Puzzle Generation
- **Timing**: Use UTC midnight as day boundary
- **Seeding**: Deterministic daily seed via `lib/game-seeding.ts` ensures all users get same puzzle
- **Data Sources**: 
  - **Retitled**: TMDB `/movie/{id}/translations` endpoint
  - **Budget Bracket**: TMDB movie details with budget data
  - **Cast Climb**: TMDB `/movie/{id}/credits` endpoint
- **Generation**: Server-side creation using service role client on first access

### TMDB API Integration
```typescript
// Core TMDB interfaces (lib/types/tmdb.ts)
export interface TMDBFilm {
  id: number;
  title: string;
  original_title: string;
  release_date: string;
  genre_ids: number[];
  budget?: number;
  poster_path?: string;
}

export interface TMDBTranslation {
  iso_3166_1: string;  // Country code
  data: {
    title: string;
    overview: string;
  };
}

export interface TMDBCast {
  id: number;
  name: string;
  character: string;
  order: number;
  profile_path: string | null;
}

// Rate limiting: 40 requests per 10 seconds
// Trending movies cached via lib/tmdb-trending.ts
// Movie search available via /api/movies/search
```

### Unified Seeding System
```typescript
// lib/game-seeding.ts provides deterministic randomization
export function generateDailySeed(date: Date, config?: GameSeedConfig): string
export class SeededRandom // LCG-based random number generator

// Usage in game libraries:
const seed = generateDailySeed(date, { gameId: 'cast-climb' });
const rng = new SeededRandom(seed);
const selectedMovie = rng.choice(moviePool);
```

### Game State Management Patterns
- **Streak Logic**: Must play consecutive days (UTC timezone)
- **UX Pattern**: All games use modal stats overlays, not page redirects
- **State Types**: `"loading" | "start" | "playing" | "completed" | "stats" | "error"`
- **Persistence**: Save to Supabase after each guess/session using appropriate client type
- **Authentication**: Use `createClient()` for user ops, `createServiceClient()` for puzzle creation

### Share Text Generation
```typescript
// Game-specific share patterns:
// Retitled: "Retitled #123 🟩" (single guess)
// Budget Bracket: "Budget Bracket #123 🥇 5/5" (rounds completed)
// Cast Climb: "Cast Climb #123 ❌❌❌✅" (multiple attempts until success/failure)

// Cast Climb allows up to 4 attempts (one per actor revealed)
// Patterns: ✅ (1st guess), ❌✅ (2nd guess), ❌❌✅ (3rd guess), ❌❌❌✅ (4th guess)
// Or all wrong: ❌❌❌❌ (failed after all 4 actors shown)

// All include cinamini.app link for sharing
```

## UI/UX Guidelines

### Brand Colors - Sophisticated Cinema Palette
```css
/* Deep Cinema Red (primary brand) */
--cinema-red: #99251d;         /* (153,37,29) */
--cinema-red-dark: #7a1d16;    /* Darker variant for hovers */
--cinema-red-light: #b52d20;   /* Lighter variant for highlights */

/* Golden Yellow Accents */
--cinema-gold: #ebbb4a;        /* (235,187,74) - Warm Golden Yellow */
--cinema-gold-light: #f7ee8b;  /* (247,238,139) - Light Golden Yellow */
--cinema-gold-dark: #d4a935;   /* Darker gold for depth */

/* UI Neutrals */
--charcoal: #3a3a3c;          /* (58,58,60) - Dark Charcoal */
--silver: #d1d2d4;            /* (209,210,212) - Light Silver */

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
// Returns list of available games and their play status

// RETITLED GAME ENDPOINTS
// app/api/retitled/puzzle/today/route.ts
GET /api/retitled/puzzle/today
// Returns today's Retitled puzzle data with options

// app/api/retitled/guess/route.ts  
POST /api/retitled/guess
// Submit guess for Retitled game

// app/api/retitled/stats/route.ts
GET /api/retitled/stats
// Retitled-specific user statistics

// BUDGET BRACKET GAME ENDPOINTS
// app/api/budget-bracket/puzzle/today/route.ts
GET /api/budget-bracket/puzzle/today
// Returns today's Budget Bracket puzzle with movie pairs

// app/api/budget-bracket/submit-game/route.ts
POST /api/budget-bracket/submit-game
// Submit complete game session for Budget Bracket

// app/api/budget-bracket/stats/route.ts
GET /api/budget-bracket/stats
// Budget Bracket-specific user statistics

// CAST CLIMB GAME ENDPOINTS
// app/api/cast-climb/puzzle/today/route.ts
GET /api/cast-climb/puzzle/today
// Returns today's Cast Climb puzzle with cast data

// app/api/cast-climb/guess/route.ts
POST /api/cast-climb/guess
// Submit individual guess for Cast Climb game

// app/api/cast-climb/stats/route.ts
GET /api/cast-climb/stats
// Cast Climb-specific user statistics

// SHARED UTILITIES
// app/api/movies/search/route.ts
GET /api/movies/search?q={query}
// Search TMDB movies for game inputs

// app/api/user/profile/route.ts
GET /api/user/profile
// Get/update user profile data

// app/api/user/favorites/route.ts
GET /api/user/favorites
// Manage user's favorite movies list
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

### Database Management
1. **Migrations**: Use `npm run db:push` for local→remote, create timestamped files in `/supabase/migrations/`
2. **RLS Policies**: Always create policies for user ops (`createClient()`) AND system ops (`createServiceClient()`)
3. **Schema Pattern**: Follow `{game}_puzzles`, `{game}_guesses/games`, `{game}_user_stats` naming

### Game Development
1. **Game Logic**: Create in `lib/{game-name}.ts` with seeded randomization
2. **Components**: Organize in `components/game/{game-name}/` with consistent state patterns
3. **API Routes**: Create in `app/api/{game-name}/` following existing patterns
4. **Stats Integration**: Add game to `/app/stats/page.tsx` tabs and `/api/games/route.ts`

### Testing & Deployment
1. **TMDB Testing**: Use trending cache to avoid rate limits during development
2. **Mobile Testing**: Test on actual devices, not just browser dev tools  
3. **Database Testing**: Use `npm run db:studio` for GUI management
4. **Authentication Flow**: Test both authenticated and unauthenticated states

### Important Implementation Notes
- **Puzzle Creation**: Always use `createServiceClient()` for puzzle insertion to bypass RLS
- **User Operations**: Use `createClient()` for reading puzzles and submitting guesses
- **Seeding**: Use `lib/game-seeding.ts` for deterministic daily puzzles
- **Stats Modals**: Use `setGameState('stats')` pattern, never redirect to `/stats` from games
- **Share Functionality**: Include clipboard fallback and mobile Web Share API support

## Performance Considerations

- **TMDB Caching**: Store film data in database after first fetch
- **Image Optimization**: Use Next.js Image component for film posters
- **Bundle Size**: Import only needed Radix UI components
- **Database Indexing**: Index on `puzzle_date`, `user_id`, `created_at`

## Current Status & Roadmap

### ✅ Phase 1.0 (COMPLETED)
- **Three Full Games**: Retitled, Budget Bracket, Cast Climb
- **User Authentication**: Complete Supabase Auth integration
- **Daily Puzzle System**: Deterministic seeding for all games
- **Statistics Tracking**: Individual game stats with streaks and achievements
- **Share Functionality**: Copy-to-clipboard share text generation
- **Responsive Design**: Mobile-first with inline stats modals
- **Profile Management**: User profiles with favorite movies
- **Cross-Game Homepage**: Featured games with play status tracking

### 🎯 Phase 1.1 (Next Steps)
- **Social Features**: Leaderboards and friend comparisons
- **Enhanced Sharing**: Social media integration with preview cards
- **Performance Optimization**: Caching improvements and bundle optimization
- **Analytics**: User engagement and game difficulty balancing

### 🚀 Phase 2.0 (Future)
- **Additional Games**: Director connections, poster puzzles, tagline guessing
- **Mobile App**: Capacitor wrapper for app stores
- **Advanced Features**: Tournaments, custom puzzles, user-generated content
- **Monetization**: Premium features, ad-free experience, exclusive games

## Testing Strategy

### Game-Specific Testing
- **Retitled**: Test localized titles from different countries, option shuffling
- **Budget Bracket**: Test movie pair generation, elimination logic, perfect games
- **Cast Climb**: Test actor ordering (supporting→leads), progressive reveals (up to 4 actors), multi-guess flow with search integration

### Technical Testing
- **API Routes**: Integration tests for all game endpoints with auth contexts
- **Database**: Test RLS policies with both user and service role clients
- **Seeding**: Verify deterministic puzzle generation across different dates
- **TMDB Integration**: Test rate limiting, caching, and error handling

### User Experience Testing  
- **Mobile UX**: Manual testing on iOS/Android devices with touch interactions
- **Authentication**: Test login/logout flows and session persistence
- **Stats Modals**: Test all game state transitions and navigation
- **Share Functionality**: Test clipboard API and Web Share API on different devices

### Performance Testing
- **Bundle Size**: Monitor component imports and lazy loading
- **Database Queries**: Test query performance with indexes
- **TMDB Caching**: Verify trending movie cache effectiveness
- **Image Loading**: Test poster loading and Next.js Image optimization