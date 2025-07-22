# Top Four Favorite Films Feature Setup

## Overview
This feature allows users to showcase their four favorite movies on their profile page with visual movie posters displayed in a 2x2 grid.

## Database Migration

To set up the feature, you need to run the SQL migration to create the `user_favorite_films` table:

1. Access your Supabase dashboard
2. Go to the SQL Editor
3. Run the migration script from `sql/005_create_user_favorite_films_table.sql`

## Features Implemented

### Backend
- **GET /api/user/favorites** - Fetch user's favorite films
- **POST /api/user/favorites** - Add a movie to favorites
- **PUT /api/user/favorites/:movieId** - Update position of a favorite
- **DELETE /api/user/favorites/:movieId** - Remove a movie from favorites
- **PUT /api/user/favorites/reorder** - Bulk reorder favorites for drag-and-drop

### Frontend Components
- **FavoriteFilmsSection** - Main component with drag-and-drop functionality
- **FavoriteMovieSlot** - Individual movie poster display with hover effects
- **MovieSearchModal** - Modal for searching and adding movies

### Key Features
1. **Visual Display**: 2x2 grid of movie posters on user profile
2. **Search Integration**: Uses existing TMDB search functionality
3. **Drag and Drop**: Reorder favorites by dragging movie posters
4. **Empty States**: Dotted placeholders for unfilled slots
5. **Hover Effects**: Shows movie title and remove button on hover
6. **Responsive Design**: Works on mobile and desktop
7. **Error Handling**: Graceful handling of API errors and edge cases

## Usage

1. Navigate to your profile page
2. In the "Favorite Films" section, click on any empty slot
3. Search for a movie using the search modal
4. Click the heart icon or movie poster to add it to your favorites
5. Drag and drop movies to reorder them
6. Hover over a movie and click the X to remove it

## Technical Details

### Database Schema
- Table: `user_favorite_films`
- Stores up to 4 favorites per user with position (1-4)
- Includes movie metadata (title, poster_path) for performance
- RLS policies ensure users can only manage their own favorites

### API Constraints
- Maximum 4 favorites per user
- No duplicate movies allowed
- Positions must be unique per user
- Automatic position assignment if not specified

### Frontend Implementation
- Optimistic updates for instant feedback
- Debounced drag operations
- Loading states and error handling
- Accessibility features (ARIA labels, keyboard navigation)