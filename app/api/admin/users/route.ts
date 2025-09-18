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
    const search = searchParams.get("search") || ""
    const role = searchParams.get("role") || ""

    const offset = (page - 1) * limit

    let query = supabase
      .from("user_profiles")
      .select(`
        *,
        auth_users:user_id (
          email,
          created_at,
          last_sign_in_at
        )
      `)
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,bio.ilike.%${search}%`)
    }

    if (role) {
      query = query.eq("role", role)
    }

    const { data: users, error } = await query.order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
    }

    // Get total count for pagination
    let countQuery = supabase.from("user_profiles").select("*", { count: "exact", head: true })

    if (search) {
      countQuery = countQuery.or(`full_name.ilike.%${search}%,bio.ilike.%${search}%`)
    }

    if (role) {
      countQuery = countQuery.eq("role", role)
    }

    const { count } = await countQuery

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("Admin users fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
