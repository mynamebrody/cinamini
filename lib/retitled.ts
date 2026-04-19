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
import { getMovieTranslations, getMovieAlternativeTitles, type TMDBMovie } from './tmdb';
import { getBlendedMoviePool } from './tmdb-trending';

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
 * Map country codes to their primary languages
 */
const COUNTRY_LANGUAGES: Record<string, { iso_639_1: string; english_name: string; native_name: string }> = {
  'FR': { iso_639_1: 'fr', english_name: 'French', native_name: 'Français' },
  'ES': { iso_639_1: 'es', english_name: 'Spanish', native_name: 'Español' },
  'DE': { iso_639_1: 'de', english_name: 'German', native_name: 'Deutsch' },
  'IT': { iso_639_1: 'it', english_name: 'Italian', native_name: 'Italiano' },
  'JP': { iso_639_1: 'ja', english_name: 'Japanese', native_name: '日本語' },
  'KR': { iso_639_1: 'ko', english_name: 'Korean', native_name: '한국어' },
  'CN': { iso_639_1: 'zh', english_name: 'Chinese', native_name: '中文' },
  'BR': { iso_639_1: 'pt', english_name: 'Portuguese', native_name: 'Português' },
  'RU': { iso_639_1: 'ru', english_name: 'Russian', native_name: 'Русский' },
  'IN': { iso_639_1: 'hi', english_name: 'Hindi', native_name: 'हिन्दी' },
  'MX': { iso_639_1: 'es', english_name: 'Spanish', native_name: 'Español' },
  'AR': { iso_639_1: 'es', english_name: 'Spanish', native_name: 'Español' },
  'NL': { iso_639_1: 'nl', english_name: 'Dutch', native_name: 'Nederlands' },
  'SE': { iso_639_1: 'sv', english_name: 'Swedish', native_name: 'Svenska' },
  'NO': { iso_639_1: 'no', english_name: 'Norwegian', native_name: 'Norsk' },
  'FI': { iso_639_1: 'fi', english_name: 'Finnish', native_name: 'Suomi' },
  'DK': { iso_639_1: 'da', english_name: 'Danish', native_name: 'Dansk' },
  'PL': { iso_639_1: 'pl', english_name: 'Polish', native_name: 'Polski' },
  'TR': { iso_639_1: 'tr', english_name: 'Turkish', native_name: 'Türkçe' }
};

/**
 * Helper functions for country language mapping
 */
function getCountryLanguage(countryCode: string): string {
  return COUNTRY_LANGUAGES[countryCode]?.iso_639_1 || 'en';
}

function getCountryLanguageEnglish(countryCode: string): string {
  return COUNTRY_LANGUAGES[countryCode]?.english_name || 'English';
}

function getCountryLanguageNative(countryCode: string): string {
  return COUNTRY_LANGUAGES[countryCode]?.native_name || 'English';
}

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

/**
 * Configuration for movie pool selection
 */
export interface MoviePoolConfig {
  seedConfig: {
    gameId: string
    gameEntropy: string
  }
  strategy: {
    name: 'balanced' | 'trending-heavy' | 'classic-heavy'
    trendingWeight: number
    minTrendingPercent: number
    maxTrendingPercent: number
    trendingWindow: 'day' | 'week'
  }
  filters: {
    minPopularity: number
    minVoteCount: number
    excludeAdult: boolean
    customFilter?: (movie: TMDBMovie) => boolean
  }
}

/**
 * Result from movie pool selection
 */
export interface MoviePoolResult {
  movies: RetitledMovie[]
  trendingCount: number
  classicCount: number
  totalCount: number
}

/**
 * Get movies for Retitled game with trending integration
 */
