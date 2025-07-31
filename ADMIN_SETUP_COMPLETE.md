# CinaMini Admin System - Complete Setup & Documentation Guide

## Table of Contents
1. [System Architecture Overview](#system-architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Initial Setup](#initial-setup)
4. [Admin Features Documentation](#admin-features-documentation)
5. [API Reference](#api-reference)
6. [Security Configuration](#security-configuration)
7. [Database Schema](#database-schema)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)

## System Architecture Overview

The CinaMini admin system is built with:
- **Frontend**: Next.js 15 App Router with React 19
- **UI Components**: shadcn/ui with Radix UI primitives
- **Authentication**: Supabase Auth with middleware protection
- **Database**: PostgreSQL via Supabase with Row Level Security (RLS)
- **External APIs**: TMDB for movie data
- **State Management**: React hooks with optimistic updates

### Key Architectural Decisions
- Server-side authentication checks in middleware
- Service role clients for admin operations bypassing RLS
- Unified puzzle editor for all game types
- Real-time preview system for puzzle creation
- Drag-and-drop scheduling with @dnd-kit

## Prerequisites

### Required Environment Variables
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# TMDB API Configuration
TMDB_API_KEY=your-tmdb-api-key
TMDB_BASE_URL=https://api.themoviedb.org/3

# Optional: Share Card Generation
SHARE_CARD_SECRET=your-secret-key
```

### Required Software
- Node.js 18+ 
- npm (not pnpm - project uses npm)
- Supabase CLI (optional for local development)

## Initial Setup

### Step 1: Database Setup

1. **Run Database Migrations**
   ```bash
   # For fresh setup
   npm run db:reset
   
   # For existing database
   npm run db:push
   ```

2. **Key Migration Files**
   - `20250729000000_add_super_admin.sql` - Adds admin user support
   - `20250729000001_add_published_status.sql` - Adds draft/published states
   - `20250729000002_admin_puzzle_policies.sql` - Sets up RLS policies
   - `20250730000001_fix_profile_recursion_v2.sql` - Fixes admin checks
   - `20250130_remove_puzzle_date_unique_constraints.sql` - Allows draft puzzles

### Step 2: Create Super Admin User

#### Option A: Automatic Setup (Recommended)
1. Create account with email `admin@cinamini.com`
2. System automatically grants admin privileges via seed file

#### Option B: Manual Setup
1. Create any user account
2. Open Supabase Studio:
   ```bash
   npm run db:studio
   ```
3. Navigate to `cinamini_user_profiles` table
4. Set `is_super_admin = true` for your user

### Step 3: Verify Setup
1. Login with admin account
2. Navigate to `/admin`
3. You should see the admin dashboard

## Admin Features Documentation

### 1. Admin Dashboard (`/admin`)
The main hub for all administrative functions.

**Features:**
- Quick stats overview (users, puzzles, engagement)
- Navigation to all admin tools
- System health indicators

**Components:**
- Bento box layout with animated cards
- Quick action buttons
- Real-time statistics

### 2. Unified Puzzle Editor (`/admin/puzzle-editor`)
Single interface for creating puzzles across all games.

**Features:**
- **Tab-based Interface**: Switch between Retitled, Budget Bracket, and Cast Climb
- **Real-time Preview**: See how puzzles appear to players
- **Draft/Published States**: Save work without making it live
- **Movie Search Integration**: Advanced search with availability status

#### Retitled Puzzle Editor
- Select movie and localized title
- Add 3-5 distractor options
- Country flag selection
- Automatic translation fetching from TMDB

#### Budget Bracket Editor
- Create 5 rounds of movie pairs
- Visual budget comparison
- Automatic movie data enrichment
- Drag-to-reorder functionality

#### Cast Climb Editor
- Select exactly 4 actors
- Drag-to-reorder (supporting actors shown first)
- Fun fact generation
- Actor profile images

**Key UI Elements:**
```typescript
// Status Toggle (Fixed white-on-white issue)
<div className="flex items-center gap-3 h-10 px-3 rounded-lg bg-gray-50 border border-gray-200">
  <Switch className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-300" />
  <span className={isPublished ? "text-green-700" : "text-gray-600"}>
    {isPublished ? "Published" : "Draft"}
  </span>
</div>
```

### 3. Analytics Dashboard (`/admin/analytics`)
Comprehensive platform analytics with multiple views.

**Features:**
- **Overview Tab**: Key metrics and trends
- **Games Tab**: Performance by game type
- **Users Tab**: User engagement metrics
- **Revenue Tab**: Monetization tracking (if applicable)

**Visualizations:**
- Line charts for trends
- Bar charts for comparisons
- Stat cards with growth indicators
- User retention cohorts

**Data Points:**
- Daily Active Users (DAU)
- Game completion rates
- User retention metrics
- Popular puzzles
- Geographic distribution

### 4. Schedule Management (`/admin/schedule`)
Visual calendar for puzzle scheduling.

**Features:**
- **Drag-and-Drop**: Reschedule puzzles by dragging
- **Visual Calendar**: Month view with puzzle indicators
- **Draft Pool**: Unscheduled puzzles ready for scheduling
- **Conflict Prevention**: Prevents duplicate dates per game
- **Past Date Protection**: Can't schedule for today or past dates

**Key Interactions:**
- Click date to view puzzles
- Drag puzzle to reschedule
- Different colors for each game type
- Quick stats overview

### 5. Movie Search (`/admin/movies`)
Advanced movie database search with status tracking.

**Features:**
- **TMDB Integration**: Access to full movie database
- **Status Indicators**:
  - 🟢 Green: Available for use
  - 🔴 Red: Recently used (last 30 days)
  - 🟡 Yellow: Coming soon (releases within 30 days)
  - ⚫ Gray: Not yet released
- **Usage History**: See when/where movies were used
- **Detailed View**: Full movie information modal
- **Quick Actions**: Direct puzzle creation from search

**Search Filters:**
- All Movies
- Available Only
- Recently Used
- Coming Soon
- Not Released

## API Reference

### Admin API Endpoints

#### Puzzle Management
```typescript
// Save any puzzle type
POST /api/admin/puzzles/save
Body: {
  gameType: 'retitled' | 'budget_bracket' | 'cast_climb',
  puzzleData: {
    // Game-specific fields
  }
}

// Reschedule puzzle
POST /api/admin/puzzles/reschedule
Body: {
  puzzleId: string,
  gameType: string,
  newDate: string // YYYY-MM-DD
}

// Get schedule
GET /api/admin/puzzles/schedule?start=YYYY-MM-DD&end=YYYY-MM-DD
```

#### Analytics
```typescript
// Overview stats
GET /api/admin/analytics/overview

// Game-specific stats
GET /api/admin/analytics/games

// User analytics
GET /api/admin/analytics/users
```

#### Movie Management
```typescript
// Check movie usage
GET /api/admin/movies/usage?movieId=123

// Get movie details
GET /api/movies/[id]/details

// Get alternative titles
GET /api/movies/[id]/alternative-titles

// Get cast/credits
GET /api/movies/[id]/credits
```

## Security Configuration

### Middleware Protection
Located in `/middleware.ts`:
```typescript
// Protects all /admin/* routes
// Redirects non-admins to home page
// Checks is_super_admin flag
```

### RLS Policies
Key policies for admin access:
```sql
-- Admins can insert puzzles
CREATE POLICY "Admins can insert puzzles" ON retitled_puzzles
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM cinamini_user_profiles
    WHERE user_id = auth.uid()
    AND is_super_admin = true
  )
);

-- Similar policies for update and delete
```

### Service Role Usage
Admin operations use service role client to bypass RLS:
```typescript
const serviceSupabase = await createServiceClient()
// Used for puzzle creation, analytics queries
```

## Database Schema

### Admin-Specific Tables
```sql
-- User profiles with admin flag
cinamini_user_profiles (
  user_id UUID PRIMARY KEY,
  is_super_admin BOOLEAN DEFAULT FALSE,
  -- other fields
)

-- Puzzle tables with published status
[game]_puzzles (
  id UUID PRIMARY KEY,
  is_published BOOLEAN DEFAULT FALSE,
  puzzle_date DATE, -- NULL for drafts
  -- game-specific fields
)
```

### Important Constraints
- Unique puzzle_date per game (when not NULL)
- Seed value format: `^[a-zA-Z0-9_-]+$` (max 32 chars)
- Puzzle numbers auto-increment per game

## Troubleshooting

### Common Issues

#### 1. "Cannot save draft puzzles" Error
**Cause**: Database unique constraint on puzzle_date
**Solution**: Run migration `20250130_remove_puzzle_date_unique_constraints.sql`

#### 2. "403 Forbidden" on Admin Routes
**Cause**: User not marked as super admin
**Solution**: Check `is_super_admin` in database

#### 3. Movie Search Returns 400
**Cause**: Missing or invalid TMDB API key
**Solution**: Verify `TMDB_API_KEY` environment variable

#### 4. Drag-and-Drop Not Working
**Cause**: Trying to move past/today puzzles
**Solution**: Only future-dated puzzles can be rescheduled

#### 5. White-on-White Toggle
**Cause**: Missing Tailwind classes
**Solution**: Ensure custom Switch styling is applied

### Debug Commands
```bash
# Check database connection
npm run db:studio

# View real-time logs
supabase db logs --tail

# Reset local database
npm run db:reset
```

## Best Practices

### 1. Puzzle Creation Workflow
1. Search for available movies first
2. Create as draft for review
3. Test with preview feature
4. Schedule at least 1 week ahead
5. Publish only after review

### 2. Scheduling Guidelines
- Maintain variety across game types
- Avoid using same movie within 30 days
- Schedule easier puzzles for weekends
- Keep 2-week buffer of scheduled content

### 3. Performance Tips
- Use movie search filters to reduce results
- Bulk schedule during off-peak hours
- Regular cleanup of old draft puzzles
- Monitor analytics for popular content

### 4. Security Practices
- Rotate admin credentials regularly
- Limit number of super admins
- Review audit logs weekly
- Test new features in draft mode first

### 5. Content Guidelines
- Verify movie release dates
- Check for appropriate content
- Balance difficulty levels
- Consider global audience for Retitled

## Advanced Features

### Bulk Operations
- Bulk scheduling from draft pool
- Batch difficulty adjustments
- Mass publish/unpublish

### Export/Import
- Export puzzle data for backup
- Import puzzles from JSON
- Analytics data export

### Customization
- Custom difficulty algorithms
- Regional movie preferences
- Automated scheduling rules

## Future Enhancements

### Planned Features
1. AI-powered puzzle generation
2. A/B testing framework
3. Multi-language admin interface
4. Mobile admin app
5. Real-time collaboration
6. Automated quality checks

### Integration Points
- Slack notifications for errors
- Google Analytics integration
- Customer support tools
- Content moderation APIs

---

## Quick Reference Card

### Essential URLs
- Admin Dashboard: `/admin`
- Puzzle Editor: `/admin/puzzle-editor`
- Analytics: `/admin/analytics`
- Schedule: `/admin/schedule`
- Movie Search: `/admin/movies`

### Keyboard Shortcuts
- `Esc` - Close modals
- `Cmd/Ctrl + S` - Save draft (in editors)
- `Tab` - Navigate between fields

### Status Codes
- 🟢 Available
- 🔴 Recently Used
- 🟡 Coming Soon
- ⚫ Not Released
- 📝 Draft
- ✅ Published

---

Last Updated: January 2025
Version: 1.0.0