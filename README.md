# 🎬 CineMini

> *Snack-size movie challenges, every single day.*

A daily movie puzzle platform featuring multiple games, starting with **Retitled** - a quick, mobile-first game where players identify English films from their localized titles. Think "Wordle for movie buffs" with spoiler-free sharing.

![CineMini Demo](https://via.placeholder.com/800x400/161616/FFFFFF?text=CineMini+Game+Demo)

## 🎯 Game Concept

**How it works:**
1. See a foreign movie title like 🇪🇸 "*Solo en Casa*"
2. Choose from 4-5 English film options
3. Get instant feedback with translation tooltip
4. Share your result with spoiler-free emoji grid

**Example Share:** `CineMini #123 🇪🇸 🟩⬜⬜🟩 cinemini.app`

## 🎬 Features

### Movie Search
- **TMDB Integration**: Secure backend integration with The Movie Database API
- **Real-time Search**: Search movies as you type with instant results
- **Rich Movie Data**: View movie posters, titles, release years, ratings, and descriptions
- **Responsive Design**: Mobile-first design with clean, organized movie cards
- **Authentication Required**: Search feature only available to logged-in users
- **Error Handling**: Graceful handling of API failures and network issues

### User Experience
- **Authentication**: Secure user registration and login with Supabase
- **Dashboard**: Clean, modern interface with movie search functionality
- **Loading States**: Smooth loading indicators during searches
- **Empty States**: Helpful messages when no results are found

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- TMDB API key (from [themoviedb.org](https://www.themoviedb.org/settings/api))

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

# TMDB API (get from https://www.themoviedb.org/settings/api)
TMDB_API_KEY=your_tmdb_api_key

# Share Card Generation
SHARE_CARD_SECRET=your_random_secret_for_share_urls
```

### Database Setup

1. Create a new Supabase project
2. Run the SQL migrations in `/sql/` directory:
   - `001_create_cinamini_core_tables.sql` - Platform tables
   - `002_create_retitled_tables.sql` - Retitled game tables

Or use the Supabase CLI:
```bash
npx supabase db push
```

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 15 + React 19 + Tailwind CSS
- **Backend**: Next.js API Routes + Supabase
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **External APIs**: TMDB (The Movie Database)
- **UI Components**: shadcn/ui (Radix UI primitives)

### Project Structure
```
├── app/                      # Next.js App Router
│   ├── auth/                 # Authentication pages
│   ├── game/                 # Game interface (to be built)
│   ├── stats/                # User statistics (to be built)
│   ├── share/[id]/           # Share pages for SEO (to be built)
│   └── api/                  # API endpoints
│       └── movies/           # Movie-related endpoints
│           └── search/       # TMDB movie search endpoint
├── components/               # React components
│   ├── ui/                   # shadcn/ui components
│   ├── game/                 # Game-specific components (to be built)
│   ├── movie-search.tsx      # Movie search component with TMDB integration
│   └── *.tsx                 # Other feature components
├── lib/                      # Utilities and configurations
│   ├── supabase/             # Database client setup
│   ├── tmdb/                 # TMDB API utilities (to be built)
│   ├── game/                 # Game logic (to be built)
│   └── actions.ts            # Server actions
└── sql/                      # Database migrations (to be created)
```

## 🎮 Game Development

### Daily Puzzle Generation

Puzzles are generated daily at 00:01 UTC using a deterministic seed to ensure all players get the same challenge.

```typescript
// Example Retitled puzzle structure
interface RetitledPuzzle {
  id: string;
  puzzle_date: string;
  film_id: number;           // TMDB film ID
  film_title: string;        // English title
  localized_title: string;   // Foreign title shown to player
  country_code: string;      // For flag emoji
  distractor_ids: number[];  // Wrong answer options
  difficulty_level: number;  // 1-5 difficulty rating
}
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
// Get available games
GET /api/games
→ Returns list of active games

// Get today's Retitled puzzle
GET /api/retitled/puzzle/today
→ Returns today's puzzle data (without correct answer)

// Submit a Retitled guess
POST /api/retitled/guess
Body: { puzzleId, guessFilmId, solveTimeMs }
→ Returns result + updated user stats

// Get cross-game user statistics
GET /api/user/stats
→ Returns overall streak, total games, favorite game

// Get Retitled-specific statistics
GET /api/retitled/stats
→ Returns game-specific accuracy, solve times, countries guessed
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
- **Logo**: Custom film-reel icon forming the 'C' in CineMini

### Mobile-First Principles
- Minimum 44px touch targets
- Haptic feedback on interactions
- Optimized for one-handed use
- Fast loading with skeleton states

## 📱 Features

### Current (Phase 0.5)
- ✅ User authentication (Supabase Auth)
- ✅ Responsive dark theme UI
- ✅ Mobile-optimized forms
- 🚧 Retitled game mechanics
- 🚧 Daily puzzle system
- 🚧 Basic share functionality

### Planned (Phase 1.0)
- Cross-game streak tracking and statistics
- User profile and settings
- Offline puzzle caching
- Social sharing integration

### Future (Phase 1.1+)
- Additional game modes (Tagline Tracker, Cast Connection, etc.)
- Friends leaderboard and cross-game achievements
- Achievement system
- Mobile app (Capacitor)

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
# Apply migrations
npx supabase db push

# Reset database (development only)
npx supabase db reset
```

## 🚀 Deployment

### Environment Requirements
- Node.js 18+ runtime
- Environment variables configured
- Supabase project set up
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

CineMini is inspired by the daily puzzle phenomenon popularized by Wordle, adapted for movie enthusiasts. Our goal is to create bite-sized entertainment that celebrates global cinema while building daily habits and social sharing.

**Team**: Built with ❤️ for movie lovers everywhere.

---

*Ready for today's flick-fix?* Start playing at [cinemini.app](https://cinemini.app)