import { NextRequest, NextResponse } from 'next/server'
import { 
  UserAPI,
  userSchemas,
  SecureDatabase,
  SecureErrorHandler,
  SecurityLogger,
  IDORProtection,
  ErrorCategory,
  ErrorSeverity,
  createValidatedAPIRoute,
  type ValidatedRequest,
  type UserProfileInput
} from "@/lib/validation"

// GET /api/user/profile - Fetch current user profile with IDOR protection
export const GET = createValidatedAPIRoute(
  async (request: NextRequest, validated: ValidatedRequest) => {
    const { context } = validated
    const userId = context.userId!

    try {
      // Log profile access
      SecurityLogger.logRequest(request, {
        userId,
        sessionId: context.sessionId
      })

      // Verify IDOR protection - user can only access their own profile
      const protection = await IDORProtection.checkResourceAccess(
        userId,
        'cinamini_user_profiles',
        userId, // Using userId as resourceId for profile access
        'read',
        request
      )

      if (!protection.allowed) {
        return SecureErrorHandler.handleAuthzError(
          'Profile access denied',
          {
            userId,
            endpoint: '/api/user/profile',
            method: 'GET',
            ipAddress: context.ipAddress,
            userAgent: context.userAgent
          },
          'profile_read'
        )
      }

      // Get user profile with secure query
      const profileResult = await SecureDatabase.getUserData(
        userId,
        'cinamini_user_profiles',
        {}
      )

      let profile = profileResult.data?.[0]

      // If profile doesn't exist, create it (handle edge case for existing users)
      if (!profile) {
        SecurityLogger.logRequest(request, {
          userId,
          metadata: { action: 'profile_auto_creation' }
        })

        const createResult = await SecureDatabase.insertUserData(
          userId,
          'cinamini_user_profiles',
          {
            display_name: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        )

        if (!createResult.data) {
          return SecureErrorHandler.handleDatabaseError(
            createResult.error || 'Failed to create profile',
            {
              userId,
              endpoint: '/api/user/profile',
              method: 'GET',
              ipAddress: context.ipAddress,
              userAgent: context.userAgent
            },
            'profile_creation'
          )
        }

        profile = createResult.data
      }

      // Get user email from auth (safely)
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      return NextResponse.json({
        success: true,
        data: {
          email: user?.email || null,
          username: profile.display_name,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at
        }
      }, { status: 200 })

    } catch (error) {
      return SecureErrorHandler.handleError(
        error instanceof Error ? error : 'Profile fetch failed',
        {
          userId,
          endpoint: '/api/user/profile',
          method: 'GET',
          ipAddress: context.ipAddress,
          userAgent: context.userAgent
        },
        ErrorSeverity.MEDIUM,
        ErrorCategory.SYSTEM
      )
    }
  },
  {
    methods: ['GET'],
    validation: {
      requireAuth: true,
      enableRateLimit: true,
      logRequest: true
    }
  }
)

// PUT /api/user/profile - Update user profile with comprehensive validation
export const PUT = UserAPI.profile<UserProfileInput>(
  async (request: NextRequest, validated: ValidatedRequest<UserProfileInput>) => {
    const { body: profileData, context } = validated
    const userId = context.userId!

    try {
      // Log profile update attempt
      SecurityLogger.logRequest(request, {
        userId,
        sessionId: context.sessionId,
        metadata: { action: 'profile_update' }
      })

      // Enhanced rate limiting for profile updates (5 per hour)
      const rateLimiter = SecurityLogger.createRateLimiter(5, 60 * 60 * 1000) // 5 per hour
      const rateCheck = rateLimiter.check()
      
      if (!rateCheck.allowed) {
        SecurityLogger.logSecurityEvent('RATE_LIMIT_EXCEEDED', request, {
          userId,
          severity: 'medium',
          description: 'Profile update rate limit exceeded',
          details: {
            resetTime: rateCheck.resetTime,
            action: 'profile_update'
          }
        })

        return SecureErrorHandler.handleRateLimitError(
          {
            userId,
            endpoint: '/api/user/profile',
            method: 'PUT',
            ipAddress: context.ipAddress,
            userAgent: context.userAgent
          },
          Math.ceil((rateCheck.resetTime! - Date.now()) / 1000)
        )
      }

      // Verify IDOR protection - user can only update their own profile
      const protection = await IDORProtection.checkResourceAccess(
        userId,
        'cinamini_user_profiles',
        userId,
        'write',
        request
      )

      if (!protection.allowed) {
        return SecureErrorHandler.handleAuthzError(
          'Profile update denied',
          {
            userId,
            endpoint: '/api/user/profile',
            method: 'PUT',
            ipAddress: context.ipAddress,
            userAgent: context.userAgent
          },
          'profile_write'
        )
      }

      // Validate username uniqueness if display name is being updated
      if (profileData.displayName) {
        const uniquenessCheck = await checkUsernameUniqueness(
          profileData.displayName,
          userId
        )

        if (!uniquenessCheck.isUnique) {
          SecurityLogger.logValidationFailure(request, {
            userId,
            field: 'displayName',
            value: profileData.displayName,
            reason: 'Username already taken'
          })

          return NextResponse.json({
            error: `The username "${profileData.displayName}" is already taken. Please try a different username.`,
            code: 'USERNAME_TAKEN'
          }, { status: 409 })
        }
      }

      // Prepare update data with sanitization
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString()
      }

      if (profileData.displayName !== undefined) {
        updateData.display_name = profileData.displayName
      }

      if (profileData.bio !== undefined) {
        updateData.bio = profileData.bio
      }

      if (profileData.avatarUrl !== undefined) {
        updateData.avatar_url = profileData.avatarUrl
      }

      // Update profile with secure database operation
      const updateResult = await SecureDatabase.updateUserData(
        userId,
        'cinamini_user_profiles',
        updateData,
        {}
      )

      if (!updateResult.data) {
        // Handle specific database errors
        if (updateResult.error?.includes('unique') || updateResult.error?.includes('duplicate')) {
          return NextResponse.json({
            error: `The username "${profileData.displayName}" is already taken. Please try a different username.`,
            code: 'USERNAME_TAKEN'
          }, { status: 409 })
        }

        return SecureErrorHandler.handleDatabaseError(
          updateResult.error || 'Failed to update profile',
          {
            userId,
            endpoint: '/api/user/profile',
            method: 'PUT',
            ipAddress: context.ipAddress,
            userAgent: context.userAgent
          },
          'profile_update'
        )
      }

      // Get user email for response
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      // Log successful profile update
      SecurityLogger.logRequest(request, {
        userId,
        metadata: {
          action: 'profile_updated',
          fieldsUpdated: Object.keys(updateData)
        }
      })

      return NextResponse.json({
        success: true,
        data: {
          email: user?.email || null,
          username: updateResult.data.display_name,
          bio: updateResult.data.bio,
          avatarUrl: updateResult.data.avatar_url,
          createdAt: updateResult.data.created_at,
          updatedAt: updateResult.data.updated_at
        }
      }, { status: 200 })

    } catch (error) {
      return SecureErrorHandler.handleError(
        error instanceof Error ? error : 'Profile update failed',
        {
          userId,
          endpoint: '/api/user/profile',
          method: 'PUT',
          ipAddress: context.ipAddress,
          userAgent: context.userAgent
        },
        ErrorSeverity.MEDIUM,
        ErrorCategory.SYSTEM
      )
    }
  },
  userSchemas.profile
)

/**
 * Check if username is unique (case-insensitive)
 */
async function checkUsernameUniqueness(
  username: string,
  currentUserId: string
): Promise<{ isUnique: boolean; error?: string }> {
  try {
    // Use secure database query to check uniqueness
    const existingResult = await SecureDatabase.getPublicData(
      'cinamini_user_profiles',
      {},
      {
        columns: 'user_id, display_name',
        limit: 1
      }
    )

    if (!existingResult.data) {
      return { isUnique: false, error: 'Database check failed' }
    }

    // Check for case-insensitive match excluding current user
    const existingUser = existingResult.data.find(profile => 
      profile.display_name && 
      profile.display_name.toLowerCase() === username.toLowerCase() &&
      profile.user_id !== currentUserId
    )

    return { isUnique: !existingUser }

  } catch (error) {
    console.error('Username uniqueness check error:', error)
    return { isUnique: false, error: 'Uniqueness check failed' }
  }
}

// Import createClient for auth operations
import { createClient } from '@/lib/supabase/server'