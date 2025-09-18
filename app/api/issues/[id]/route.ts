import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Increment view count
    await supabase
      .from("civic_issues")
      .update({ view_count: supabase.raw("view_count + 1") })
      .eq("id", id)

    // Get issue with related data
    const { data: issue, error } = await supabase
      .from("civic_issues")
      .select(`
        *,
        issue_categories(name, icon, color),
        profiles!civic_issues_reporter_id_fkey(first_name, last_name, display_name, avatar_url),
        profiles!civic_issues_assigned_to_fkey(first_name, last_name, display_name, avatar_url)
      `)
      .eq("id", id)
      .single()

    if (error) {
      console.error("Error fetching issue:", error)
      return NextResponse.json({ error: "Issue not found" }, { status: 404 })
    }

    return NextResponse.json({ issue })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const { title, description, category_id, priority, status, location_address, latitude, longitude, image_urls } =
      body

    // Check if user owns the issue or is admin
    const { data: existingIssue } = await supabase.from("civic_issues").select("reporter_id").eq("id", id).single()

    if (!existingIssue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 })
    }

    // Check permissions (owner or admin)
    const isOwner = existingIssue.reporter_id === user.id
    const { data: adminRole } = await supabase
      .from("user_admin_roles")
      .select("admin_roles(permissions)")
      .eq("user_id", user.id)
      .single()

    const isAdmin = adminRole?.admin_roles?.permissions?.includes("manage_issues")

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Update the issue
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (category_id !== undefined) updateData.category_id = category_id
    if (priority !== undefined) updateData.priority = priority
    if (status !== undefined) updateData.status = status
    if (location_address !== undefined) updateData.location_address = location_address
    if (latitude !== undefined) updateData.latitude = latitude
    if (longitude !== undefined) updateData.longitude = longitude
    if (image_urls !== undefined) updateData.image_urls = image_urls

    const { data: issue, error } = await supabase
      .from("civic_issues")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        issue_categories(name, icon, color),
        profiles!civic_issues_reporter_id_fkey(first_name, last_name, display_name)
      `)
      .single()

    if (error) {
      console.error("Error updating issue:", error)
      return NextResponse.json({ error: "Failed to update issue" }, { status: 500 })
    }

    // Create update record if status changed
    if (status && status !== existingIssue.status) {
      await supabase.from("issue_updates").insert({
        issue_id: id,
        updated_by: user.id,
        update_type: "status_change",
        old_value: existingIssue.status,
        new_value: status,
        message: `Status changed from ${existingIssue.status} to ${status}`,
      })
    }

    return NextResponse.json({ issue })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Check if user owns the issue or is admin
    const { data: existingIssue } = await supabase.from("civic_issues").select("reporter_id").eq("id", id).single()

    if (!existingIssue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 })
    }

    const isOwner = existingIssue.reporter_id === user.id
    const { data: adminRole } = await supabase
      .from("user_admin_roles")
      .select("admin_roles(permissions)")
      .eq("user_id", user.id)
      .single()

    const isAdmin = adminRole?.admin_roles?.permissions?.includes("manage_issues")

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Delete the issue
    const { error } = await supabase.from("civic_issues").delete().eq("id", id)

    if (error) {
      console.error("Error deleting issue:", error)
      return NextResponse.json({ error: "Failed to delete issue" }, { status: 500 })
    }

    return NextResponse.json({ message: "Issue deleted successfully" })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
