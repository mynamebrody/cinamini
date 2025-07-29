# CinaMini Admin Setup Guide

## Overview

The CinaMini admin system allows super administrators to:
- Create and manage movie puzzles for all games
- Search movies with status indicators (upcoming, recently used, available)
- View trending movies and their details
- Access Supabase Studio directly

## Setting Up the Super Admin User

### 1. Apply Database Migrations

First, run the database migrations to add the admin fields:

```bash
npm run db:reset
# or
npm run db:push
```

### 2. Create the Admin User

1. Start your local Supabase instance:
   ```bash
   npm run db:start
   ```

2. Create a new user account via the signup flow with email: `admin@cinamini.com`

3. The seed file will automatically grant super admin privileges to this email address

### 3. Manual Admin Setup (Alternative)

If you need to manually grant admin privileges to an existing user:

1. Open Supabase Studio:
   ```bash
   npm run db:studio
   ```

2. Navigate to the `cinamini_user_profiles` table

3. Find the user you want to make an admin

4. Set `is_super_admin` to `true`

## Admin Features

### Dashboard (`/admin`)
- Bento box layout with links to all admin tools
- Trending movies section with quick-look details
- Direct link to Supabase Studio

### Movie Search (`/admin/movies`)
- Search TMDB database for movies
- Status indicators:
  - Gray: Not yet released
  - Yellow: Coming soon (within 30 days)
  - Red: Recently used in puzzles (last 30 days)
  - Green: Available for use

### Puzzle Editors

#### Budget Bracket Editor (`/admin/budget-bracket`)
- Create/edit puzzles with 8 movie pairs
- Visual movie selection with poster preview
- Budget information displayed
- Schedule puzzles for specific dates

#### Retitled Editor (`/admin/retitled`)
- Manage foreign title puzzles
- Similar interface to Budget Bracket

#### Cast Climb Editor (`/admin/cast-climb`)
- Create cast-based movie puzzles

## Environment Variables

Make sure you have the following environment variables set:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
TMDB_API_KEY=your-tmdb-api-key
```

## Security

- Admin routes are protected by middleware
- Only users with `is_super_admin = true` can access `/admin/*` URLs
- Non-admin users are automatically redirected to the home page
- RLS policies ensure only admins can create/edit puzzles

## Puzzle Publishing

Puzzles have an `is_published` field:
- Draft puzzles are only visible to admins
- Published puzzles are visible to all authenticated users
- This allows admins to prepare puzzles in advance

## Database Schema Updates

The admin system adds:
- `is_super_admin` boolean field to `cinamini_user_profiles`
- `is_published` boolean field to all puzzle tables
- Updated RLS policies for admin access
- Indexes for efficient admin queries