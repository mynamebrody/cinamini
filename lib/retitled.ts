/**
 * Retitled Game Logic and Utilities
 * 
 * This module implements the Retitled game (localized movie title guessing) 
 * using the unified seeding system and movie pool manager for deterministic 
 * daily puzzle generation with trending movie integration.
 */

import { 
  generateDailySeed, 
  SeededRandom, 
  type SeedableGameItem 
} from './game-seeding';
import { createClient } from '@/lib/supabase/server';
import { getMovieTranslations, type TMDBMovie } from './tmdb';

// ============================================================================
// CORE INTERFACES AND TYPES
// ============================================================================

export interface RetitledMovie extends SeedableGameItem {
  id: number;
  tmdb_id: number;
  title: string;
  original_title: string;
  release_date: string;
  poster_path: string | null;
  popularity: number;
  vote_count: number;
  adult: boolean;
  genre_ids: number[];
  original_language: string;
  is_trending?: boolean;
}

export interface LocalizedTitle {
  title: string;
  country_code: string;
  country_name: string;
  iso_639_1: string; // Language code
  english_name: string; // Language name in English
  name: string; // Language name in native language
}

export interface RetitledPuzzle {
  id: string;
  puzzle_date: string;
  seed_value: string;
  film_id: number;
  film_title: string;
  localized_title: string;
  country_code: string;
  country_name: string;
  distractor_ids: number[];
  difficulty_level: number;
  translation_note?: string;
}

export interface RetitledGameChoice {
  guess_film_id: number;
  is_correct: boolean;
  solve_time_ms: number;
  attempt_number: number;
}

export interface RetitledGameResult {
  puzzle_id: string;
  user_id: string;
  choice: RetitledGameChoice;
  completed_at: Date;
}

export interface RetitledStats {
  user_id: string;
  games_played: number;
  games_correct: number;
  current_streak: number;
  longest_streak: number;
  average_solve_time_ms: number;
  countries_guessed: string[]; // Array of country codes
  last_played_date: string | null;
}

// ============================================================================
// COUNTRY AND LOCALIZATION CONFIGURATION
// ============================================================================

/**
 * Supported countries for localized titles with their display info
 */
export const SUPPORTED_COUNTRIES = {
  'FR': { name: 'France', flag: '🇫🇷', priority: 1 },
  'ES': { name: 'Spain', flag: '🇪🇸', priority: 1 },
  'DE': { name: 'Germany', flag: '🇩🇪', priority: 1 },
  'IT': { name: 'Italy', flag: '🇮🇹', priority: 1 },
  'JP': { name: 'Japan', flag: '🇯🇵', priority: 2 },
  'KR': { name: 'South Korea', flag: '🇰🇷', priority: 2 },
  'CN': { name: 'China', flag: '🇨🇳', priority: 2 },
  'BR': { name: 'Brazil', flag: '🇧🇷', priority: 2 },
  'RU': { name: 'Russia', flag: '🇷🇺', priority: 3 },
  'IN': { name: 'India', flag: '🇮🇳', priority: 3 },
  'MX': { name: 'Mexico', flag: '🇲🇽', priority: 2 },
  'AR': { name: 'Argentina', flag: '🇦🇷', priority: 3 },
  'NL': { name: 'Netherlands', flag: '🇳🇱', priority: 2 },
  'SE': { name: 'Sweden', flag: '🇸🇪', priority: 3 },
  'NO': { name: 'Norway', flag: '🇳🇴', priority: 3 },
  'FI': { name: 'Finland', flag: '🇫🇮', priority: 3 },
  'DK': { name: 'Denmark', flag: '🇩🇰', priority: 3 },
  'PL': { name: 'Poland', flag: '🇵🇱', priority: 3 },
  'TR': { name: 'Turkey', flag: '🇹🇷', priority: 3 }
} as const;

export type CountryCode = keyof typeof SUPPORTED_COUNTRIES;

/**
 * Difficulty levels based on various factors
 */
export const DIFFICULTY_LEVELS = {
  EASY: 1,    // Popular movies, common countries (FR, ES, DE, IT)
  MEDIUM: 2,  // Moderately popular, some Asian countries
  HARD: 3,    // Less popular movies, more obscure countries
  EXPERT: 4   // Very specific or niche titles
} as const;

// ============================================================================
// CORE GAME LOGIC FUNCTIONS
// ============================================================================

