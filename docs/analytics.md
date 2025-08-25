# Analytics Documentation

## Overview

The Cinamini Admin Panel Analytics system provides comprehensive insights into user behavior, game performance, and content engagement. This document outlines the analytics architecture, data sources, and maintenance procedures.

## Architecture

### Frontend Components

- **Location**: `/app/admin/analytics/page.tsx`
- **Key Features**:
  - Real-time data visualization using Recharts
  - Date range filtering (7, 30, 90 days)
  - Four main tabs: Engagement, Games, Movies, Retention

### API Endpoints

All analytics endpoints are located in `/app/api/admin/analytics/`:

1. **Overview** (`/overview/route.ts`)
   - Total players count
   - Daily/Monthly Active Users (DAU/MAU)
   - Average session duration
   - Total games played
   - Week-over-week growth

2. **Games** (`/games/route.ts`)
   - Per-game metrics (Retitled, Budget Bracket, Cast Climb)
   - Completion rates
   - Average solve times
   - Difficulty ratings
   - Perfect game counts

3. **Engagement** (`/engagement/route.ts`)
   - Daily active users over time
   - Game popularity distribution
   - User retention cohorts
   - Streak distribution

4. **Movies** (`/movies/route.ts`)
   - Most used movies across games
   - Genre popularity
   - Release year trends
   - Budget vs engagement correlation

5. **Test** (`/test/route.ts`)
   - Comprehensive analytics health check
   - Data integrity validation
   - Freshness monitoring

## Data Sources

### Primary Tables

1. **cinamini_user_profiles**
   - User registration data
   - Created timestamps for cohort analysis

2. **cinamini_user_stats**
   - Current and longest streaks
   - Last played dates
   - User engagement metrics

3. **Game-Specific Tables**
   - `retitled_guesses`: Retitled game attempts
   - `budget_bracket_games`: Budget Bracket game sessions
   - `cast_climb_guesses`: Cast Climb game attempts
   - `poster_pixels_guesses`: Poster Pixels game attempts
   - `poster_pixels_games`: Poster Pixels game sessions

4. **Puzzle Tables**
   - `retitled_puzzles`: Daily Retitled puzzles
   - `budget_bracket_puzzles`: Budget Bracket puzzle configurations
   - `cast_climb_puzzles`: Cast Climb puzzle data
   - `poster_pixels_puzzles`: Poster Pixels puzzle data with clarity levels

## Key Metrics Calculations

### Daily Active Users (DAU)
```typescript
// Combines unique users from all four games (including anonymous users)
const uniqueUsers = new Set([
  ...retitledUsers,
  ...budgetBracketUsers,
  ...castClimbUsers,
  ...posterPixelsUsers
]);
```

### Average Session Duration
- Calculated from actual game solve times
- Weighted average across all four games
- Bounded between 30 seconds and 10 minutes
- Includes anonymous user sessions

### Completion Rates
- **Retitled**: Correct guesses / Total guesses
- **Budget Bracket**: All submitted games are "complete"
- **Cast Climb**: Games where player eventually got correct answer
- **Poster Pixels**: Games where player guessed correctly within 5 attempts

### Retention Cohorts
- Tracks user activity at Day 1, 7, and 30
- Groups users by signup week (including anonymous sign-ups)
- Calculates percentage of cohort active on target days
- Tracks anonymous to authenticated user conversion rates

## Data Integrity Checks

The `/api/admin/analytics/test` endpoint performs:

1. **Database Connectivity**
   - Verifies Supabase connection
   - Checks table accessibility

2. **Data Integrity**
   - Orphaned records detection
   - Invalid value ranges
   - Data consistency checks

3. **Data Freshness**
   - Last activity timestamps
   - Alerts for stale data (>24h warning, >72h critical)

4. **Calculation Accuracy**
   - DAU calculation verification
   - Completion rate validation
   - Anomaly detection

## Common Issues and Solutions

### Issue: No Analytics Data Showing

