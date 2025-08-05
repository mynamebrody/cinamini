'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, GamepadIcon, Clock, TrendingUp, Calendar, Award, Film, DollarSign, Image } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter
} from 'recharts';
import { format, subDays } from 'date-fns';

interface OverviewStats {
  totalPlayers: number;
  dailyActiveUsers: number;
  avgSessionDuration: number;
  totalGamesPlayed: number;
  weekOverWeekGrowth: number;
  monthlyActiveUsers: number;
}

interface GameMetrics {
  gameId: string;
  displayName: string;
  completionRate: number;
  avgSolveTime: number;
  avgDifficulty: number;
  totalPlays: number;
  perfectGames: number;
  popularPuzzles: Array<{
    date: string;
    plays: number;
    title: string;
  }>;
}

interface EngagementData {
  dailyActiveUsers: Array<{
    date: string;
    users: number;
    newUsers: number;
  }>;
  gamePopularity: Array<{
    game: string;
    plays: number;
    percentage: number;
  }>;
  retentionCohorts: Array<{
    cohort: string;
    day1: number;
    day7: number;
    day30: number;
  }>;
  streakDistribution: Array<{
    streakLength: string;
    users: number;
  }>;
}

interface MovieAnalytics {
  mostUsedMovies: Array<{
    title: string;
    tmdbId: number;
    usageCount: number;
    avgEngagement: number;
  }>;
  genrePopularity: Array<{
    genre: string;
    count: number;
  }>;
  releaseYearTrends: Array<{
    decade: string;
    count: number;
    avgEngagement: number;
  }>;
  budgetEngagement: Array<{
    budget: number;
    engagement: number;
    title: string;
  }>;
}

interface PosterPixelsAnalytics {
  overview: {
    totalGames: number;
    completedGames: number;
    wonGames: number;
    completionRate: number;
    winRate: number;
    avgSolveTime: number;
    avgClarityLevel: number;
    avgDifficulty: number;
    perfectGames: number;
  };
  clarityDistribution: Array<{
    level: string;
    count: number;
  }>;
  dailyStats: Array<{
    date: string;
    totalGames: number;
    completedGames: number;
    wonGames: number;
  }>;
  topPlayers: Array<{
    userId: string;
    gamesPlayed: number;
    gamesWon: number;
    winRate: string;
    avgTime: string;
    bestTime: string;
  }>;
  popularMovies: Array<{
    title: string;
    count: number;
  }>;
}

const COLORS = ['#6c0311', '#2b725e', '#b28c49', '#4A90E2', '#E94B3C', '#6B5B95'];