/**
 * Generate a Retitled specific daily seed
 */
export function generateRetitledSeed(date: Date): string {
  return generateDailySeed(date, { 
    gameId: 'retitled',
    gameEntropy: 'localized-titles' 
  });
}

// Removed: getRetitledMovies (over-engineered movie pool system)

/**
 * Validate that a movie meets Retitled requirements
 */
export function validateRetitledMovie(movie: any): movie is RetitledMovie {
  return (
    typeof movie.tmdb_id === 'number' &&
    typeof movie.title === 'string' &&
    typeof movie.popularity === 'number' &&
    movie.popularity >= 20 &&
    (movie.vote_count || 0) >= 50 &&
    !movie.adult
  );
}

/**
 * Fetch localized titles for a movie from TMDB
 */
export async function getLocalizedTitles(movieId: number): Promise<LocalizedTitle[]> {
  try {
    const translations = await getMovieTranslations(movieId);
    
    if (!translations || !translations.translations) {
      return [];
    }

    const localizedTitles: LocalizedTitle[] = [];
    
    for (const translation of translations.translations) {
      const countryCode = translation.iso_3166_1;
      
      // Only include supported countries
      if (!(countryCode in SUPPORTED_COUNTRIES)) {
        continue;
      }
      
      // Skip if no localized title or same as original
      const localizedTitle = translation.data?.title;
      if (!localizedTitle || localizedTitle.trim() === '') {
        continue;
      }
      
      localizedTitles.push({
        title: localizedTitle,
        country_code: countryCode,
        country_name: SUPPORTED_COUNTRIES[countryCode as CountryCode].name,
        iso_639_1: translation.iso_639_1 || 'en',
        english_name: translation.english_name || 'English',
        name: translation.name || translation.english_name || 'English'
      });
    }
    
    return localizedTitles;
  } catch (error) {
    console.error(`Error fetching localized titles for movie ${movieId}:`, error);
    return [];
  }
}

/**
 * Generate distractors (wrong answer choices) for a puzzle
 */
export async function generateDistractors(
  correctMovie: RetitledMovie,
  allMovies: RetitledMovie[],
  seed: string,
  count: number = 4
): Promise<RetitledMovie[]> {
  const rng = new SeededRandom(seed + '_distractors');
  
  // Filter potential distractors
  const candidates = allMovies.filter(movie => 
    movie.tmdb_id !== correctMovie.tmdb_id &&
    // Similar era (within 10 years)
    Math.abs(
      new Date(movie.release_date).getFullYear() - 
      new Date(correctMovie.release_date).getFullYear()
    ) <= 10 &&
    // Similar popularity range to make it challenging
    Math.abs(Math.log(movie.popularity) - Math.log(correctMovie.popularity)) <= 1.5
  );
  
  if (candidates.length < count) {
    // Fallback: use any movies except the correct one
    const fallbackCandidates = allMovies.filter(movie => 
      movie.tmdb_id !== correctMovie.tmdb_id
    );
    return rng.sample(fallbackCandidates, Math.min(count, fallbackCandidates.length));
  }
  
  return rng.sample(candidates, count);
}

/**
 * Calculate difficulty level for a movie/country combination
 */
export function calculateDifficultyLevel(
  movie: RetitledMovie,
  countryCode: CountryCode,
  localizedTitle: string
): number {
  let difficulty = DIFFICULTY_LEVELS.EASY;
  
  // Country priority affects difficulty
  const countryPriority = SUPPORTED_COUNTRIES[countryCode].priority;
  difficulty += countryPriority - 1;
  
  // Lower popularity = higher difficulty
  if (movie.popularity < 50) {
    difficulty += 2;
  } else if (movie.popularity < 100) {
    difficulty += 1;
  }
  
  // Older movies are generally harder
  const releaseYear = new Date(movie.release_date).getFullYear();
  const currentYear = new Date().getFullYear();
  const age = currentYear - releaseYear;
  
  if (age > 30) {
    difficulty += 2;
  } else if (age > 15) {
    difficulty += 1;
  }
  
  // Very different titles are harder
  const titleSimilarity = calculateTitleSimilarity(movie.title, localizedTitle);
  if (titleSimilarity < 0.3) {
    difficulty += 1;
  }
  
  return Math.min(DIFFICULTY_LEVELS.EXPERT, Math.max(DIFFICULTY_LEVELS.EASY, difficulty));
}

