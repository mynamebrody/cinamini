# Retitle Game Setup Instructions

## Overview
The Retitle game has been implemented for CineMini. This is a daily puzzle game where players identify English-language films from their localized titles in other countries.

## Implementation Details

### Database Migration
A migration file has been created at `supabase/migrations/20240120_create_retitle_game.sql` that will:
1. Create the `cinamini_games` registry table (if it doesn't exist)
2. Register the Retitle game
3. Create all necessary tables for the game:
   - `retitled_puzzles` - Stores daily puzzles
   - `retitled_guesses` - Tracks user guesses
   - `retitled_user_stats` - Maintains user statistics
4. Insert the hardcoded puzzle for today (Die Hard / Piège de Cristal)

### API Endpoints Created
- `GET /api/games` - Returns list of available games
- `GET /api/retitled/puzzle/today` - Gets today's puzzle
- `POST /api/retitled/guess` - Submits a guess
- `GET /api/retitled/stats` - Gets user statistics
- `GET /api/retitled/share/[puzzleId]` - Generates share text

### Frontend Components
- `app/game/retitled/page.tsx` - Main game page
- `components/game/retitle/retitle-game.tsx` - Game container component
- `components/game/retitle/retitle-puzzle.tsx` - Puzzle display component
- `components/game/retitle/retitle-result.tsx` - Result display component
- `components/game/retitle/retitle-stats.tsx` - Statistics display component
- `components/game-card.tsx` - Game card for home page
- `components/games-list.tsx` - Games list for home page

### Setup Steps

1. **Run the database migration:**
   ```bash
   # If using Supabase CLI
   supabase db push

   # Or run the migration manually in your Supabase SQL editor:
   # Copy the contents of supabase/migrations/20240120_create_retitle_game.sql
   ```

2. **Ensure environment variables are set:**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Access the game:**
   - Login to your account
   - You'll see the Retitle game card on the home page
   - Click "Play Now" to start the game

### Hardcoded Puzzle (MVP)
- **Movie:** Die Hard (1988)
- **Localized Title:** "Piège de Cristal" 🇫🇷 (Crystal Trap - French)
- **Options:** Die Hard, Aliens, Blade Runner, The Terminator

### Features Implemented
- ✅ Daily puzzle with hardcoded Die Hard example
- ✅ Timer tracking solve time
- ✅ Instant feedback on selection
- ✅ Share functionality with spoiler-free format
- ✅ User statistics tracking (games played, accuracy, streaks)
- ✅ Country flag collection
- ✅ Mobile-responsive design
- ✅ Authentication integration

### Next Steps for Phase 2
1. Integrate TMDB API for dynamic puzzles
2. Implement daily puzzle generation system
3. Add puzzle seeding/curation admin panel
4. Implement difficulty levels
5. Add hint system (show release year)

### Testing the Game
1. Navigate to the home page after logging in
2. Click "Play Now" on the Retitle game card
3. Try to identify "Die Hard" from "Piège de Cristal" 🇫🇷
4. View your stats with the trophy button
5. Share your result after guessing

The game is fully functional with the hardcoded puzzle and ready for testing!