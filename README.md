# 🎬 cinamini

> *Snack-size movie challenges, every single day.*

A daily movie puzzle platform featuring four complete games: **Retitled** (localized titles), **Budget Bracket** (budget guessing), **Cast Climb** (cast reveals), and **Poster Pixels** (poster clarity). Anonymous play with seamless conversion to full accounts.

![cinamini Demo](https://via.placeholder.com/800x400/161616/FFFFFF?text=cinamini+Game+Demo)

## 🎯 Game Concept

**Four Daily Games:**

### Retitled 🇪🇸
1. See a foreign movie title like 🇪🇸 "*Solo en Casa*"
2. Choose from 4-5 English film options
3. Get instant feedback with translation tooltip

### Budget Bracket 💰
1. Compare movie budgets across 5 rounds
2. Pick which film had the higher budget
3. Survive all rounds for a perfect score

### Cast Climb 🎬
1. Reveal actors one by one (supporting→leads)
2. Guess the movie with progressive hints
3. Up to 4 attempts with search functionality

### Poster Pixels 🖼️
1. Start with heavily pixelated poster (5% clarity)
2. Reveal more clarity or make your guess
3. 5 clarity levels, score based on when you guess

**Anonymous Play:** Start playing immediately - no sign-up required!

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- TMDB API key

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/cinamini.git
cd cinamini

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in your Supabase and TMDB credentials

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## ⚙️ Environment Setup

Create a `.env.local` file with:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App URL (for password reset emails)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Change to your production URL in production

# TMDB API (get from https://www.themoviedb.org/settings/api)
TMDB_API_KEY=your_tmdb_api_key
TMDB_BASE_URL=https://api.themoviedb.org/3

# Share Card Generation
SHARE_CARD_SECRET=your_random_secret_for_share_urls
 
# UI Feature Flags
# Toggle the global site banner (default: off)
NEXT_PUBLIC_GLOBAL_BANNER_ENABLED=false
```

### Database Setup

1. Create a new Supabase project
2. Use the Supabase CLI to apply schema and seed data:
```bash
# Apply migrations to remote database
npx supabase db push

# For local development with seed data
npx supabase db reset
```

All database schema is managed through Supabase CLI migrations in `/supabase/migrations/`. 
Seed data (like game definitions) is automatically loaded from `/supabase/seed.sql`.

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 15 + React 19 + Tailwind CSS
- **Backend**: Next.js API Routes + Supabase
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth + Anonymous Sign-in
- **External APIs**: TMDB (The Movie Database)
- **UI Components**: shadcn/ui (Radix UI primitives)

### Project Structure
```
├── app/                      # Next.js App Router
│   ├── auth/                 # Authentication pages
│   ├── game/                 # Four complete game interfaces
│   │   ├── retitled/         # Localized title guessing
│   │   ├── budget-bracket/   # Budget comparison game
│   │   ├── cast-climb/       # Cast member guessing  
│   │   └── poster-pixels/    # Progressive poster clarity
│   ├── stats/                # Cross-game user statistics
│   ├── profile/              # User profile management
│   └── api/                  # Complete API endpoints for all games
├── components/               # React components
│   ├── ui/                   # shadcn/ui components
│   ├── game/                 # Game-specific components (all complete)
│   ├── auth-provider.tsx     # Anonymous authentication wrapper
│   └── *.tsx                 # Feature components
├── hooks/                    # React hooks
│   ├── use-game-mode.ts      # Anonymous vs authenticated user state
│   └── useGameShare.ts       # Game sharing utilities
├── lib/                      # Utilities and configurations
│   ├── supabase/             # Database client setup
│   ├── sharing/              # Centralized sharing system
│   ├── game-seeding.ts       # Deterministic daily puzzle generation
│   ├── webhooks.ts           # Analytics webhook integration
│   └── actions.ts            # Server actions
└── supabase/                 # Database migrations and config
```

## 🎮 Game Development

### Daily Puzzle Generation

Puzzles are generated daily at 00:01 UTC using deterministic seeding to ensure all players get the same challenge across all four games.

**Current Games:**
- **Retitled**: Foreign language titles with multiple choice options
- **Budget Bracket**: Movie budget elimination rounds
- **Cast Climb**: Progressive cast member reveals with movie search
- **Poster Pixels**: Progressive poster clarity with 5 difficulty levels

### Anonymous Authentication Flow

```typescript
// Users automatically signed in anonymously on first visit
// AuthProvider wraps entire app in layout.tsx
export function AuthProvider({ children }) {
  const { error } = await supabase.auth.signInAnonymously()
  // Full game access without account creation
}

// Conversion prompts shown after each game
<AnonymousResultNudge 
  gameResult={result}
  gameName="Poster Pixels" 
  // Encourages account creation with progressive messaging
/>
```

### TMDB Integration

We use TMDB's translation API to get localized titles:

```typescript
// Fetch translations for a film
const response = await fetch(
  `${TMDB_BASE_URL}/movie/${filmId}/translations?api_key=${TMDB_API_KEY}`
);
```

**Rate Limits**: 40 requests per 10 seconds (2,000 per day on free tier)
**Caching Strategy**: Store all fetched data in Supabase to minimize API calls

### Game Flow API

```typescript
// Multi-game API structure
GET /api/games
→ Returns all four games with play status

// Game-specific endpoints (pattern for all games)
GET /api/{game}/puzzle/today
→ Returns today's puzzle data

POST /api/{game}/guess
→ Submit guess and get result

GET /api/{game}/stats
→ Game-specific user statistics

// Anonymous user support
// All APIs work with anonymous users (user.is_anonymous = true)
// Stats tracked, conversion prompts shown after each game

// Poster Pixels example (newest game)
GET /api/poster-pixels/puzzle/today
POST /api/poster-pixels/start
POST /api/poster-pixels/guess
POST /api/poster-pixels/complete
GET /api/poster-pixels/stats
```

## 🎨 Design System

### Brand Colors
```css
:root {
  --cinema-red: #B31B1B;        /* Primary brand color */
  --background: #161616;         /* Dark background */
  --card-background: #1c1c1c;    /* Card/input backgrounds */
  --accent-green: #2b725e;       /* Success/CTA color */
  --golden: #FFD700;             /* Streak/achievement color */
  --text-primary: #ffffff;       /* Primary text */
  --text-secondary: #9ca3af;     /* Secondary text */
}
```

### Typography
- **Primary**: Inter (clean sans-serif)
- **Monospace**: For share card previews and code
- **Logo**: Custom film-reel icon forming the 'C' in cinamini

### Mobile-First Principles
- Minimum 44px touch targets
- Haptic feedback on interactions
- Optimized for one-handed use
- Fast loading with skeleton states

## 📱 Features

### ✅ Current (Phase 1.0 - Stable Release)
- **Anonymous Authentication**: Instant play without sign-up required with full database integration
- **Four Complete Games**: Retitled, Budget Bracket, Cast Climb, Poster Pixels (all fully functional)
- **Daily Puzzle System**: Deterministic seeding with proper historical puzzle management
- **Cross-game Statistics**: Streaks, achievements, and performance tracking
- **User Authentication**: Supabase Auth with seamless anonymous conversion
- **Responsive Design**: Mobile-first with dark theme UI and consistent date display
- **Share Functionality**: Copy-to-clipboard with spoiler-free results
- **Profile Management**: User settings and favorite movies
- **Conversion System**: Progressive nudges for anonymous users
- **Performance Optimized**: Efficient API usage, proper caching, and optimized re-renders
- **Historical Game Support**: Proper handling of past puzzles with redirect logic

### 🎯 Planned (Phase 1.1)
- **Social Features**: Friends leaderboards and comparisons  
- **Enhanced Sharing**: Social media integration with preview cards
- **Offline Caching**: Play puzzles without internet connection
- **Performance Optimization**: Bundle size and loading improvements

### 🚀 Future (Phase 2.0+)
- **Additional Games**: Tagline guessing, director connections, etc.
- **Achievement System**: Badges, milestones, and unlockables
- **Mobile App**: Native iOS/Android with Capacitor
- **Premium Features**: Ad-free experience and exclusive content

## 👤 Anonymous User Experience

### Seamless Entry
- **No Friction**: Play immediately without account creation
- **Automatic Sign-in**: Anonymous authentication happens invisibly
- **Full Functionality**: Access to all games and features
- **Progress Tracking**: Stats and streaks saved automatically

### Conversion Strategy
- **Progressive Nudging**: Gentle prompts increase with engagement
- **Data Preservation**: All progress retained after account creation
- **Social Pressure**: Emphasize streaks and potential data loss
- **Timing**: Conversion prompts appear after each game completion

### Technical Implementation
```typescript
// AuthProvider automatically signs in anonymous users
<AuthProvider>
  {/* All users get full app access */}
  {/* Anonymous users see conversion prompts */}
</AuthProvider>

// Middleware protects premium routes
if (isProtectedRoute && isAnonymous) {
  redirect("/auth/sign-up")
}
```

## 🧪 Development Workflow

### Running Locally
```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

### Testing Games
```bash
# Test with mock data (avoids TMDB rate limits)
MOCK_TMDB=true npm run dev

# Generate test puzzle for specific date
npm run generate-puzzle -- --date=2024-01-01
```

### Database Migrations
```bash
# Apply migrations to remote database
npx supabase db push

# Reset local database with fresh schema + seed data (development only)
npx supabase db reset

# Generate new migration file
npx supabase migration new <migration_name>
```

### Local Development Auth Reset
After running `npx supabase db reset`, browser cookies may persist while user records are deleted, causing auth conflicts.

**Quick Fix Options:**
```bash
# Option 1: Visit dev route to clear auth cookies
http://localhost:3000/api/dev/reset-auth

# Option 2: Clear browser storage manually
# In Chrome: DevTools > Application > Storage > Clear site data for localhost:3000
```

## 🚀 Deployment

### Environment Requirements
- Node.js 18+ runtime
- Environment variables configured
- Supabase project with anonymous auth enabled
- TMDB API key with sufficient quota

### Recommended Platforms
- **Vercel** (recommended for Next.js)
- **Netlify**
- **Railway**

### Cron Job Setup
Daily puzzle generation requires a cron job or scheduled function:

```bash
# Daily at 00:01 UTC
0 1 * * * curl -X POST https://your-domain.com/api/generate-daily-puzzle
```

On Vercel, use Vercel Cron:
```javascript
// vercel.json
{
  "crons": [{
    "path": "/api/generate-daily-puzzle",
    "schedule": "1 0 * * *"
  }]
}
```

## 📊 Analytics & Monitoring

### Events Tracked
- `game_start` - User begins daily puzzle
- `game_complete` - User finishes puzzle (correct/incorrect)
- `share_click` - User shares result
- `streak_broken` - User's streak resets
- `puzzle_skipped` - User doesn't play on a given day

### Performance Monitoring
- Core Web Vitals tracking
- TMDB API response times
- Database query performance
- Share card generation speed

## 🔧 Troubleshooting

### Common Issues

#### Date Display Problems
**Issue**: Game splash screens showing wrong dates (e.g., yesterday instead of today)
**Cause**: Timezone conversion when parsing date strings
**Solution**: The app uses UTC date parsing to prevent timezone shifts
```typescript
// Dates are parsed with explicit UTC timezone
const utcDate = new Date(dateString + 'T00:00:00Z')
```

#### Historical Puzzle Access
**Issue**: Getting "Failed to load puzzle" for historical dates
**Expected**: Only today's puzzles can be created; historical puzzles are read-only
**Behavior**: 
- Missing historical puzzles redirect to today's puzzle
- Existing historical puzzles display normally
- Future dates are blocked by validation

#### Anonymous User Issues
**Issue**: Anonymous users getting authentication errors
**Solution**: All APIs support anonymous users with `user.is_anonymous = true`
**Database**: Anonymous users get full database records and functionality

#### Performance Issues
**Issue**: Excessive API calls during transitions
**Cause**: Component re-renders triggering repeated requests
**Solution**: Use `useMemo` for expensive computations and avoid inline object creation in props

### Development Tips

#### TMDB Rate Limits
- **Limit**: 40 requests per 10 seconds (2,000 per day free tier)
- **Prevention**: Cache all responses in database
- **Testing**: Use mock data during development to avoid limits

#### Database Migrations
```bash
# Always test migrations locally first
npx supabase db push --dry-run

# Apply to remote
npx supabase db push
```

#### Authentication Reset
After database resets, clear browser auth state:
```bash
# Visit auth reset endpoint
http://localhost:3000/api/dev/reset-auth

# Or clear browser storage manually
```

## 🤝 Contributing

### Code Style
- TypeScript for all new code
- ESLint + Prettier for formatting
- Conventional commit messages
- Component-driven development

### Adding New Games
1. Create game logic in `lib/game/[game-name]/`
2. Add UI components in `components/game/[game-name]/`
3. Implement API endpoints in `app/api/[game-name]/`
4. Add database tables with `{game_name}_` prefix
5. Register game in `cinamini_games` table
6. Add tests for game mechanics

### Testing
```bash
# Unit tests
npm test

# E2E tests (Playwright)
npm run test:e2e

# Type checking
npm run type-check
```

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🎬 About

cinamini is inspired by the daily puzzle phenomenon, adapted for movie enthusiasts. Our goal is to create bite-sized entertainment that celebrates global cinema while building daily habits and social sharing.

**Team**: Built with ❤️ for movie lovers everywhere.

---

*Ready for today's flick-fix?* Start playing at [cinamini.app](https://cinamini.app)
