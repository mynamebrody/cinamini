import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

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
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: "Email address is required" }, 
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
    
    const { data, error } = await supabaseService.auth.admin.inviteUserByEmail(email, {
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://cinamini.app'}/auth/callback?invited=true`
      }
    })

    if (error) {
      console.error('Error inviting user:', error)
      
      // Handle specific error cases
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please wait before sending another invitation." }, 
          { status: 429 }
        )
      }

      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        return NextResponse.json(
          { error: "User with this email already exists" }, 
          { status: 409 }
        )
      }

      if (error.message.includes('invalid email')) {
        return NextResponse.json(
          { error: "Invalid email address" }, 
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: "Failed to send invitation email" }, 
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: `Invitation sent to ${email}`,
      user: {
        id: data.user?.id,
        email: data.user?.email,
        created_at: data.user?.created_at
      }
    })

  } catch (error) {
    console.error('Error in invite user API:', error)
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    )
  }
}