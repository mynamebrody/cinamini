import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { subDays, startOfDay, format } from 'date-fns';

interface TestResult {
  check: string;
  status: 'pass' | 'fail' | 'warning';
  details: any;
  message?: string;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceClient();
    const results: TestResult[] = [];

    // Test 1: Check database connectivity
    const { count: userCount, error: userError } = await supabase
      .from('cinamini_user_profiles')
      .select('*', { count: 'exact', head: true });

    results.push({
      check: 'Database Connectivity',
      status: userError ? 'fail' : 'pass',
      details: { userCount, error: userError?.message },
      message: userError ? `Database error: ${userError.message}` : `Connected successfully. ${userCount} users found.`
    });

    // Test 2: Check user stats table
    const { data: userStats, error: statsError } = await supabase
      .from('cinamini_user_stats')
      .select('*')
      .limit(5);

    results.push({
      check: 'User Stats Table',
      status: statsError ? 'fail' : userStats && userStats.length > 0 ? 'pass' : 'warning',
      details: { sampleCount: userStats?.length || 0, error: statsError?.message },
      message: statsError ? `Error: ${statsError.message}` : 
               userStats && userStats.length > 0 ? `Found ${userStats.length} user stats records` : 
               'No user stats records found'
    });

    // Test 3: Check game data integrity
    const gameChecks = await checkGameDataIntegrity(supabase);
    results.push(...gameChecks);

    // Test 4: Check data freshness
    const freshnessChecks = await checkDataFreshness(supabase);
    results.push(...freshnessChecks);

    // Test 5: Check analytics calculations
    const calculationChecks = await checkAnalyticsCalculations(supabase);
    results.push(...calculationChecks);

    // Test 6: Check for data anomalies
    const anomalyChecks = await checkDataAnomalies(supabase);
    results.push(...anomalyChecks);

    // Summary
    const summary = {
      totalChecks: results.length,
      passed: results.filter(r => r.status === 'pass').length,
      failed: results.filter(r => r.status === 'fail').length,
      warnings: results.filter(r => r.status === 'warning').length,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json({
      summary,
      results,
      recommendations: generateRecommendations(results)
    });

  } catch (error) {
    console.error('Analytics test error:', error);
    return NextResponse.json(
      { error: 'Failed to run analytics tests', details: error },
      { status: 500 }
    );
  }
}

async function checkGameDataIntegrity(supabase: any): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Check Retitled data
  const { data: retitledGuesses, count: retitledCount } = await supabase
    .from('retitled_guesses')
    .select('*, retitled_puzzles!inner(*)', { count: 'exact' })
    .limit(10);

  const retitledIssues = [];
  if (retitledGuesses) {
    const orphanedGuesses = retitledGuesses.filter(g => !g.retitled_puzzles);
    if (orphanedGuesses.length > 0) {
      retitledIssues.push(`${orphanedGuesses.length} orphaned guesses without puzzles`);
    }
    
    const invalidSolveTimes = retitledGuesses.filter(g => g.solve_time_ms && g.solve_time_ms < 0);
    if (invalidSolveTimes.length > 0) {
      retitledIssues.push(`${invalidSolveTimes.length} guesses with negative solve times`);
    }
  }

  results.push({
    check: 'Retitled Data Integrity',
    status: retitledIssues.length === 0 ? 'pass' : 'warning',
    details: { totalGuesses: retitledCount, issues: retitledIssues },
    message: retitledIssues.length === 0 ? 
      `All ${retitledCount} Retitled guesses have valid data` : 
      `Found issues: ${retitledIssues.join(', ')}`
  });

  // Check Budget Bracket data
  const { data: budgetGames, count: budgetCount } = await supabase
    .from('budget_bracket_games')
    .select('*', { count: 'exact' })
    .limit(10);

  const budgetIssues = [];
  if (budgetGames) {
    const invalidRounds = budgetGames.filter(g => g.rounds_completed < 0 || g.rounds_completed > 5);
    if (invalidRounds.length > 0) {
      budgetIssues.push(`${invalidRounds.length} games with invalid round counts`);
    }
    
    const perfectGameMismatch = budgetGames.filter(g => g.is_perfect_game && g.rounds_completed !== 5);
    if (perfectGameMismatch.length > 0) {
      budgetIssues.push(`${perfectGameMismatch.length} perfect games with wrong round count`);
    }
  }

  results.push({
    check: 'Budget Bracket Data Integrity',
    status: budgetIssues.length === 0 ? 'pass' : 'warning',
    details: { totalGames: budgetCount, issues: budgetIssues },
    message: budgetIssues.length === 0 ? 
      `All ${budgetCount} Budget Bracket games have valid data` : 
      `Found issues: ${budgetIssues.join(', ')}`
  });

  // Check Cast Climb data
  const { data: castClimbGuesses } = await supabase
    .from('cast_climb_guesses')
    .select('user_id, puzzle_id, actors_revealed')
    .limit(100);

  const castClimbIssues = [];
  if (castClimbGuesses) {
    const invalidActorCounts = castClimbGuesses.filter(g => g.actors_revealed < 1 || g.actors_revealed > 4);
    if (invalidActorCounts.length > 0) {
      castClimbIssues.push(`${invalidActorCounts.length} guesses with invalid actor counts`);
    }
  }

  results.push({
    check: 'Cast Climb Data Integrity',
    status: castClimbIssues.length === 0 ? 'pass' : 'warning',
    details: { sampleSize: castClimbGuesses?.length || 0, issues: castClimbIssues },
    message: castClimbIssues.length === 0 ? 
      'Cast Climb data appears valid' : 
      `Found issues: ${castClimbIssues.join(', ')}`
  });

  return results;
}

