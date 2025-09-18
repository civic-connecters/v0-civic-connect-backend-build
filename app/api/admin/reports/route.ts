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
    const reportType = searchParams.get("type") || "summary"
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")

    let dateFilter = ""
    if (startDate && endDate) {
      dateFilter = `created_at.gte.${startDate},created_at.lte.${endDate}`
    }

    switch (reportType) {
      case "user_engagement": {
        const { data: userStats } = await supabase
          .from("user_profiles")
          .select(`
            user_id,
            full_name,
            created_at,
            civic_issues!civic_issues_user_id_fkey(id),
            issue_comments!issue_comments_user_id_fkey(id),
            issue_votes!issue_votes_user_id_fkey(id),
            community_events!community_events_organizer_id_fkey(id)
          `)
          .limit(100)

        const transformedStats = userStats?.map((user) => ({
          userId: user.user_id,
          fullName: user.full_name,
          joinDate: user.created_at,
          issuesCreated: user.civic_issues?.length || 0,
          commentsPosted: user.issue_comments?.length || 0,
          votesGiven: user.issue_votes?.length || 0,
          eventsOrganized: user.community_events?.length || 0,
        }))

        return NextResponse.json({ userEngagement: transformedStats })
      }

      case "issue_analytics": {
        const { data: issueStats } = await supabase.from("civic_issues").select(`
          category,
          status,
          priority,
          created_at,
          votes:issue_votes(vote_type),
          comments:issue_comments(id)
        `)

        const analytics = {
          categoryBreakdown: {},
          statusBreakdown: {},
          priorityBreakdown: {},
          monthlyTrends: {},
          avgEngagement: 0,
        }

        issueStats?.forEach((issue) => {
          // Category breakdown
          analytics.categoryBreakdown[issue.category] = (analytics.categoryBreakdown[issue.category] || 0) + 1

          // Status breakdown
          analytics.statusBreakdown[issue.status] = (analytics.statusBreakdown[issue.status] || 0) + 1

          // Priority breakdown
          analytics.priorityBreakdown[issue.priority] = (analytics.priorityBreakdown[issue.priority] || 0) + 1

          // Monthly trends
          const month = new Date(issue.created_at).toISOString().slice(0, 7)
          analytics.monthlyTrends[month] = (analytics.monthlyTrends[month] || 0) + 1
        })

        return NextResponse.json({ issueAnalytics: analytics })
      }

      default: {
        // Summary report
        const [
          { count: totalUsers },
          { count: totalIssues },
          { count: totalEvents },
          { count: totalComments },
          { count: totalVotes },
        ] = await Promise.all([
          supabase.from("user_profiles").select("*", { count: "exact", head: true }),
          supabase.from("civic_issues").select("*", { count: "exact", head: true }),
          supabase.from("community_events").select("*", { count: "exact", head: true }),
          supabase.from("issue_comments").select("*", { count: "exact", head: true }),
          supabase.from("issue_votes").select("*", { count: "exact", head: true }),
        ])

        return NextResponse.json({
          summary: {
            totalUsers: totalUsers || 0,
            totalIssues: totalIssues || 0,
            totalEvents: totalEvents || 0,
            totalComments: totalComments || 0,
            totalVotes: totalVotes || 0,
            generatedAt: new Date().toISOString(),
          },
        })
      }
    }
  } catch (error) {
    console.error("Admin reports error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
