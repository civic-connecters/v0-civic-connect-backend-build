import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get event with related data
    const { data: event, error } = await supabase
      .from("community_events")
      .select(`
        *,
        profiles!community_events_organizer_id_fkey(first_name, last_name, display_name, avatar_url),
        event_attendees(
          id,
          status,
          created_at,
          profiles(first_name, last_name, display_name, avatar_url)
        )
      `)
      .eq("id", id)
      .single()

    if (error) {
      console.error("Error fetching event:", error)
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    return NextResponse.json({ event })
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

    // Check if user is the organizer
    const { data: existingEvent } = await supabase.from("community_events").select("organizer_id").eq("id", id).single()

    if (!existingEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    if (existingEvent.organizer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const {
      title,
      description,
      event_date,
      location_address,
      latitude,
      longitude,
      max_attendees,
      is_public,
      image_url,
    } = body

    // Validate event date if provided
    if (event_date && new Date(event_date) <= new Date()) {
      return NextResponse.json({ error: "Event date must be in the future" }, { status: 400 })
    }

    // Update the event
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (event_date !== undefined) updateData.event_date = event_date
    if (location_address !== undefined) updateData.location_address = location_address
    if (latitude !== undefined) updateData.latitude = latitude
    if (longitude !== undefined) updateData.longitude = longitude
    if (max_attendees !== undefined) updateData.max_attendees = max_attendees
    if (is_public !== undefined) updateData.is_public = is_public
    if (image_url !== undefined) updateData.image_url = image_url

    const { data: event, error } = await supabase
      .from("community_events")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        profiles!community_events_organizer_id_fkey(first_name, last_name, display_name, avatar_url)
      `)
      .single()

    if (error) {
      console.error("Error updating event:", error)
      return NextResponse.json({ error: "Failed to update event" }, { status: 500 })
    }

    return NextResponse.json({ event })
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

    // Check if user is the organizer
    const { data: existingEvent } = await supabase.from("community_events").select("organizer_id").eq("id", id).single()

    if (!existingEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    if (existingEvent.organizer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Delete the event
    const { error } = await supabase.from("community_events").delete().eq("id", id)

    if (error) {
      console.error("Error deleting event:", error)
      return NextResponse.json({ error: "Failed to delete event" }, { status: 500 })
    }

    return NextResponse.json({ message: "Event deleted successfully" })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
