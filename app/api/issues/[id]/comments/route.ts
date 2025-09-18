import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: comments, error } = await supabase
      .from("issue_comments")
      .select(`
        *,
        profiles(first_name, last_name, display_name, avatar_url)
      `)
      .eq("issue_id", id)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching comments:", error)
      return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 })
    }

    return NextResponse.json({ comments })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const body = await request.json()
    const { content, parent_comment_id } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: "Comment content is required" }, { status: 400 })
    }

    // Check if user is admin for official comments
    const { data: adminRole } = await supabase
      .from("user_admin_roles")
      .select("admin_roles(permissions)")
      .eq("user_id", user.id)
      .single()

    const isOfficial = adminRole?.admin_roles?.permissions?.includes("manage_issues") || false

    const { data: comment, error } = await supabase
      .from("issue_comments")
      .insert({
        issue_id: id,
        user_id: user.id,
        content: content.trim(),
        parent_comment_id,
        is_official: isOfficial,
      })
      .select(`
        *,
        profiles(first_name, last_name, display_name, avatar_url)
      `)
      .single()

    if (error) {
      console.error("Error creating comment:", error)
      return NextResponse.json({ error: "Failed to create comment" }, { status: 500 })
    }

    return NextResponse.json({ comment }, { status: 201 })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