/**
 * Calculate similarity between two titles (0-1, where 1 is identical)
 */
function calculateTitleSimilarity(title1: string, title2: string): number {
  const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
  const norm1 = normalize(title1);
  const norm2 = normalize(title2);
  
  if (norm1 === norm2) return 1;
  if (norm1.length === 0 || norm2.length === 0) return 0;
  
  // Simple Levenshtein distance-based similarity
  const maxLength = Math.max(norm1.length, norm2.length);
  const distance = levenshteinDistance(norm1, norm2);
  return 1 - (distance / maxLength);
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator  // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Generate a complete daily puzzle using the movie pool manager
 */
export async function generateDailyPuzzle(date: Date): Promise<RetitledPuzzle | null> {
  const seed = generateRetitledSeed(date);
  const rng = new SeededRandom(seed);
  
  try {
    // Get movie pool with trending integration
    const poolResult = await getRetitledMovies({
      seedConfig: {
        gameId: 'retitled',
        gameEntropy: 'localized-titles'
      },
      strategy: {
        name: 'balanced',
        trendingWeight: 3.0,
        minTrendingPercent: 20,
        maxTrendingPercent: 50,
        trendingWindow: 'day'
      },
      filters: {
        minPopularity: 20,
        minVoteCount: 50,
        excludeAdult: true,
        customFilter: (movie) => {
          // Prefer movies that are likely to have good translations
          return movie.original_language !== 'en' || movie.popularity > 100;
        }
      }
    });

    if (poolResult.movies.length === 0) {
      throw new Error('No suitable movies found in pool');
    }

    // Try to find a movie with good localized titles
    let attempts = 0;
    const maxAttempts = 20;
    
    while (attempts < maxAttempts) {
      const candidateMovie = rng.choice(poolResult.movies);
      
      // Get localized titles for this movie
      const localizedTitles = await getLocalizedTitles(candidateMovie.tmdb_id);
      
      if (localizedTitles.length === 0) {
        attempts++;
        continue;
      }
      
      // Filter titles that are different enough from original
      const validTitles = localizedTitles.filter(lt => 
        calculateTitleSimilarity(candidateMovie.title, lt.title) < 0.8 &&
        lt.title.length > 3
      );
      
      if (validTitles.length === 0) {
        attempts++;
        continue;
      }
      
      // Select a localized title based on country priority
      const selectedTitle = selectLocalizedTitle(validTitles, rng);
      
      // Generate distractors
      const distractors = await generateDistractors(
        candidateMovie, 
        poolResult.movies, 
        seed,
        4
      );
      
      if (distractors.length < 3) {
        attempts++;
        continue;
      }
      
      // Calculate difficulty
      const difficulty = calculateDifficultyLevel(
        candidateMovie,
        selectedTitle.country_code as CountryCode,
        selectedTitle.title
      );
      
      // Create puzzle
      return {
        id: `retitled_${date.toISOString().split('T')[0]}`,
        puzzle_date: date.toISOString().split('T')[0],
        seed_value: seed,
        film_id: candidateMovie.tmdb_id,
        film_title: candidateMovie.title,
        localized_title: selectedTitle.title,
        country_code: selectedTitle.country_code,
        country_name: selectedTitle.country_name,
        distractor_ids: distractors.map(d => d.tmdb_id),
        difficulty_level: difficulty,
        translation_note: generateTranslationNote(candidateMovie, selectedTitle)
      };
    }
    
    throw new Error(`Could not generate valid puzzle after ${maxAttempts} attempts`);
    
  } catch (error) {
    console.error('Error generating daily Retitled puzzle:', error);
    return generateFallbackPuzzle(date);
  }
}

/**
 * Select the best localized title from available options
 */
function selectLocalizedTitle(titles: LocalizedTitle[], rng: SeededRandom): LocalizedTitle {
  // Sort by country priority (lower number = higher priority)
  const sortedTitles = titles.sort((a, b) => {
    const priorityA = SUPPORTED_COUNTRIES[a.country_code as CountryCode]?.priority || 5;
    const priorityB = SUPPORTED_COUNTRIES[b.country_code as CountryCode]?.priority || 5;
    return priorityA - priorityB;
  });
  
  // Use weighted selection favoring higher priority countries
  const weights = sortedTitles.map((_, index) => Math.max(1, 5 - index));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  
  let randomValue = rng.next() * totalWeight;
  
  for (let i = 0; i < sortedTitles.length; i++) {
    randomValue -= weights[i];
    if (randomValue <= 0) {
      return sortedTitles[i];
    }
  }
  
  // Fallback to first option
  return sortedTitles[0];
}

/**
 * Generate a helpful translation note for the puzzle
 */
function generateTranslationNote(movie: RetitledMovie, localizedTitle: LocalizedTitle): string {
  const countryInfo = SUPPORTED_COUNTRIES[localizedTitle.country_code as CountryCode];
  const similarity = calculateTitleSimilarity(movie.title, localizedTitle.title);
  
  if (similarity > 0.7) {
    return `The ${countryInfo.name} title is very similar to the English title.`;
  } else if (similarity > 0.4) {
    return `The ${countryInfo.name} title has some similarities to the English title.`;
  } else {
    return `The ${countryInfo.name} title takes a different approach to the English title.`;
  }
}

/**
 * Generate a fallback puzzle when primary generation fails
 */
function generateFallbackPuzzle(date: Date): RetitledPuzzle {
  // Use hardcoded popular movies with known translations
  const fallbackMovies = [
    {
      tmdb_id: 562,
      title: "Die Hard",
      localized_title: "Piège de Cristal",
      country_code: "FR",
      country_name: "France",
      distractors: [679, 78, 280, 218]
    },
    {
      tmdb_id: 155,
      title: "The Dark Knight", 
      localized_title: "El Caballero Oscuro",
      country_code: "ES",
      country_name: "Spain",
      distractors: [562, 679, 78, 280]
    },
    {
      tmdb_id: 13,
      title: "Forrest Gump",
      localized_title: "Lauf, Forrest, lauf!",
      country_code: "DE", 
      country_name: "Germany",
      distractors: [562, 155, 679, 78]
    }
  ];
  
  const seed = generateRetitledSeed(date);
  const rng = new SeededRandom(seed);
  const selected = rng.choice(fallbackMovies);
  
  return {
    id: `retitled_fallback_${date.toISOString().split('T')[0]}`,
    puzzle_date: date.toISOString().split('T')[0],
    seed_value: seed,
    film_id: selected.tmdb_id,
    film_title: selected.title,
    localized_title: selected.localized_title,
    country_code: selected.country_code,
    country_name: selected.country_name,
    distractor_ids: selected.distractors,
    difficulty_level: DIFFICULTY_LEVELS.EASY,
    translation_note: `Fallback puzzle: ${selected.country_name} translation`
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a user has already played today's puzzle
 */
export function hasPlayedToday(lastPlayedDate: string | null): boolean {
  if (!lastPlayedDate) return false;
  
  const today = new Date().toISOString().split('T')[0];
  return lastPlayedDate === today;
}

/**
 * Generate share result emoji pattern
 */
export function generateSharePattern(isCorrect: boolean, solveTimeMs: number): string {
  const timeBonus = solveTimeMs < 10000 ? '⚡' : solveTimeMs < 30000 ? '🔥' : '';
  return isCorrect ? `🟩${timeBonus}` : '🟥';
}

/**
 * Format solve time for display
 */
export function formatSolveTime(solveTimeMs: number): string {
  const seconds = Math.round(solveTimeMs / 1000);
  
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Get country flag emoji
 */
export function getCountryFlag(countryCode: string): string {
  return SUPPORTED_COUNTRIES[countryCode as CountryCode]?.flag || '🏳️';
}

/**
 * Get country name
 */
export function getCountryName(countryCode: string): string {
  return SUPPORTED_COUNTRIES[countryCode as CountryCode]?.name || 'Unknown';
}

/**
 * Validate puzzle data
 */
export function validatePuzzleData(puzzle: any): puzzle is RetitledPuzzle {
  return (
    typeof puzzle.film_id === 'number' &&
    typeof puzzle.film_title === 'string' &&
    typeof puzzle.localized_title === 'string' &&
    typeof puzzle.country_code === 'string' &&
    puzzle.country_code in SUPPORTED_COUNTRIES &&
    Array.isArray(puzzle.distractor_ids) &&
    puzzle.distractor_ids.length >= 3
  );
}

// Re-export seeding functions for convenience
export { generateDailySeed, SeededRandom } from './game-seeding';