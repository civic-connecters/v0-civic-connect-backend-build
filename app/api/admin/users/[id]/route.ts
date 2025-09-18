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

    const { role, is_active } = await request.json()
    const userId = params.id

    const updateData: any = {}
    if (role !== undefined) updateData.role = role
    if (is_active !== undefined) updateData.is_active = is_active

    const { data: updatedUser, error } = await supabase
      .from("user_profiles")
      .update(updateData)
      .eq("user_id", userId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
    }

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error("Admin user update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

    const userId = params.id

    // Soft delete by deactivating the user
    const { error } = await supabase.from("user_profiles").update({ is_active: false }).eq("user_id", userId)

    if (error) {
      return NextResponse.json({ error: "Failed to deactivate user" }, { status: 500 })
    }

    return NextResponse.json({ message: "User deactivated successfully" })
  } catch (error) {
    console.error("Admin user delete error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
