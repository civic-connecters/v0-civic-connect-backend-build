"use client"

import { useIssues, useVoteOnIssue } from "@/lib/api/hooks"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronUp, ChevronDown, MessageCircle, MapPin } from "lucide-react"
import { useState } from "react"

export function IssueList() {
  const [filters, setFilters] = useState({
    category: "",
    status: "",
    priority: "",
    search: "",
  })

  const { data, loading, error } = useIssues(filters)
  const { vote, loading: voteLoading } = useVoteOnIssue()

  const handleVote = async (issueId: string, voteType: "up" | "down") => {
    const response = await vote(issueId, voteType)
    if (response.success) {
      // Optionally trigger a refetch or update local state
      window.location.reload() // Simple approach - you might want to use a more sophisticated state management
    }
  }

  if (loading) return <div>Loading issues...</div>
  if (error) return <div>Error: {error}</div>
  if (!data) return <div>No issues found</div>

  return (
    <div className="space-y-4">
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Search issues..."
          className="flex-1 px-3 py-2 border rounded-md"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <select
          className="px-3 py-2 border rounded-md"
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        >
          <option value="">All Categories</option>
          <option value="infrastructure">Infrastructure</option>
          <option value="safety">Safety</option>
          <option value="environment">Environment</option>
          <option value="transportation">Transportation</option>
        </select>
      </div>

      {data.issues.map((issue) => (
        <Card key={issue.id} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-lg mb-2">{issue.title}</CardTitle>
                <p className="text-gray-600 text-sm mb-3">{issue.description}</p>

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  {issue.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {issue.location}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" />
                    {issue.comment_count} comments
                  </div>
                  <span>{new Date(issue.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <Badge variant={issue.priority === "urgent" ? "destructive" : "secondary"}>{issue.priority}</Badge>
                <Badge variant={issue.status === "resolved" ? "default" : "outline"}>{issue.status}</Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleVote(issue.id, "up")}
                  disabled={voteLoading}
                  className="flex items-center gap-1"
                >
                  <ChevronUp className="w-4 h-4" />
                  {issue.vote_count}
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleVote(issue.id, "down")} disabled={voteLoading}>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>

              <Button variant="outline" size="sm">
                View Details
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {data.issues.length === 0 && (
        <div className="text-center py-8 text-gray-500">No issues found matching your criteria.</div>
      )}
    </div>
  )
}
