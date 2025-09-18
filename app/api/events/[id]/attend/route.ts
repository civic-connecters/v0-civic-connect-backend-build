import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const { status = "attending" } = body

    if (!["attending", "maybe", "not_attending"].includes(status)) {
      return NextResponse.json({ error: "Invalid attendance status" }, { status: 400 })
    }

    // Check if event exists and has capacity
    const { data: event } = await supabase.from("community_events").select("*").eq("id", id).single()

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    // Check if event is full (only for attending status)
    if (status === "attending" && event.max_attendees && event.current_attendees >= event.max_attendees) {
      return NextResponse.json({ error: "Event is full" }, { status: 400 })
    }

    // Check if user already has attendance record
    const { data: existingAttendance } = await supabase
      .from("event_attendees")
      .select("*")
      .eq("event_id", id)
      .eq("user_id", user.id)
      .single()

    if (existingAttendance) {
      // Update existing attendance
      const { error } = await supabase
        .from("event_attendees")
        .update({ status })
        .eq("event_id", id)
        .eq("user_id", user.id)

      if (error) {
        console.error("Error updating attendance:", error)
        return NextResponse.json({ error: "Failed to update attendance" }, { status: 500 })
      }

      return NextResponse.json({ message: "Attendance updated" })
    } else {
      // Create new attendance record
      const { error } = await supabase.from("event_attendees").insert({
        event_id: id,
        user_id: user.id,
        status,
      })

      if (error) {
        console.error("Error creating attendance:", error)
        return NextResponse.json({ error: "Failed to create attendance" }, { status: 500 })
      }

      return NextResponse.json({ message: "Attendance created" })
    }
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Get user's attendance status for this event
    const { data: attendance } = await supabase
      .from("event_attendees")
      .select("status")
      .eq("event_id", id)
      .eq("user_id", user.id)
      .single()

    return NextResponse.json({ status: attendance?.status || null })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
