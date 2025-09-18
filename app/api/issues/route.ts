import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  console.log("[v0] Issues API GET request received")

  try {
    const supabase = await createClient()
    console.log("[v0] Supabase client created successfully")
    const { searchParams } = new URL(request.url)

    // Query parameters
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const category = searchParams.get("category")
    const status = searchParams.get("status")
    const priority = searchParams.get("priority")
    const sortBy = searchParams.get("sortBy") || "created_at"
    const sortOrder = searchParams.get("sortOrder") || "desc"

    const offset = (page - 1) * limit

    // Build query
    let query = supabase.from("civic_issues").select(`
        *,
        issue_categories(name, icon, color),
        profiles!civic_issues_reporter_id_fkey(first_name, last_name, display_name),
        profiles!civic_issues_assigned_to_fkey(first_name, last_name, display_name)
      `)

    // Apply filters
    if (category) {
      query = query.eq("category_id", category)
    }
    if (status) {
      query = query.eq("status", status)
    }
    if (priority) {
      query = query.eq("priority", priority)
    }

    // Apply sorting and pagination
    query = query.order(sortBy, { ascending: sortOrder === "asc" })
    query = query.range(offset, offset + limit - 1)

    const { data: issues, error, count } = await query

    console.log("[v0] Issues query executed, found:", issues?.length || 0, "issues")

    if (error) {
      console.error("Error fetching issues:", error)
      return NextResponse.json({ error: "Failed to fetch issues" }, { status: 500 })
    }

    return NextResponse.json({
      issues,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("[v0] Issues API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
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
    const {
      title,
      description,
      category_id,
      priority = "medium",
      location_address,
      latitude,
      longitude,
      image_urls = [],
      is_anonymous = false,
    } = body

    // Validate required fields
    if (!title || !description) {
      return NextResponse.json({ error: "Title and description are required" }, { status: 400 })
    }

    // Create the issue
    const { data: issue, error } = await supabase
      .from("civic_issues")
      .insert({
        title,
        description,
        category_id,
        reporter_id: user.id,
        priority,
        location_address,
        latitude,
        longitude,
        image_urls,
        is_anonymous,
      })
      .select(`
        *,
        issue_categories(name, icon, color),
        profiles!civic_issues_reporter_id_fkey(first_name, last_name, display_name)
      `)
      .single()

    if (error) {
      console.error("Error creating issue:", error)
      return NextResponse.json({ error: "Failed to create issue" }, { status: 500 })
    }

    return NextResponse.json({ issue }, { status: 201 })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