export default function AnalyticsPage() {
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [gameMetrics, setGameMetrics] = useState<GameMetrics[]>([]);
  const [engagementData, setEngagementData] = useState<EngagementData | null>(null);
  const [movieAnalytics, setMovieAnalytics] = useState<MovieAnalytics | null>(null);
  const [posterPixelsAnalytics, setPosterPixelsAnalytics] = useState<PosterPixelsAnalytics | null>(null);
  const [selectedGame, setSelectedGame] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const [overview, games, engagement, movies, posterPixels] = await Promise.all([
        fetch(`/api/admin/analytics/overview?range=${dateRange}`).then(res => res.json()),
        fetch(`/api/admin/analytics/games?range=${dateRange}`).then(res => res.json()),
        fetch(`/api/admin/analytics/engagement?range=${dateRange}`).then(res => res.json()),
        fetch(`/api/admin/analytics/movies?range=${dateRange}`).then(res => res.json()),
        fetch(`/api/admin/analytics/poster-pixels?range=${dateRange}`).then(res => res.json())
      ]);

      setOverviewStats(overview);
      setGameMetrics(games);
      setEngagementData(engagement);
      setMovieAnalytics(movies);
      setPosterPixelsAnalytics(posterPixels);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !overviewStats || !engagementData || !movieAnalytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">{error || 'Failed to load analytics'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Players</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(overviewStats.totalPlayers)}</div>
            <p className="text-xs text-muted-foreground">
              {overviewStats.weekOverWeekGrowth > 0 ? '+' : ''}{overviewStats.weekOverWeekGrowth.toFixed(1)}% from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Active Users</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(overviewStats.dailyActiveUsers)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(overviewStats.monthlyActiveUsers)} monthly active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Session</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(overviewStats.avgSessionDuration)}</div>
            <p className="text-xs text-muted-foreground">Per user per day</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Games</CardTitle>
            <GamepadIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(overviewStats.totalGamesPlayed)}</div>
            <p className="text-xs text-muted-foreground">Across all game types</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="engagement" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="games">Games</TabsTrigger>
          <TabsTrigger value="movies">Movies</TabsTrigger>
          <TabsTrigger value="retention">Retention</TabsTrigger>
          <TabsTrigger value="poster-pixels">Poster Pixels</TabsTrigger>
        </TabsList>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Daily Active Users</CardTitle>
                <CardDescription>User activity over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height="300">
                  <AreaChart data={engagementData.dailyActiveUsers}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => format(new Date(date), 'MMM d')}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(date) => format(new Date(date), 'MMM d, yyyy')}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="users" 
                      stackId="1"
                      stroke="#6c0311" 
                      fill="#6c0311" 
                      name="Active Users"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="newUsers" 
                      stackId="1"
                      stroke="#2b725e" 
                      fill="#2b725e" 
                      name="New Users"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Game Popularity</CardTitle>
                <CardDescription>Distribution of plays by game</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height="300">
                  <PieChart>
                    <Pie
                      data={engagementData.gamePopularity}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ game, percentage }) => `${game} (${percentage}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="plays"
                    >
                      {engagementData.gamePopularity.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Streak Distribution</CardTitle>
              <CardDescription>Number of users by streak length</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height="300">
                <BarChart data={engagementData.streakDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="streakLength" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="users" fill="#b28c49" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Games Tab */}
        <TabsContent value="games" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {gameMetrics.map((game) => (
              <Card key={game.gameId}>
                <CardHeader>
                  <CardTitle>{game.displayName}</CardTitle>
                  <CardDescription>{formatNumber(game.totalPlays)} total plays</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Completion Rate</span>
                    <span className="font-bold">{(game.completionRate * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Avg Solve Time</span>
                    <span className="font-bold">{formatDuration(game.avgSolveTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Avg Difficulty</span>
                    <span className="font-bold">{game.avgDifficulty.toFixed(1)}/5</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Perfect Games</span>
                    <span className="font-bold">{formatNumber(game.perfectGames)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Game Performance Comparison</CardTitle>
              <CardDescription>Key metrics across all games</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height="300">
                <RadarChart data={gameMetrics}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="displayName" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar name="Completion Rate" dataKey="completionRate" stroke="#6c0311" fill="#6c0311" fillOpacity={0.6} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Movies Tab */}
        <TabsContent value="movies" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Genre Popularity</CardTitle>
                <CardDescription>Most used movie genres</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height="300">
                  <BarChart data={movieAnalytics.genrePopularity.slice(0, 8)} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="genre" type="category" width={80} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#6c0311" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Release Year Trends</CardTitle>
                <CardDescription>Movie selection by decade</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height="300">
                  <LineChart data={movieAnalytics.releaseYearTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="decade" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="count" stroke="#6c0311" name="Movies Used" />
                    <Line yAxisId="right" type="monotone" dataKey="avgEngagement" stroke="#2b725e" name="Avg Engagement" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Budget vs Engagement</CardTitle>
              <CardDescription>Correlation between movie budget and player engagement</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height="400">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    dataKey="budget" 
                    name="Budget" 
                    unit="M"
                    tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`}
                  />
                  <YAxis type="number" dataKey="engagement" name="Engagement" />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload[0]) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background p-2 border rounded shadow-lg">
                            <p className="font-semibold">{data.title}</p>
                            <p className="text-sm">Budget: ${(data.budget / 1000000).toFixed(1)}M</p>
                            <p className="text-sm">Engagement: {data.engagement.toFixed(1)}%</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter name="Movies" data={movieAnalytics.budgetEngagement} fill="#b28c49" />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Most Used Movies</CardTitle>
              <CardDescription>Top 10 movies across all games</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {movieAnalytics.mostUsedMovies.slice(0, 10).map((movie, index) => (
                  <div key={movie.tmdbId} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground w-6">#{index + 1}</span>
                      <Film className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{movie.title}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">{movie.usageCount} uses</span>
                      <span className="text-sm font-medium">{movie.avgEngagement.toFixed(1)}% engagement</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Retention Tab */}
        <TabsContent value="retention" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Retention Cohorts</CardTitle>
              <CardDescription>User retention by signup cohort</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Cohort</th>
                      <th className="text-center p-2">Day 1</th>
                      <th className="text-center p-2">Day 7</th>
                      <th className="text-center p-2">Day 30</th>
                    </tr>
                  </thead>
                  <tbody>
                    {engagementData.retentionCohorts.map((cohort) => (
                      <tr key={cohort.cohort} className="border-b hover:bg-muted/50">
                        <td className="p-2">{cohort.cohort}</td>
                        <td className="text-center p-2">
                          <span className={`font-medium ${cohort.day1 >= 80 ? 'text-green-600' : cohort.day1 >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {cohort.day1.toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-center p-2">
                          <span className={`font-medium ${cohort.day7 >= 50 ? 'text-green-600' : cohort.day7 >= 30 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {cohort.day7.toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-center p-2">
                          <span className={`font-medium ${cohort.day30 >= 20 ? 'text-green-600' : cohort.day30 >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {cohort.day30.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Poster Pixels Tab */}
        <TabsContent value="poster-pixels" className="space-y-4">
          {posterPixelsAnalytics && (
            <>
              {/* Overview Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Games</CardTitle>
                    <Image className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(posterPixelsAnalytics.overview.totalGames)}</div>
                    <p className="text-xs text-muted-foreground">
                      {posterPixelsAnalytics.overview.completedGames} completed
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                    <Award className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{(posterPixelsAnalytics.overview.winRate * 100).toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground">
                      {posterPixelsAnalytics.overview.wonGames} games won
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Clarity</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{posterPixelsAnalytics.overview.avgClarityLevel.toFixed(1)}</div>
                    <p className="text-xs text-muted-foreground">
                      Level reached (1-6)
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Perfect Games</CardTitle>
                    <GamepadIcon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(posterPixelsAnalytics.overview.perfectGames)}</div>
                    <p className="text-xs text-muted-foreground">
                      Won on first clarity
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Game Stats</CardTitle>
                    <CardDescription>Games played, completed, and won over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height="300">
                      <LineChart data={posterPixelsAnalytics.dailyStats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(date) => format(new Date(date), 'MMM d')}
                        />
                        <YAxis />
                        <Tooltip 
                          labelFormatter={(date) => format(new Date(date), 'MMM d, yyyy')}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="totalGames" stroke="#6c0311" name="Total Games" />
                        <Line type="monotone" dataKey="completedGames" stroke="#2b725e" name="Completed" />
                        <Line type="monotone" dataKey="wonGames" stroke="#b28c49" name="Won" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Clarity Level Distribution</CardTitle>
                    <CardDescription>Number of wins at each clarity level</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height="300">
                      <BarChart data={posterPixelsAnalytics.clarityDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="level" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#6c0311" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Popular Movies</CardTitle>
                    <CardDescription>Most frequently used movies in puzzles</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {posterPixelsAnalytics.popularMovies.slice(0, 10).map((movie, index) => (
                        <div key={movie.title} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground w-6">#{index + 1}</span>
                            <Film className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{movie.title}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">{movie.count} times</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Players</CardTitle>
                    <CardDescription>Best performing Poster Pixels players</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b text-xs">
                            <th className="text-left p-2">Player</th>
                            <th className="text-center p-2">Games</th>
                            <th className="text-center p-2">Won</th>
                            <th className="text-center p-2">Win %</th>
                            <th className="text-center p-2">Avg Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {posterPixelsAnalytics.topPlayers.slice(0, 10).map((player, index) => (
                            <tr key={player.userId} className="border-b hover:bg-muted/50 text-sm">
                              <td className="p-2">
                                <span className="text-muted-foreground mr-2">#{index + 1}</span>
                                {player.userId.substring(0, 8)}...
                              </td>
                              <td className="text-center p-2">{player.gamesPlayed}</td>
                              <td className="text-center p-2">{player.gamesWon}</td>
                              <td className="text-center p-2">
                                <span className={`font-medium ${parseFloat(player.winRate) >= 80 ? 'text-green-600' : parseFloat(player.winRate) >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                  {player.winRate}%
                                </span>
                              </td>
                              <td className="text-center p-2">{player.avgTime}s</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}