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

    const { title, description } = await request.json()

    if (!title || !description) {
      return NextResponse.json({ error: "Title and description are required" }, { status: 400 })
    }

    const categorization = await groqAI.categorizeIssue(title, description)

    return NextResponse.json(categorization)
  } catch (error) {
    console.error("AI categorization error:", error)
    return NextResponse.json({ error: "Failed to categorize issue" }, { status: 500 })
  }
}
