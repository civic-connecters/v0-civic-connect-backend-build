import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { groqAI } from "@/lib/ai/groq-client"

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { issueId } = await request.json()

    if (!issueId) {
      return NextResponse.json({ error: "Issue ID is required" }, { status: 400 })
    }

    // Fetch issue details
    const { data: issue, error: issueError } = await supabase
      .from("civic_issues")
      .select("title, description, category")
      .eq("id", issueId)
      .single()

    if (issueError || !issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 })
    }

    const solutions = await groqAI.suggestSolutions({
      title: issue.title,
      description: issue.description,
      category: issue.category,
    })

    return NextResponse.json({ solutions })
  } catch (error) {
    console.error("AI solutions error:", error)
    return NextResponse.json({ error: "Failed to generate solutions" }, { status: 500 })
  }
}
