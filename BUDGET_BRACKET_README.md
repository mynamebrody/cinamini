# Budget Bracket Game Implementation

## Overview

Budget Bracket is a daily movie guessing game where players compare two movie posters and choose which film had the higher production budget. This implementation follows the Product Requirements Document specifications and includes all required features.

## Game Features

### Core Gameplay
- **5-Round Challenge**: Players must correctly guess 5 pairs to achieve "Perfect Producer" status
- **Progressive Difficulty**: Starts with easy 2x budget differences, ends with challenging 15% differences
- **One Strike Policy**: Wrong answer ends the game immediately
- **Deterministic Daily Puzzles**: All players get the same challenge each day

### User Experience
- **Mobile-First Design**: Optimized for touch interactions and one-handed use
- **Reveal Animation**: Budgets are revealed with smooth animations after selection
- **Visual Feedback**: Color-coded results (green for correct, red for wrong)
- **Progress Tracking**: Visual round indicators throughout gameplay

### Social Features
- **Spoiler-Free Sharing**: 5-emoji pattern (🟩/🟥/⬜) encodes results without revealing movies
- **Streak Tracking**: Daily streak counters with achievement badges
- **Performance Stats**: Detailed analytics including average rounds reached, perfect game rate
- **Achievement System**: Unlockable badges for various milestones

## Technical Architecture

### Database Schema

#### Core Tables
- `budget_bracket_movies`: Movie data with budget information
- `budget_bracket_puzzles`: Daily puzzle configurations
- `budget_bracket_games`: Individual user gameplay sessions  
- `budget_bracket_stats`: Aggregated user statistics

#### Key Features
- **Row Level Security (RLS)**: Users can only access their own data
- **JSONB Storage**: Flexible storage for game choices and puzzle pairs
- **Automated Triggers**: Updated timestamps and user profile creation

### API Endpoints

#### Puzzle Management
- `GET /api/budget-bracket/puzzle/today`: Fetch today's puzzle
- `POST /api/budget-bracket/submit-game`: Submit complete game results
- `GET /api/budget-bracket/stats`: Retrieve user statistics

#### Game Integration
- `GET /api/games`: Lists all available games including Budget Bracket
- Updated to check Budget Bracket completion status

### Game Logic

#### Puzzle Generation
```typescript
// Deterministic daily seed generation
const seed = generateDailySeed(new Date())
const pairs = generatePuzzlePairs(movies, seed)
```

#### Difficulty Progression
- Round 1: ≥ 2.0x budget difference (easy)
- Round 2: ≥ 1.8x budget difference  
- Round 3: ≥ 1.5x budget difference
- Round 4: ≥ 1.3x budget difference
- Round 5: ≤ 1.15x budget difference (hard)

#### Movie Selection Criteria
- Minimum $5M production budget
- Minimum popularity score of 30 (TMDB)
- No duplicate movies across rounds
- Budget source validation and estimation flags

## Component Structure

### Main Components
- `BudgetBracketGame`: Main game coordinator
- `BudgetBracketRound`: Individual round gameplay
- `BudgetBracketResult`: Results display with sharing
- `BudgetBracketStats`: Statistics and achievements

### Key Features
- **State Management**: React hooks for game flow
- **Error Handling**: Graceful fallbacks for API failures
- **Loading States**: Skeleton loaders during data fetching
- **Responsive Design**: Mobile-optimized layouts

## Data Sources

### TMDB Integration
- Movie poster images via TMDB API
- Fallback to placeholder SVG for missing posters
- Rate limiting considerations (40 requests/10s)

### Budget Data
- Primary source: TMDB production budget fields
- Secondary: The Numbers database (future enhancement)
- Estimation flags for uncertain data
- Multi-source validation

## Analytics & Tracking

### Gameplay Events
- `bb_game_start`: Game initiation
- `bb_round_pick`: Individual round choices
- `bb_game_end`: Game completion
- `bb_share_click`: Social sharing actions

### Performance Metrics
- Average session length (target: ≤ 90 seconds)
- 7-day retention rates
- Share card click-through rates
- Perfect game percentages

## Accessibility

### Screen Reader Support
- `aria-label` attributes on all interactive elements
- Semantic HTML structure
- High contrast mode compatibility
- Keyboard navigation support

### Mobile Optimization
- Minimum 44px touch targets
- One-handed operation design
- Fast loading with image optimization
- Offline-ready architecture (future)

## Development Setup

### Prerequisites
```bash
# Environment variables needed
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
TMDB_API_KEY=your_tmdb_api_key
```

### Database Migration
```sql
-- Run migrations in order:
-- 005_create_budget_bracket_tables.sql
-- 006_add_budget_bracket_to_games.sql
```

### Sample Data
The migration includes 10 sample movies with budget data for immediate testing:
- Avengers: Endgame ($356M)
- Avengers: Infinity War ($321M)
- Avatar ($237M)
- The Avengers ($220M)
- Titanic ($200M)
- And more...

## Performance Optimizations

### Image Loading
- Lazy loading for movie posters
- Progressive JPEG/WebP format
- CDN delivery via TMDB
- Placeholder SVG for missing images

### API Efficiency
- Deterministic puzzle generation (one-time daily)
- Batched game submission
- Optimized database queries
- Edge function deployment ready

### Caching Strategy
- Daily puzzles cached at edge
- Movie data cached in database
- User stats cached between sessions

## Future Enhancements

### Phase 2 Features
- **Practice Mode**: Unlimited gameplay after daily completion
- **Leaderboards**: Weekly/monthly top performers
- **Themed Puzzles**: Genre-specific budget challenges
- **Multiplayer**: Head-to-head budget battles

### Technical Improvements
- **PWA Support**: Offline puzzle caching
- **Push Notifications**: Daily puzzle reminders
- **Advanced Analytics**: Detailed player behavior tracking
- **A/B Testing**: Difficulty curve optimization

## Testing Strategy

### Unit Tests
- Game logic functions
- Puzzle generation algorithms
- Statistics calculations
- Share text generation

### Integration Tests
- API endpoint validation
- Database constraint verification
- User flow testing
- Error handling scenarios

### Performance Testing
- Load testing for daily puzzle generation
- Image loading optimization
- Mobile device performance
- Network connectivity resilience

## Deployment

### Production Checklist
- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] TMDB API rate limits configured
- [ ] Analytics tracking verified
- [ ] Social sharing tested
- [ ] Mobile performance validated

### Monitoring
- API response times
- Error rates and types
- User engagement metrics
- Database performance
- Image loading speeds

## Contributing

### Code Style
- TypeScript for type safety
- Functional components with hooks
- Tailwind CSS for styling
- ESLint/Prettier for consistency

### Pull Request Process
1. Feature branch from main
2. Comprehensive testing
3. Performance impact assessment
4. Documentation updates
5. Code review approval

---

## Quick Start

1. **Set up environment variables** (see .env.example)
2. **Run database migrations** (SQL files in order)
3. **Start development server**: `npm run dev`
4. **Navigate to**: `/game/budget-bracket`
5. **Play the game** and test all features!

The game is now fully integrated into the CineMini platform and ready for production deployment.