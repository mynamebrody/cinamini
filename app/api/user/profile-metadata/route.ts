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

// Check username uniqueness by querying all users (less efficient)
async function isUsernameUnique(supabase: any, username: string, currentUserId: string): Promise<boolean> {
  const { data: users, error } = await supabase.auth.admin.listUsers()
  
  if (error) {
    throw new Error('Failed to check username uniqueness')
  }
  
  return !users.users.some((user: any) => 
    user.id !== currentUserId && 
    user.user_metadata?.display_name?.toLowerCase() === username.toLowerCase()
  )
}

// GET /api/user/profile-metadata - Fetch current user profile from metadata
export async function GET() {
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

    return NextResponse.json({
      email: user.email,
      username: user.user_metadata?.display_name || null,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    })

  } catch (error) {
    console.error('Profile GET error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// PUT /api/user/profile-metadata - Update username in user metadata
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

    // Check uniqueness (requires admin access)
    // NOTE: This requires service role key in production
    const isUnique = await isUsernameUnique(supabase, trimmedUsername, user.id)
    if (!isUnique) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 409 }
      )
    }

    // Update user metadata
    const { data: updatedUser, error: updateError } = await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        display_name: trimmedUsername,
      }
    })

    if (updateError) {
      console.error('Profile update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update username' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      email: updatedUser.user?.email,
      username: updatedUser.user?.user_metadata?.display_name,
      createdAt: updatedUser.user?.created_at,
      updatedAt: updatedUser.user?.updated_at,
    })

  } catch (error) {
    console.error('Profile PUT error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}