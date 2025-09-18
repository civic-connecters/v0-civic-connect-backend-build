import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get profile with public information
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, display_name, avatar_url, bio, city, state, created_at")
      .eq("id", id)
      .single()

    if (error) {
      console.error("Error fetching profile:", error)
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Get user's activity stats
    const [{ count: issuesReported }, { count: eventsOrganized }, { count: commentsPosted }] = await Promise.all([
      supabase.from("civic_issues").select("*", { count: "exact", head: true }).eq("reporter_id", id),
      supabase.from("community_events").select("*", { count: "exact", head: true }).eq("organizer_id", id),
      supabase.from("issue_comments").select("*", { count: "exact", head: true }).eq("user_id", id),
    ])

    return NextResponse.json({
      profile,
      stats: {
        issuesReported: issuesReported || 0,
        eventsOrganized: eventsOrganized || 0,
        commentsPosted: commentsPosted || 0,
      },
    })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is updating their own profile
    if (user.id !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { first_name, last_name, display_name, bio, phone, address, city, state, zip_code, avatar_url } = body

    // Update the profile
    const updateData: any = {}
    if (first_name !== undefined) updateData.first_name = first_name
    if (last_name !== undefined) updateData.last_name = last_name
    if (display_name !== undefined) updateData.display_name = display_name
    if (bio !== undefined) updateData.bio = bio
    if (phone !== undefined) updateData.phone = phone
    if (address !== undefined) updateData.address = address
    if (city !== undefined) updateData.city = city
    if (state !== undefined) updateData.state = state
    if (zip_code !== undefined) updateData.zip_code = zip_code
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url

    const { data: profile, error } = await supabase.from("profiles").update(updateData).eq("id", id).select().single()

    if (error) {
      console.error("Error updating profile:", error)
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
