import { createClient } from "@/lib/supabase/client"

export interface ApiResponse<T = any> {
  data?: T
  error?: string
  success: boolean
}

export interface Issue {
  id: string
  title: string
  description: string
  category: string
  priority: "low" | "medium" | "high" | "urgent"
  status: "open" | "in_progress" | "resolved" | "closed"
  location?: string
  created_at: string
  updated_at: string
  user_id: string
  vote_count: number
  comment_count: number
}

export interface Event {
  id: string
  title: string
  description: string
  date: string
  location: string
  max_attendees?: number
  attendee_count: number
  created_at: string
  organizer_id: string
}

export interface UserProfile {
  id: string
  first_name: string
  last_name: string
  email: string
  bio?: string
  location?: string
  role: "user" | "admin"
  created_at: string
}

class ApiClient {
  private supabase = createClient()

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession()

      const response = await fetch(`/api${endpoint}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token && {
            Authorization: `Bearer ${session.access_token}`,
          }),
          ...options.headers,
        },
      })

      const result = await response.json()

      if (!response.ok) {
        return { success: false, error: result.error || "Request failed" }
      }

      return { success: true, data: result }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      }
    }
  }

  // Issues API
  async getIssues(params?: {
    category?: string
    status?: string
    priority?: string
    search?: string
    page?: number
    limit?: number
  }): Promise<ApiResponse<{ issues: Issue[]; total: number }>> {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString())
        }
      })
    }

    return this.makeRequest(`/issues?${searchParams.toString()}`)
  }

  async getIssue(id: string): Promise<ApiResponse<Issue>> {
    return this.makeRequest(`/issues/${id}`)
  }

  async createIssue(
    issue: Omit<Issue, "id" | "created_at" | "updated_at" | "user_id" | "vote_count" | "comment_count">,
  ): Promise<ApiResponse<Issue>> {
    return this.makeRequest("/issues", {
      method: "POST",
      body: JSON.stringify(issue),
    })
  }

  async updateIssue(id: string, updates: Partial<Issue>): Promise<ApiResponse<Issue>> {
    return this.makeRequest(`/issues/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    })
  }

  async voteOnIssue(id: string, voteType: "up" | "down"): Promise<ApiResponse<{ vote_count: number }>> {
    return this.makeRequest(`/issues/${id}/vote`, {
      method: "POST",
      body: JSON.stringify({ vote_type: voteType }),
    })
  }

  async getIssueComments(id: string): Promise<ApiResponse<any[]>> {
    return this.makeRequest(`/issues/${id}/comments`)
  }

  async addIssueComment(id: string, content: string): Promise<ApiResponse<any>> {
    return this.makeRequest(`/issues/${id}/comments`, {
      method: "POST",
      body: JSON.stringify({ content }),
    })
  }

  // Events API
  async getEvents(params?: {
    upcoming?: boolean
    search?: string
    page?: number
    limit?: number
  }): Promise<ApiResponse<{ events: Event[]; total: number }>> {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString())
        }
      })
    }

    return this.makeRequest(`/events?${searchParams.toString()}`)
  }

  async getEvent(id: string): Promise<ApiResponse<Event>> {
    return this.makeRequest(`/events/${id}`)
  }

  async createEvent(
    event: Omit<Event, "id" | "created_at" | "organizer_id" | "attendee_count">,
  ): Promise<ApiResponse<Event>> {
    return this.makeRequest("/events", {
      method: "POST",
      body: JSON.stringify(event),
    })
  }

  async attendEvent(id: string): Promise<ApiResponse<{ attending: boolean }>> {
    return this.makeRequest(`/events/${id}/attend`, {
      method: "POST",
    })
  }

  // Profile API
  async getProfile(id?: string): Promise<ApiResponse<UserProfile>> {
    const endpoint = id ? `/profiles/${id}` : "/profiles"
    return this.makeRequest(endpoint)
  }

  async updateProfile(updates: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
    return this.makeRequest("/profiles", {
      method: "PUT",
      body: JSON.stringify(updates),
    })
  }

  // Notifications API
  async getNotifications(): Promise<ApiResponse<any[]>> {
    return this.makeRequest("/notifications")
  }

  async markNotificationRead(id: string): Promise<ApiResponse<void>> {
    return this.makeRequest(`/notifications/${id}/read`, {
      method: "POST",
    })
  }

  async markAllNotificationsRead(): Promise<ApiResponse<void>> {
    return this.makeRequest("/notifications/mark-all-read", {
      method: "POST",
    })
  }

  // AI API
  async categorizeIssue(
    title: string,
    description: string,
  ): Promise<ApiResponse<{ category: string; confidence: number }>> {
    return this.makeRequest("/ai/categorize", {
      method: "POST",
      body: JSON.stringify({ title, description }),
    })
  }

  async getSuggestedSolutions(issueId: string): Promise<ApiResponse<{ solutions: string[] }>> {
    return this.makeRequest("/ai/solutions", {
      method: "POST",
      body: JSON.stringify({ issue_id: issueId }),
    })
  }

  // Admin API (requires admin role)
  async getAdminDashboard(): Promise<ApiResponse<any>> {
    return this.makeRequest("/admin/dashboard")
  }

  async getAdminUsers(params?: {
    search?: string
    role?: string
    page?: number
    limit?: number
  }): Promise<ApiResponse<{ users: UserProfile[]; total: number }>> {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString())
        }
      })
    }

    return this.makeRequest(`/admin/users?${searchParams.toString()}`)
  }

  async updateUserRole(userId: string, role: "user" | "admin"): Promise<ApiResponse<UserProfile>> {
    return this.makeRequest(`/admin/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    })
  }

  async updateIssueStatus(issueId: string, status: Issue["status"]): Promise<ApiResponse<Issue>> {
    return this.makeRequest(`/admin/issues/${issueId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    })
  }
}

export const apiClient = new ApiClient()
