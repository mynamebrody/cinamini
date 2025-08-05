import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

// Define valid link types
const VALID_LINK_TYPES = [
  'signup',
  'magiclink', 
  'invite',
  'recovery',
  'email_change_current',
  'email_change_new',
  'phone_change'
] as const

type LinkType = typeof VALID_LINK_TYPES[number]

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated and is super admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      )
    }

    // Verify super admin status
    const { data: profile } = await supabase
      .from("cinamini_user_profiles")
      .select("is_super_admin")
      .eq("user_id", user.id)
      .single()

    if (!profile?.is_super_admin) {
      return NextResponse.json(
        { error: "Forbidden: Super admin access required" }, 
        { status: 403 }
      )
    }

    // Parse request body
    const { email, type } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: "Email address is required" }, 
        { status: 400 }
      )
    }

    if (!type || !VALID_LINK_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid link type. Valid types: ${VALID_LINK_TYPES.join(', ')}` }, 
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" }, 
        { status: 400 }
      )
    }

    // Use service role client for admin operations
    const supabaseService = createServiceClient()
    
    const { data, error } = await supabaseService.auth.admin.generateLink({
      type: type as LinkType,
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://cinamini.app'}/auth/callback`
      }
    })

    if (error) {
      console.error('Error generating link:', error)
      
      // Handle specific error cases
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please wait before generating another link." }, 
          { status: 429 }
        )
      }

      if (error.message.includes('user not found')) {
        return NextResponse.json(
          { error: "User not found" }, 
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: "Failed to generate link" }, 
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      link: data.properties?.action_link,
      type: type,
      email: email,
      expiresAt: data.properties?.expires_at,
      hashed_token: data.properties?.hashed_token
    })

  } catch (error) {
    console.error('Error in generate link API:', error)
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    )
  }
}