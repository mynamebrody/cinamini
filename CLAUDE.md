# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**cinamini** is a daily movie puzzle platform featuring four games for movie enthusiasts. Think "Wordle for movie buffs" with spoiler-free sharing and competitive streaks.

### Current Games

- **Retitled** 🇪🇸: Daily localized title guessing (flag + foreign title → select from English options)
- **Budget Bracket** 💰: Progressive elimination game (pick higher budget movie across 5 rounds)
- **Cast Climb** 🎬: Progressive cast reveals (supporting→leads, up to 4 attempts)
- **Poster Pixels** 🎨: Progressive clarity reveals (5%, 15%, 35%, 65%, 100% clarity, scoring: 1000→100 pts)

## Development Commands

### Core Development
- `npm run build` - Build for production  
- `npm start` - Start production server
- `npm run lint` - Run Next.js linting

**IMPORTANT**: Do NOT run `npm dev`, `npm run dev`, or `npm run quick-dev` commands automatically. Always hand over testing to human verification.

### Database Management
- `npm run db:push` - Push local migrations to remote database
- `npm run db:pull` - Pull schema changes from remote database
- `npm run db:reset` - Reset database to latest migration state

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15 with React 19 & App Router
- **Authentication**: Supabase Auth with SSR support + Anonymous Sign-in
- **Database**: Supabase PostgreSQL
- **Styling**: Tailwind CSS with shadcn/ui components
- **External API**: TMDB (The Movie Database) for film data
- **Package Manager**: npm (not pnpm)

### Key Directories
```
app/                    # Next.js App Router (API routes, pages)
components/             # React components (ui/, game/, auth-*)
lib/                    # Utilities (supabase/, game logic, TMDB)
hooks/                  # React hooks (use-game-mode.ts, useGameShare.ts)
```

## Database Schema

### Design Pattern
Core tables use `cinamini_` prefix, game-specific tables use `{game_name}_` prefix:
- `{game}_puzzles` - Daily puzzle data
- `{game}_guesses` or `{game}_games` - User interactions  
- `{game}_user_stats` - Game-specific statistics

### Key Tables
- `cinamini_user_profiles` - User profiles and cross-game stats
- `retitled_*` - Single guess per puzzle
- `budget_bracket_*` - Session-based multi-round elimination
- `cast_climb_*` - Multiple guesses (progressive reveals, up to 4 attempts)
- `poster_pixels_*` - Multiple guesses (progressive clarity, up to 5 attempts)

## Game Development Patterns

### Daily Puzzle Generation
- **Timing**: Use UTC midnight as day boundary
- **Seeding**: Deterministic via `lib/game-seeding.ts` ensures same puzzle for all users
- **Generation**: Server-side creation using service role client on first access
- **Authentication**: Use `createClient()` for user ops, `createServiceClient()` for puzzle creation

### State Management
- **UX Pattern**: All games use modal stats overlays, not page redirects
- **State Types**: `"loading" | "start" | "playing" | "completed" | "stats" | "error"`
- **Stats Modals**: Use `setGameState('stats')` pattern, never redirect to `/stats`

## UI/UX Guidelines

### Brand Colors
```css
--cinema-red: #99251d;        /* Primary brand */
--cinema-gold: #ebbb4a;       /* Accents */
--charcoal: #3a3a3c;         /* Dark neutrals */
--silver: #d1d2d4;           /* Light neutrals */
```

### 3D Box Shadow Pattern
The app uses distinctive layered shadows throughout:
```css
/* Standard 3D effect */
shadow-[1px_1px_0px_rgb(153,37,29),2px_2px_0px_rgb(153,37,29),
        3px_3px_0px_rgb(153,37,29),4px_4px_0px_rgb(153,37,29)]
```

### Mobile-First Patterns
- Minimum 44px touch targets
- Use `navigator.vibrate()` for game feedback
- Show skeleton UI during TMDB requests

## Anonymous Authentication System

### Overview
Seamless anonymous sign-in allows immediate gameplay without account creation, with progressive conversion prompts.

### Key Components
- `AuthProvider` - Auto signs in anonymous users
- `useGameMode` - Detects `user?.is_anonymous === true`
- `AnonymousResultNudge` - Conversion prompts after games
- Protected routes redirect anonymous users to sign-up

### Database Considerations
- Anonymous users get full database records with `is_anonymous = true`
- All game APIs work identically for anonymous and authenticated users
- Stats preserved if user converts to full account

## API Endpoints Structure

```typescript
GET  /api/games                           // Multi-game status
GET  /api/{game}/puzzle/today            // Today's puzzle
POST /api/{game}/guess                   // Submit guess
GET  /api/{game}/stats                   // Game-specific stats
GET  /api/movies/search?q={query}        // TMDB search
```

## Important Implementation Notes

### Database Operations
- **Puzzle Creation**: Always use `createServiceClient()` for puzzle insertion (bypasses RLS)
- **User Operations**: Use `createClient()` for reading puzzles and submitting guesses
- **Precision Types**: Always specify precision in migrations: `NUMERIC(3,2)`, not `NUMERIC`

### Date Handling
Force UTC interpretation to prevent timezone shifts:
```typescript
const [year, month, day] = dateString.split('-').map(Number)
const utcDate = new Date(Date.UTC(year, month - 1, day))
```

### Performance Patterns
- Memoize expensive computations to prevent re-renders
- Define callbacks before useEffects that use them
- Use consistent field names between API endpoints

### Historical Puzzles
- Only today's puzzles created automatically
- Historical puzzles are read-only
- Frontend redirects when historical puzzles don't exist

## Webhook Integration

### Configuration
Set `CINAMINI_GUESS_WEBHOOK_URL` for external integration (Zapier, Make, n8n)

### Implementation
- 2-second timeout, non-blocking
- Fire-and-forget (don't await)
- Webhooks fire for both authenticated and anonymous users

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# TMDB API
TMDB_API_KEY=
TMDB_BASE_URL=https://api.themoviedb.org/3

# Optional
SHARE_CARD_SECRET=
CINAMINI_GUESS_WEBHOOK_URL=
```

## Common Development Patterns

### Error Recovery
```typescript
// Webhook error handling (non-blocking)
const webhookPromise = sendGuessWebhook(request, payload)
webhookPromise.catch(error => {
  console.error("Webhook failed:", error)
  // Don't throw - let game continue
})
```

### Race Condition Prevention
- Fire webhooks immediately, don't await
- Update local state before async operations
- Use upsert for stats to prevent duplicate key errors

## Testing Strategy

### Game-Specific Testing
- Test progressive reveals, scoring systems, max attempts
- Verify deterministic puzzle generation across dates
- Test both authenticated and anonymous user flows

### Edge Case Testing
- Skip vs Give Up behavior
- UTC midnight puzzle transitions
- API field consistency between endpoints
- Component re-renders and hook dependencies