import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Creating Supabase server client...")
    const supabase = await createClient()
    console.log("[v0] SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "Set" : "Not set")
    console.log("[v0] SUPABASE_ANON_KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Set" : "Not set")

    if (!supabase || !supabase.auth) {
      console.error("[v0] Supabase client or auth is undefined")
      return NextResponse.json({ error: "Authentication service unavailable" }, { status: 500 })
    }

    // Check authentication and admin role
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log("[v0] Authentication failed:", authError?.message || "No user")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] User authenticated:", user.id)

    // const { data: adminRole } = await supabase
    //   .from("user_admin_roles")
    //   .select("role_id")
    //   .eq("user_id", user.id)
    //   .single()

    // if (!adminRole) {
    //   return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    // }

    const [
      { count: totalUsers },
      { count: totalIssues },
      { count: totalEvents },
      { count: activeIssues },
      { count: resolvedIssues },
      { count: pendingIssues },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("civic_issues").select("*", { count: "exact", head: true }),
      supabase.from("community_events").select("*", { count: "exact", head: true }),
      supabase.from("civic_issues").select("*", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("civic_issues").select("*", { count: "exact", head: true }).eq("status", "resolved"),
      supabase.from("civic_issues").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
    ])

    const { data: recentIssues } = await supabase
      .from("civic_issues")
      .select(`
        id,
        title,
        status,
        priority,
        created_at,
        issue_categories(name),
        reporter:profiles!reporter_id(first_name, last_name, display_name)
      `)
      .order("created_at", { ascending: false })
      .limit(10)

    const { data: recentEvents } = await supabase
      .from("community_events")
      .select(`
        id,
        title,
        event_date,
        created_at,
        organizer:profiles!organizer_id(first_name, last_name, display_name)
      `)
      .order("created_at", { ascending: false })
      .limit(5)

    const { data: categoryData } = await supabase.from("civic_issues").select(`
        category_id,
        issue_categories(name)
      `)

    const categoryStats =
      categoryData?.reduce(
        (acc, issue) => {
          const categoryName = issue.issue_categories?.name || "Unknown"
          acc[categoryName] = (acc[categoryName] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      ) || {}

    // Get monthly issue trends (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const { data: trendData } = await supabase
      .from("civic_issues")
      .select("created_at")
      .gte("created_at", sixMonthsAgo.toISOString())

    const monthlyTrends =
      trendData?.reduce(
        (acc, issue) => {
          const month = new Date(issue.created_at).toISOString().slice(0, 7) // YYYY-MM
          acc[month] = (acc[month] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      ) || {}

    return NextResponse.json({
      stats: {
        totalUsers: totalUsers || 0,
        totalIssues: totalIssues || 0,
        totalEvents: totalEvents || 0,
        activeIssues: activeIssues || 0,
        resolvedIssues: resolvedIssues || 0,
        pendingIssues: pendingIssues || 0,
      },
      recentActivity: {
        issues: recentIssues || [],
        events: recentEvents || [],
      },
      analytics: {
        categoryBreakdown: categoryStats,
        monthlyTrends: monthlyTrends,
      },
    })
  } catch (error) {
    console.error("Admin dashboard error:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}
