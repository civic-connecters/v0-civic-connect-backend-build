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

    // Get dashboard statistics
    const [
      { count: totalUsers },
      { count: totalIssues },
      { count: totalEvents },
      { count: activeIssues },
      { count: resolvedIssues },
      { count: pendingIssues },
    ] = await Promise.all([
      supabase.from("user_profiles").select("*", { count: "exact", head: true }),
      supabase.from("civic_issues").select("*", { count: "exact", head: true }),
      supabase.from("community_events").select("*", { count: "exact", head: true }),
      supabase.from("civic_issues").select("*", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("civic_issues").select("*", { count: "exact", head: true }).eq("status", "resolved"),
      supabase.from("civic_issues").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
    ])

    // Get recent activity
    const { data: recentIssues } = await supabase
      .from("civic_issues")
      .select(`
        id,
        title,
        category,
        status,
        priority,
        created_at,
        user_profiles!civic_issues_user_id_fkey(full_name)
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
        user_profiles!community_events_organizer_id_fkey(full_name)
      `)
      .order("created_at", { ascending: false })
      .limit(5)

    // Get category breakdown
    const { data: categoryStats } = await supabase
      .from("civic_issues")
      .select("category")
      .then(({ data }) => {
        const stats = data?.reduce(
          (acc, issue) => {
            acc[issue.category] = (acc[issue.category] || 0) + 1
            return acc
          },
          {} as Record<string, number>,
        )
        return { data: stats }
      })

    // Get monthly issue trends (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const { data: monthlyTrends } = await supabase
      .from("civic_issues")
      .select("created_at")
      .gte("created_at", sixMonthsAgo.toISOString())
      .then(({ data }) => {
        const trends = data?.reduce(
          (acc, issue) => {
            const month = new Date(issue.created_at).toISOString().slice(0, 7) // YYYY-MM
            acc[month] = (acc[month] || 0) + 1
            return acc
          },
          {} as Record<string, number>,
        )
        return { data: trends }
      })

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
        categoryBreakdown: categoryStats || {},
        monthlyTrends: monthlyTrends || {},
      },
    })
  } catch (error) {
    console.error("Admin dashboard error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
