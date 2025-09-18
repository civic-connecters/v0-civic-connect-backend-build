"use client"

import { useEffect, useState } from "react"
import { apiClient, type Issue, type Event, type UserProfile } from "./client"
import { useAuth } from "@/components/auth/auth-provider"

export function useIssues(params?: {
  category?: string
  status?: string
  priority?: string
  search?: string
  page?: number
  limit?: number
}) {
  const [data, setData] = useState<{ issues: Issue[]; total: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchIssues = async () => {
      setLoading(true)
      const response = await apiClient.getIssues(params)

      if (response.success) {
        setData(response.data!)
        setError(null)
      } else {
        setError(response.error!)
      }

      setLoading(false)
    }

    fetchIssues()
  }, [JSON.stringify(params)])

  return { data, loading, error, refetch: () => setLoading(true) }
}

export function useIssue(id: string) {
  const [data, setData] = useState<Issue | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchIssue = async () => {
      setLoading(true)
      const response = await apiClient.getIssue(id)

      if (response.success) {
        setData(response.data!)
        setError(null)
      } else {
        setError(response.error!)
      }

      setLoading(false)
    }

    if (id) {
      fetchIssue()
    }
  }, [id])

  return { data, loading, error, refetch: () => setLoading(true) }
}

export function useEvents(params?: {
  upcoming?: boolean
  search?: string
  page?: number
  limit?: number
}) {
  const [data, setData] = useState<{ events: Event[]; total: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true)
      const response = await apiClient.getEvents(params)

      if (response.success) {
        setData(response.data!)
        setError(null)
      } else {
        setError(response.error!)
      }

      setLoading(false)
    }

    fetchEvents()
  }, [JSON.stringify(params)])

  return { data, loading, error, refetch: () => setLoading(true) }
}

export function useProfile(id?: string) {
  const { user } = useAuth()
  const [data, setData] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user && !id) {
        setLoading(false)
        return
      }

      setLoading(true)
      const response = await apiClient.getProfile(id)

      if (response.success) {
        setData(response.data!)
        setError(null)
      } else {
        setError(response.error!)
      }

      setLoading(false)
    }

    fetchProfile()
  }, [user, id])

  return { data, loading, error, refetch: () => setLoading(true) }
}

export function useNotifications() {
  const { user } = useAuth()
  const [data, setData] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      setLoading(true)
      const response = await apiClient.getNotifications()

      if (response.success) {
        setData(response.data!)
        setError(null)
      } else {
        setError(response.error!)
      }

      setLoading(false)
    }

    fetchNotifications()
  }, [user])

  const markAsRead = async (id: string) => {
    await apiClient.markNotificationRead(id)
    // Refetch notifications
    setLoading(true)
  }

  const markAllAsRead = async () => {
    await apiClient.markAllNotificationsRead()
    // Refetch notifications
    setLoading(true)
  }

  return { data, loading, error, markAsRead, markAllAsRead }
}

// Mutation hooks for actions
export function useCreateIssue() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createIssue = async (issue: Parameters<typeof apiClient.createIssue>[0]) => {
    setLoading(true)
    setError(null)

    const response = await apiClient.createIssue(issue)

    if (!response.success) {
      setError(response.error!)
    }

    setLoading(false)
    return response
  }

  return { createIssue, loading, error }
}

export function useVoteOnIssue() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const vote = async (id: string, voteType: "up" | "down") => {
    setLoading(true)
    setError(null)

    const response = await apiClient.voteOnIssue(id, voteType)

    if (!response.success) {
      setError(response.error!)
    }

    setLoading(false)
    return response
  }

  return { vote, loading, error }
}

export function useAttendEvent() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const attend = async (id: string) => {
    setLoading(true)
    setError(null)

    const response = await apiClient.attendEvent(id)

    if (!response.success) {
      setError(response.error!)
    }

    setLoading(false)
    return response
  }

  return { attend, loading, error }
}
