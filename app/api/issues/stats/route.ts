import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Get total issues count
    const { count: totalIssues } = await supabase.from("civic_issues").select("*", { count: "exact", head: true })

    // Get issues by status
    const { data: statusStats } = await supabase
      .from("civic_issues")
      .select("status")
      .then(({ data }) => {
        const stats = data?.reduce((acc: any, issue) => {
          acc[issue.status] = (acc[issue.status] || 0) + 1
          return acc
        }, {})
        return { data: stats }
      })

    // Get issues by category
    const { data: categoryStats } = await supabase
      .from("civic_issues")
      .select(`
        category_id,
        issue_categories(name)
      `)
      .then(({ data }) => {
        const stats = data?.reduce((acc: any, issue) => {
          const categoryName = issue.issue_categories?.name || "Uncategorized"
          acc[categoryName] = (acc[categoryName] || 0) + 1
          return acc
        }, {})
        return { data: stats }
      })

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { count: recentIssues } = await supabase
      .from("civic_issues")
      .select("*", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo.toISOString())

    return NextResponse.json({
      totalIssues: totalIssues || 0,
      recentIssues: recentIssues || 0,
      statusStats: statusStats || {},
      categoryStats: categoryStats || {},
    })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
