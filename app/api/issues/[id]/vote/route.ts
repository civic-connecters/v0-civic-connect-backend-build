import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

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
    const { vote_type } = body

    if (!vote_type || !["up", "down"].includes(vote_type)) {
      return NextResponse.json({ error: "Invalid vote type" }, { status: 400 })
    }

    // Check if user already voted
    const { data: existingVote } = await supabase
      .from("issue_votes")
      .select("*")
      .eq("issue_id", id)
      .eq("user_id", user.id)
      .single()

    if (existingVote) {
      if (existingVote.vote_type === vote_type) {
        // Remove vote if same type
        const { error } = await supabase.from("issue_votes").delete().eq("issue_id", id).eq("user_id", user.id)

        if (error) {
          console.error("Error removing vote:", error)
          return NextResponse.json({ error: "Failed to remove vote" }, { status: 500 })
        }

        return NextResponse.json({ message: "Vote removed" })
      } else {
        // Update vote type
        const { error } = await supabase
          .from("issue_votes")
          .update({ vote_type })
          .eq("issue_id", id)
          .eq("user_id", user.id)

        if (error) {
          console.error("Error updating vote:", error)
          return NextResponse.json({ error: "Failed to update vote" }, { status: 500 })
        }

        return NextResponse.json({ message: "Vote updated" })
      }
    } else {
      // Create new vote
      const { error } = await supabase.from("issue_votes").insert({
        issue_id: id,
        user_id: user.id,
        vote_type,
      })

      if (error) {
        console.error("Error creating vote:", error)
        return NextResponse.json({ error: "Failed to create vote" }, { status: 500 })
      }

      return NextResponse.json({ message: "Vote created" })
    }
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Get user's vote for this issue
    const { data: vote } = await supabase
      .from("issue_votes")
      .select("vote_type")
      .eq("issue_id", id)
      .eq("user_id", user.id)
      .single()

    return NextResponse.json({ vote: vote?.vote_type || null })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
