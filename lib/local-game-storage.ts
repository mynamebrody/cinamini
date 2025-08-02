export interface LocalGameResult {
  gameId: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  result: any; // Game-specific result data
  timestamp: number;
}

export interface StreakInfo {
  current: number;
  longest: number;
  lastPlayedDate: string | null;
}

export interface LocalGameData {
  results: LocalGameResult[];
  stats: {
    totalGamesPlayed: number;
    streakData: StreakInfo;
    favoriteGame: string | null;
    firstPlayedDate: string | null;
  };
  lastCleanup: number;
  playCount: number; // For progressive nudging
}

class LocalGameStorage {
  private readonly STORAGE_KEY = 'cinamini-local-games';
  private readonly MAX_DAYS_TO_KEEP = 30;
  private readonly CLEANUP_INTERVAL_HOURS = 24;

  constructor() {
    // Clean old results on initialization
    this.cleanOldResultsIfNeeded();
  }

  private getStorageData(): LocalGameData {
    if (typeof window === 'undefined') {
      return this.getDefaultData();
    }

    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) {
        return this.getDefaultData();
      }
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading local storage:', error);
      return this.getDefaultData();
    }
  }

  private getDefaultData(): LocalGameData {
    return {
      results: [],
      stats: {
        totalGamesPlayed: 0,
        streakData: {
          current: 0,
          longest: 0,
          lastPlayedDate: null,
        },
        favoriteGame: null,
        firstPlayedDate: null,
      },
      lastCleanup: Date.now(),
      playCount: 0,
    };
  }

  private saveStorageData(data: LocalGameData): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving to local storage:', error);
    }
  }

  saveDailyResult(gameId: string, result: any): void {
    const data = this.getStorageData();
    const today = new Date().toISOString().split('T')[0];
    const timestamp = Date.now();

    // Check if already played today
    const existingIndex = data.results.findIndex(
      r => r.gameId === gameId && r.date === today
    );

    const gameResult: LocalGameResult = {
      gameId,
      date: today,
      completed: true,
      result,
      timestamp,
    };

    if (existingIndex >= 0) {
      // Update existing result
      data.results[existingIndex] = gameResult;
    } else {
      // Add new result
      data.results.push(gameResult);
      data.stats.totalGamesPlayed++;
      data.playCount++;

      // Update first played date
      if (!data.stats.firstPlayedDate) {
        data.stats.firstPlayedDate = today;
      }

      // Update streak
      this.updateStreak(data);

      // Update favorite game
      this.updateFavoriteGame(data);
    }

    this.saveStorageData(data);
  }

  getTodayResult(gameId: string): LocalGameResult | null {
    const data = this.getStorageData();
    const today = new Date().toISOString().split('T')[0];
    
    return data.results.find(
      r => r.gameId === gameId && r.date === today
    ) || null;
  }

  hasPlayedToday(gameId: string): boolean {
    return this.getTodayResult(gameId) !== null;
  }

  getAllResults(): LocalGameResult[] {
    const data = this.getStorageData();
    return data.results;
  }

  getGameResults(gameId: string): LocalGameResult[] {
    const data = this.getStorageData();
    return data.results.filter(r => r.gameId === gameId);
  }

  getStats(): LocalGameData['stats'] {
    const data = this.getStorageData();
    return data.stats;
  }

  getPlayCount(): number {
    const data = this.getStorageData();
    return data.playCount;
  }

  getTodaysGamesCount(): number {
    const data = this.getStorageData();
    const today = new Date().toISOString().split('T')[0];
    return data.results.filter(r => r.date === today).length;
  }

  getUniqueGameCount(): number {
    const data = this.getStorageData();
    const uniqueGames = new Set(data.results.map(r => r.gameId));
    return uniqueGames.size;
  }

  getDaysPlayed(): number {
    const data = this.getStorageData();
    const uniqueDates = new Set(data.results.map(r => r.date));
    return uniqueDates.size;
  }

  private updateStreak(data: LocalGameData): void {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    if (!data.stats.streakData.lastPlayedDate) {
      // First game ever
      data.stats.streakData.current = 1;
      data.stats.streakData.longest = 1;
      data.stats.streakData.lastPlayedDate = today;
    } else if (data.stats.streakData.lastPlayedDate === yesterday) {
      // Continuing streak
      data.stats.streakData.current++;
      if (data.stats.streakData.current > data.stats.streakData.longest) {
        data.stats.streakData.longest = data.stats.streakData.current;
      }
      data.stats.streakData.lastPlayedDate = today;
    } else if (data.stats.streakData.lastPlayedDate !== today) {
      // Streak broken
      data.stats.streakData.current = 1;
      data.stats.streakData.lastPlayedDate = today;
    }
  }

  private updateFavoriteGame(data: LocalGameData): void {
    const gameCounts = data.results.reduce((acc, result) => {
      acc[result.gameId] = (acc[result.gameId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    let maxCount = 0;
    let favoriteGame = null;

    for (const [gameId, count] of Object.entries(gameCounts)) {
      if (count > maxCount) {
        maxCount = count;
        favoriteGame = gameId;
      }
    }

    data.stats.favoriteGame = favoriteGame;
  }

  cleanOldResults(): void {
    const data = this.getStorageData();
    const cutoffDate = new Date(Date.now() - this.MAX_DAYS_TO_KEEP * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    data.results = data.results.filter(r => r.date >= cutoffDate);
    data.lastCleanup = Date.now();

    this.saveStorageData(data);
  }

  private cleanOldResultsIfNeeded(): void {
    const data = this.getStorageData();
    const hoursSinceLastCleanup = (Date.now() - data.lastCleanup) / (1000 * 60 * 60);

    if (hoursSinceLastCleanup >= this.CLEANUP_INTERVAL_HOURS) {
      this.cleanOldResults();
    }
  }

  clearAllData(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.STORAGE_KEY);
  }

  // For data migration when user signs up
  exportData(): LocalGameData {
    return this.getStorageData();
  }

  // Get recent results for migration (last 7 days)
  getRecentResults(days: number = 7): LocalGameResult[] {
    const data = this.getStorageData();
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    return data.results.filter(r => r.date >= cutoffDate);
  }
}

// Export singleton instance
export const localGameStorage = new LocalGameStorage();