import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { groqAI } from "@/lib/ai/groq-client"

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Check authentication and admin role
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase.from("user_profiles").select("role").eq("user_id", user.id).single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Fetch recent issues with engagement data
    const { data: issues, error: issuesError } = await supabase
      .from("civic_issues")
      .select(`
        title,
        category,
        created_at,
        votes:issue_votes(vote_type),
        comments:issue_comments(id)
      `)
      .order("created_at", { ascending: false })
      .limit(50)

    if (issuesError) {
      return NextResponse.json({ error: "Failed to fetch issues" }, { status: 500 })
    }

    // Transform data for AI analysis
    const analysisData =
      issues?.map((issue) => ({
        title: issue.title,
        category: issue.category,
        votes: issue.votes?.filter((v: any) => v.vote_type === "up").length || 0,
        comments: issue.comments?.length || 0,
        created_at: issue.created_at,
      })) || []

    const analytics = await groqAI.analyzeEngagement(analysisData)

    return NextResponse.json(analytics)
  } catch (error) {
    console.error("AI analytics error:", error)
    return NextResponse.json({ error: "Failed to generate analytics" }, { status: 500 })
  }
}