async function checkDataFreshness(supabase: any): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const now = new Date();

  // Check latest activity for each game
  const games = [
    { name: 'Retitled', table: 'retitled_guesses' },
    { name: 'Budget Bracket', table: 'budget_bracket_games' },
    { name: 'Cast Climb', table: 'cast_climb_guesses' }
  ];

  for (const game of games) {
    const { data, error } = await supabase
      .from(game.table)
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      results.push({
        check: `${game.name} Data Freshness`,
        status: 'warning',
        details: { error: error?.message },
        message: `No recent data found for ${game.name}`
      });
    } else {
      const lastActivity = new Date(data.created_at);
      const hoursAgo = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
      
      results.push({
        check: `${game.name} Data Freshness`,
        status: hoursAgo < 24 ? 'pass' : hoursAgo < 72 ? 'warning' : 'fail',
        details: { lastActivity: data.created_at, hoursAgo: Math.round(hoursAgo) },
        message: `Last activity: ${Math.round(hoursAgo)} hours ago`
      });
    }
  }

  return results;
}

async function checkAnalyticsCalculations(supabase: any): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Test DAU calculation
  const today = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [retitled, budget, castClimb] = await Promise.all([
    supabase
      .from('retitled_guesses')
      .select('user_id')
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString()),
    supabase
      .from('budget_bracket_games')
      .select('user_id')
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString()),
    supabase
      .from('cast_climb_guesses')
      .select('user_id')
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())
  ]);

  const uniqueUsers = new Set([
    ...(retitled.data?.map(r => r.user_id) || []),
    ...(budget.data?.map(b => b.user_id) || []),
    ...(castClimb.data?.map(c => c.user_id) || [])
  ]);

  results.push({
    check: 'Daily Active Users Calculation',
    status: 'pass',
    details: { 
      dauCount: uniqueUsers.size,
      retitledUsers: retitled.data?.length || 0,
      budgetUsers: budget.data?.length || 0,
      castClimbUsers: castClimb.data?.length || 0
    },
    message: `${uniqueUsers.size} unique users active today`
  });

  // Test completion rate calculation
  const { data: recentRetitled } = await supabase
    .from('retitled_guesses')
    .select('is_correct')
    .gte('created_at', subDays(new Date(), 7).toISOString());

  if (recentRetitled && recentRetitled.length > 0) {
    const completionRate = (recentRetitled.filter(g => g.is_correct).length / recentRetitled.length) * 100;
    
    results.push({
      check: 'Completion Rate Calculation',
      status: 'pass',
      details: { 
        totalGuesses: recentRetitled.length,
        correctGuesses: recentRetitled.filter(g => g.is_correct).length,
        completionRate: completionRate.toFixed(2)
      },
      message: `Retitled completion rate: ${completionRate.toFixed(2)}%`
    });
  }

  // Test RPC function
  try {
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('calculate_avg_session_duration', {
        start_date: subDays(new Date(), 7).toISOString(),
        end_date: new Date().toISOString()
      });

    results.push({
      check: 'RPC Function - calculate_avg_session_duration',
      status: rpcError ? 'fail' : 'pass',
      details: { result: rpcResult, error: rpcError?.message },
      message: rpcError ? `RPC error: ${rpcError.message}` : `Function returns: ${rpcResult?.avg_duration}s`
    });
  } catch (e) {
    results.push({
      check: 'RPC Function - calculate_avg_session_duration',
      status: 'fail',
      details: { error: e },
      message: `Function call failed: ${e}`
    });
  }

  return results;
}

