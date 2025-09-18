import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Query parameters
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const upcoming = searchParams.get("upcoming") === "true"
    const sortBy = searchParams.get("sortBy") || "event_date"
    const sortOrder = searchParams.get("sortOrder") || "asc"

    const offset = (page - 1) * limit

    // Build query
    let query = supabase.from("community_events").select(`
        *,
        profiles!community_events_organizer_id_fkey(first_name, last_name, display_name, avatar_url),
        event_attendees(count)
      `)

    // Filter for upcoming events if requested
    if (upcoming) {
      query = query.gte("event_date", new Date().toISOString())
    }

    // Apply sorting and pagination
    query = query.order(sortBy, { ascending: sortOrder === "asc" })
    query = query.range(offset, offset + limit - 1)

    const { data: events, error, count } = await query

    if (error) {
      console.error("Error fetching events:", error)
      return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 })
    }

    return NextResponse.json({
      events,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
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
    const {
      title,
      description,
      event_date,
      location_address,
      latitude,
      longitude,
      max_attendees,
      is_public = true,
      image_url,
    } = body

    // Validate required fields
    if (!title || !event_date) {
      return NextResponse.json({ error: "Title and event date are required" }, { status: 400 })
    }

    // Validate event date is in the future
    if (new Date(event_date) <= new Date()) {
      return NextResponse.json({ error: "Event date must be in the future" }, { status: 400 })
    }

    // Create the event
    const { data: event, error } = await supabase
      .from("community_events")
      .insert({
        title,
        description,
        organizer_id: user.id,
        event_date,
        location_address,
        latitude,
        longitude,
        max_attendees,
        is_public,
        image_url,
      })
      .select(`
        *,
        profiles!community_events_organizer_id_fkey(first_name, last_name, display_name, avatar_url)
      `)
      .single()

    if (error) {
      console.error("Error creating event:", error)
      return NextResponse.json({ error: "Failed to create event" }, { status: 500 })
    }

    return NextResponse.json({ event }, { status: 201 })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
