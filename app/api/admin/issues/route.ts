import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

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

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const status = searchParams.get("status") || ""
    const category = searchParams.get("category") || ""
    const priority = searchParams.get("priority") || ""

    const offset = (page - 1) * limit

    let query = supabase
      .from("civic_issues")
      .select(`
        *,
        user_profiles!civic_issues_user_id_fkey(full_name, email),
        votes:issue_votes(vote_type),
        comments:issue_comments(id)
      `)
      .range(offset, offset + limit - 1)

    if (status) query = query.eq("status", status)
    if (category) query = query.eq("category", category)
    if (priority) query = query.eq("priority", priority)

    const { data: issues, error } = await query.order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: "Failed to fetch issues" }, { status: 500 })
    }

    // Transform data to include vote counts
    const transformedIssues = issues?.map((issue) => ({
      ...issue,
      upvotes: issue.votes?.filter((v: any) => v.vote_type === "up").length || 0,
      downvotes: issue.votes?.filter((v: any) => v.vote_type === "down").length || 0,
      commentCount: issue.comments?.length || 0,
    }))

    // Get total count for pagination
    let countQuery = supabase.from("civic_issues").select("*", { count: "exact", head: true })
    if (status) countQuery = countQuery.eq("status", status)
    if (category) countQuery = countQuery.eq("category", category)
    if (priority) countQuery = countQuery.eq("priority", priority)

    const { count } = await countQuery

    return NextResponse.json({
      issues: transformedIssues,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("Admin issues fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
