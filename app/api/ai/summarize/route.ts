import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { groqAI } from "@/lib/ai/groq-client"

export async function POST(request: NextRequest) {
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

    const { issueId } = await request.json()

    if (!issueId) {
      return NextResponse.json({ error: "Issue ID is required" }, { status: 400 })
    }

    // Fetch issue with comments and votes
    const { data: issue, error: issueError } = await supabase
      .from("civic_issues")
      .select(`
        *,
        comments:issue_comments(content),
        votes:issue_votes(vote_type)
      `)
      .eq("id", issueId)
      .single()

    if (issueError || !issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 })
    }

    const voteCount = issue.votes?.filter((v: any) => v.vote_type === "up").length || 0

    const summary = await groqAI.generateIssueSummary({
      title: issue.title,
      description: issue.description,
      comments: issue.comments || [],
      votes: voteCount,
    })

    return NextResponse.json({ summary })
  } catch (error) {
    console.error("AI summarization error:", error)
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 })
  }
}
