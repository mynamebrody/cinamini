import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Rate limiting - in memory store (in production, use Redis)
const updateAttempts = new Map<string, { count: number; resetTime: number }>()
const MAX_UPDATES_PER_HOUR = 5
const HOUR_IN_MS = 60 * 60 * 1000

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const userAttempts = updateAttempts.get(userId)
  
  if (!userAttempts || now > userAttempts.resetTime) {
    updateAttempts.set(userId, { count: 1, resetTime: now + HOUR_IN_MS })
    return true
  }
  
  if (userAttempts.count >= MAX_UPDATES_PER_HOUR) {
    return false
  }
  
  userAttempts.count++
  return true
}

// Validate username
function validateUsername(username: string): { isValid: boolean; error?: string } {
  if (!username) {
    return { isValid: false, error: 'Username is required' }
  }
  
  const trimmed = username.trim()
  
  if (trimmed.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters long' }
  }
  
  if (trimmed.length > 20) {
    return { isValid: false, error: 'Username must be no longer than 20 characters' }
  }
  
  // Allow alphanumeric, underscores, and hyphens
  const validChars = /^[a-zA-Z0-9_-]+$/
  if (!validChars.test(trimmed)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' }
  }
  
  return { isValid: true }
}

// GET /api/user/profile - Fetch current user profile
export async function GET(request: NextRequest) {
  try {
    // Verify user authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user profile from database
    const { data: profile, error: profileError } = await supabase
      .from('cinamini_user_profiles')
      .select('display_name, created_at, updated_at')
      .eq('user_id', user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Profile fetch error:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      )
    }

    // If no profile exists, create one
    if (!profile) {
      const { data: newProfile, error: createError } = await supabase
        .from('cinamini_user_profiles')
        .insert([
          {
            user_id: user.id,
            display_name: null,
          }
        ])
        .select('display_name, created_at, updated_at')
        .single()

      if (createError) {
        console.error('Profile creation error:', createError)
        return NextResponse.json(
          { error: 'Failed to create profile' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        email: user.email,
        username: newProfile.display_name,
        createdAt: newProfile.created_at,
        updatedAt: newProfile.updated_at,
      })
    }

    return NextResponse.json({
      email: user.email,
      username: profile.display_name,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    })

  } catch (error) {
    console.error('Profile GET error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// PUT /api/user/profile - Update username
export async function PUT(request: NextRequest) {
  try {
    // Verify user authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check rate limiting
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: 'Too many username updates. You can only change your username 5 times per hour.' },
        { status: 429 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { username } = body

    // Validate username
    const validation = validateUsername(username)
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const trimmedUsername = username.trim()

    // Check if username is already taken (case-insensitive)
    const { data: existingUser, error: checkError } = await supabase
      .from('cinamini_user_profiles')
      .select('user_id')
      .ilike('display_name', trimmedUsername)
      .neq('user_id', user.id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Username check error:', checkError)
      return NextResponse.json(
        { error: 'Failed to validate username' },
        { status: 500 }
      )
    }

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 409 }
      )
    }

    // Update or insert user profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('cinamini_user_profiles')
      .upsert(
        {
          user_id: user.id,
          display_name: trimmedUsername,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id'
        }
      )
      .select('display_name, created_at, updated_at')
      .single()

    if (updateError) {
      console.error('Profile update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update username' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      email: user.email,
      username: updatedProfile.display_name,
      createdAt: updatedProfile.created_at,
      updatedAt: updatedProfile.updated_at,
    })

  } catch (error) {
    console.error('Profile PUT error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}