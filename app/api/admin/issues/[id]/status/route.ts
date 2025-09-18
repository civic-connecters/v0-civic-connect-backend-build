import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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

    const { status, admin_notes } = await request.json()
    const issueId = params.id

    if (!["open", "in_progress", "resolved", "closed"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    const updateData: any = { status }
    if (admin_notes) updateData.admin_notes = admin_notes

    const { data: updatedIssue, error } = await supabase
      .from("civic_issues")
      .update(updateData)
      .eq("id", issueId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: "Failed to update issue status" }, { status: 500 })
    }

    // Create notification for issue creator
    if (updatedIssue) {
      await supabase.from("notifications").insert({
        user_id: updatedIssue.user_id,
        type: "issue_status_update",
        title: "Issue Status Updated",
        message: `Your issue "${updatedIssue.title}" status has been updated to ${status}`,
        related_id: issueId,
      })
    }

    return NextResponse.json(updatedIssue)
  } catch (error) {
    console.error("Admin issue status update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
