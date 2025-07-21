# TMDB Movie Search Integration

This document describes the implementation of The Movie Database (TMDB) API integration for movie search functionality in the Cinamini gaming site.

## Overview

The TMDB integration allows authenticated users to search for movies using a clean, responsive interface. All API requests are securely routed through the backend to protect the API key.

## Features

- **Secure API Integration**: TMDB API key is stored securely on the server
- **User Authentication**: Only logged-in users can access movie search
- **Real-time Search**: Search triggered by Enter key press or button click
- **Responsive Design**: Movie cards display beautifully on all screen sizes
- **Loading States**: Skeleton loaders during search requests
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Movie Information**: Displays poster, title, release year, rating, and overview

## Setup Instructions

### 1. Get TMDB API Key

1. Create an account at [The Movie Database](https://www.themoviedb.org/)
2. Go to [API Settings](https://www.themoviedb.org/settings/api)
3. Request an API key (it's free)
4. Copy your API key

### 2. Environment Configuration

Add your TMDB API key to your environment file:

```bash
# .env.local
TMDB_API_KEY=your_actual_tmdb_api_key_here
```

Make sure your Supabase configuration is also set up:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Install Dependencies

The feature uses these additional dependencies:

```bash
npm install @tailwindcss/line-clamp --save-dev
```

## Architecture

### Backend API Endpoint

**Endpoint**: `GET /api/movies/search`

**Parameters**:
- `q` (required): Search query string
- `page` (optional): Page number for pagination (default: 1)

**Authentication**: Requires valid Supabase session

**Response Format**:
```typescript
{
  results: MovieSearchResult[]
  totalResults: number
  page: number
  totalPages: number
}
```

### Frontend Components

#### MovieSearch
Main container component that manages search state and API calls.

#### MovieSearchBar
Search input component with:
- Debounced input handling
- Enter key support
- Loading state management
- Search validation

#### MovieSearchResults
Results display component featuring:
- Responsive grid layout
- Loading skeletons
- Error states
- No results messaging

### Security Features

- **API Key Protection**: TMDB API key never exposed to frontend
- **Authentication Required**: All requests verified through Supabase
- **Input Validation**: Query sanitization and length limits
- **Rate Limiting Ready**: Structure supports rate limiting implementation
- **Error Handling**: Graceful degradation on API failures

## Usage

1. **User Login**: Users must be authenticated to access search
2. **Search Movies**: Enter movie title and press Enter or click Search
3. **View Results**: Browse movies in responsive grid layout
4. **Movie Details**: Each card shows poster, title, year, rating, and overview

## File Structure

```
app/
├── api/movies/search/route.ts      # Backend API endpoint
├── page.tsx                        # Updated main page with search
components/
├── movie-search.tsx                # Main search component
├── movie-search-bar.tsx           # Search input component
└── movie-search-results.tsx       # Results display component
lib/
└── types/tmdb.ts                  # TypeScript type definitions
```

## Error Handling

The integration handles these error scenarios:

- **Authentication Errors**: Redirects to login
- **API Configuration**: Missing TMDB API key
- **Network Issues**: Timeout and connection errors
- **Invalid Input**: Query validation and sanitization
- **API Rate Limits**: Graceful error messages
- **No Results**: User-friendly empty state

## Performance Considerations

- **Image Optimization**: Lazy loading for movie posters
- **Request Timeout**: 10-second timeout prevents hanging
- **Responsive Images**: Appropriate image sizes from TMDB
- **Skeleton Loading**: Smooth loading experience

## Future Enhancements

Potential improvements for this feature:

1. **Caching**: Implement Redis/memory caching for frequent searches
2. **Pagination**: Add pagination controls for large result sets
3. **Favorites**: Allow users to save favorite movies
4. **Advanced Filters**: Genre, year, rating filters
5. **Movie Details**: Detailed view with cast, crew, trailers
6. **Watchlists**: Personal movie watchlist functionality

## Troubleshooting

### Common Issues

1. **"TMDB API key is not configured"**
   - Ensure `TMDB_API_KEY` is set in your environment file
   - Restart your development server after adding the key

2. **"Authentication required"**
   - User must be logged in to search
   - Check Supabase authentication setup

3. **Search returns no results**
   - Verify TMDB API key is valid
   - Check network connectivity
   - Try different search terms

4. **Styling issues with movie cards**
   - Ensure `@tailwindcss/line-clamp` plugin is installed
   - Run `npm run build` to rebuild Tailwind CSS

## Support

For issues related to:
- **TMDB API**: Check [TMDB API Documentation](https://developer.themoviedb.org/docs)
- **Supabase**: Check [Supabase Documentation](https://supabase.com/docs)
- **UI Components**: Check [shadcn/ui Documentation](https://ui.shadcn.com/)