**Causes**:
- Empty database tables
- Date range with no data
- API connection issues

**Solutions**:
1. Run the test endpoint: `/api/admin/analytics/test`
2. Check Supabase connection and credentials
3. Verify data exists in the selected date range

### Issue: Incorrect Metrics

**Causes**:
- Data integrity issues
- Calculation errors
- Timezone mismatches

**Solutions**:
1. Run data integrity checks
2. Verify calculation logic in API routes
3. Ensure consistent timezone usage (UTC)

### Issue: Slow Performance

**Causes**:
- Large date ranges
- Unoptimized queries
- Missing database indexes

**Solutions**:
1. Add appropriate database indexes
2. Implement query result caching
3. Optimize data aggregation queries

## Maintenance Procedures

### Regular Checks (Weekly)

1. Run analytics test endpoint
2. Verify data freshness
3. Check for anomalies in metrics
4. Review error logs

### Monthly Tasks

1. Analyze performance metrics
2. Archive old data if needed
3. Update genre mappings
4. Review and optimize queries

### Adding New Metrics

1. Update relevant API route
2. Add visualization to frontend
3. Update test endpoint
4. Document calculation method

## Anonymous User Analytics

The system now tracks both authenticated and anonymous users, providing comprehensive analytics across user types:

### Key Anonymous Metrics
- **Anonymous DAU**: Daily active anonymous users across all games
- **Conversion Rate**: Anonymous users who create accounts after gameplay
- **Anonymous Game Preferences**: Which games anonymous users prefer
- **Session Duration**: Average session time for anonymous vs authenticated users
- **Completion Rates**: Success rates comparing anonymous and authenticated users

### Anonymous User Detection
```typescript
// Anonymous users have is_anonymous = true in their user profile
const isAnonymous = user?.is_anonymous === true

// Analytics queries include anonymous users by default
SELECT COUNT(DISTINCT user_id) as total_users
FROM cinamini_user_profiles
WHERE user_id IN (
  SELECT DISTINCT user_id FROM poster_pixels_guesses
  WHERE created_at >= NOW() - INTERVAL '1 day'
)
```

### Conversion Tracking
- Track when anonymous users create full accounts
- Measure time from first play to account creation
- Analyze which games drive the most conversions
- Monitor conversion rates by game completion status

## Future Improvements

1. **Real-time Analytics**
   - WebSocket connections for live updates
   - Real-time user activity tracking

2. **Advanced Metrics**
   - User segmentation
   - Predictive analytics
   - A/B test results tracking

3. **Performance Optimizations**
   - Redis caching layer
   - Materialized views for common queries
   - Background job processing

4. **Enhanced Visualizations**
   - Heatmaps for activity patterns
   - Funnel analysis for game progression
   - Custom date range selection

## API Response Examples

### Overview Endpoint
```json
{
  "totalPlayers": 1250,
  "dailyActiveUsers": 423,
  "monthlyActiveUsers": 987,
  "avgSessionDuration": 245,
  "totalGamesPlayed": 15420,
  "weekOverWeekGrowth": 12.5
}
```

### Game Metrics
```json
{
  "gameId": "retitled",
  "displayName": "Retitled",
  "completionRate": 0.68,
  "avgSolveTime": 142,
  "avgDifficulty": 3.2,
  "totalPlays": 5240,
  "perfectGames": 1820
}
```

## Troubleshooting Queries

### Check User Activity
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(DISTINCT user_id) as unique_users
FROM retitled_guesses
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Verify Streak Data
```sql
SELECT 
  current_daily_streak,
  longest_daily_streak,
  COUNT(*) as user_count
FROM cinamini_user_stats
WHERE current_daily_streak > 0
GROUP BY current_daily_streak, longest_daily_streak
ORDER BY current_daily_streak DESC;
```

## Contact

For questions or issues with the analytics system:
- Check this documentation first
- Run the test endpoint for diagnostics
- Review error logs in Supabase dashboard
- Contact the development team with specific error details