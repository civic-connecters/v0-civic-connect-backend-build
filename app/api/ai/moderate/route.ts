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

    const { content } = await request.json()

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    const moderation = await groqAI.moderateContent(content)

    return NextResponse.json(moderation)
  } catch (error) {
    console.error("AI moderation error:", error)
    return NextResponse.json({ error: "Failed to moderate content" }, { status: 500 })
  }
}