export async function getRetitledMovies(config: MoviePoolConfig): Promise<MoviePoolResult> {
  try {
    // Get blended movie pool with trending integration
    const blendedMovies = await getBlendedMoviePool(
      config.strategy.trendingWeight,
      60 // Minimum pool size
    )

    // Filter movies based on configuration
    const filteredMovies = blendedMovies.filter(movie => {
      // Basic filters
      if (movie.adult && config.filters.excludeAdult) return false
      if (movie.popularity < config.filters.minPopularity) return false
      if (movie.vote_count < config.filters.minVoteCount) return false

      // Custom filter if provided
      if (config.filters.customFilter && !config.filters.customFilter(movie)) {
        return false
      }

      return true
    })

    // Convert TMDBMovie to RetitledMovie format
    const retitledMovies: RetitledMovie[] = filteredMovies.map(movie => ({
      id: movie.id,
      tmdb_id: movie.id,
      title: movie.title,
      original_title: movie.original_title,
      release_date: movie.release_date,
      poster_path: movie.poster_path,
      popularity: movie.popularity,
      vote_count: movie.vote_count,
      adult: movie.adult,
      genre_ids: movie.genre_ids,
      original_language: movie.original_language,
      is_trending: (movie as any).is_trending || false,
      // SeedableGameItem properties
      seedValue: movie.id.toString(),
      gameRelevanceScore: movie.popularity / 100 // Normalize popularity as relevance
    }))

    // Count trending vs classic movies
    const trendingCount = retitledMovies.filter(m => m.is_trending).length
    const classicCount = retitledMovies.length - trendingCount

    console.log(`Movie pool created: ${trendingCount} trending + ${classicCount} classic = ${retitledMovies.length} total`)

    return {
      movies: retitledMovies,
      trendingCount,
      classicCount,
      totalCount: retitledMovies.length
    }

  } catch (error) {
    console.error('Error in getRetitledMovies:', error)
    
    // Fallback to hardcoded movies if everything fails
    const fallbackMovies: RetitledMovie[] = [
      {
        id: 562,
        tmdb_id: 562,
        title: "Die Hard",
        original_title: "Die Hard",
        release_date: "1988-07-22",
        poster_path: "/yFihWxQcmqcaBR31QM6Y8gT6aYV.jpg",
        popularity: 45.0,
        vote_count: 9500,
        adult: false,
        genre_ids: [28, 53],
        original_language: "en",
        is_trending: false,
        seedValue: "562",
        gameRelevanceScore: 0.45
      }
    ]

    return {
      movies: fallbackMovies,
      trendingCount: 0,
      classicCount: 1,
      totalCount: 1
    }
  }
}

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
 * Fetch localized titles for a movie from TMDB using both alternative titles and translations
 */
export async function getLocalizedTitles(movieId: number): Promise<LocalizedTitle[]> {
  try {
    // Try alternative titles first (more accurate)
    const alternativeTitles = await getMovieAlternativeTitles(movieId);
    const localizedTitles: LocalizedTitle[] = [];
    
    if (alternativeTitles && alternativeTitles.titles) {
      for (const altTitle of alternativeTitles.titles) {
        const countryCode = altTitle.iso_3166_1;
        
        // Only include supported countries
        if (!(countryCode in SUPPORTED_COUNTRIES)) {
          continue;
        }
        
        // Skip if no title or same as original
        if (!altTitle.title || altTitle.title.trim() === '') {
          continue;
        }
        
        localizedTitles.push({
          title: altTitle.title,
          country_code: countryCode,
          country_name: SUPPORTED_COUNTRIES[countryCode as CountryCode].name,
          iso_639_1: getCountryLanguage(countryCode),
          english_name: getCountryLanguageEnglish(countryCode),
          name: getCountryLanguageNative(countryCode)
        });
      }
    }
    
    // If we don't have enough alternative titles, supplement with translations
    if (localizedTitles.length < 3) {
      const translations = await getMovieTranslations(movieId);
      
      if (translations && translations.translations) {
        for (const translation of translations.translations) {
          const countryCode = translation.iso_3166_1;
          
          // Only include supported countries
          if (!(countryCode in SUPPORTED_COUNTRIES)) {
            continue;
          }
          
          // Skip if already have this country from alternative titles
          if (localizedTitles.some(lt => lt.country_code === countryCode)) {
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
      }
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
export function calculateTitleSimilarity(title1: string, title2: string): number {
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