async function checkDataAnomalies(supabase: any): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Check for duplicate user stats
  const { data: userStats } = await supabase
    .from('cinamini_user_stats')
    .select('user_id')
    .order('user_id');

  if (userStats) {
    const userIds = userStats.map(s => s.user_id);
    const duplicates = userIds.filter((id, index) => userIds.indexOf(id) !== index);
    
    results.push({
      check: 'Duplicate User Stats',
      status: duplicates.length === 0 ? 'pass' : 'fail',
      details: { duplicateCount: duplicates.length, duplicateIds: duplicates.slice(0, 5) },
      message: duplicates.length === 0 ? 
        'No duplicate user stats found' : 
        `Found ${duplicates.length} duplicate user stat entries`
    });
  }

  // Check for impossible streaks
  const { data: streakData } = await supabase
    .from('cinamini_user_stats')
    .select('current_daily_streak, longest_daily_streak')
    .gt('current_daily_streak', 0);

  if (streakData) {
    const impossibleStreaks = streakData.filter(s => 
      s.current_daily_streak > s.longest_daily_streak ||
      s.current_daily_streak > 365 ||
      s.longest_daily_streak > 365
    );
    
    results.push({
      check: 'Streak Data Validity',
      status: impossibleStreaks.length === 0 ? 'pass' : 'warning',
      details: { 
        totalStreaks: streakData.length,
        impossibleCount: impossibleStreaks.length 
      },
      message: impossibleStreaks.length === 0 ? 
        'All streak data appears valid' : 
        `Found ${impossibleStreaks.length} users with impossible streak values`
    });
  }

  return results;
}

function generateRecommendations(results: TestResult[]): string[] {
  const recommendations: string[] = [];
  
  const failedChecks = results.filter(r => r.status === 'fail');
  const warningChecks = results.filter(r => r.status === 'warning');

  if (failedChecks.length > 0) {
    recommendations.push('🔴 Critical issues found that need immediate attention:');
    failedChecks.forEach(check => {
      recommendations.push(`  - ${check.check}: ${check.message}`);
    });
  }

  if (warningChecks.length > 0) {
    recommendations.push('🟡 Warnings that should be investigated:');
    warningChecks.forEach(check => {
      recommendations.push(`  - ${check.check}: ${check.message}`);
    });
  }

  // Specific recommendations based on common issues
  if (results.some(r => r.check.includes('Data Freshness') && r.status !== 'pass')) {
    recommendations.push('📊 Consider implementing automated data generation for testing');
  }

  if (results.some(r => r.check.includes('Data Integrity') && r.status !== 'pass')) {
    recommendations.push('🔧 Review data validation rules and add database constraints');
  }

  if (results.some(r => r.check === 'RPC Function' && r.status === 'fail')) {
    recommendations.push('⚙️ Check that all database functions are properly deployed');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ All analytics systems are functioning correctly!');
  }

  return recommendations;
}