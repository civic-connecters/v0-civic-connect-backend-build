"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/components/auth/auth-provider"
import Link from "next/link"

export default function HomePage() {
  const { user, loading } = useAuth()
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [apiTests, setApiTests] = useState<Record<string, any>>({})

  console.log("[v0] HomePage rendered, user:", user?.email || "not logged in")

  useEffect(() => {
    const collectDebugInfo = async () => {
      console.log("[v0] Collecting debug information...")

      const info = {
        environment: {
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Set" : "❌ Missing",
          supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ Set" : "❌ Missing",
          groqKey: "Check server logs",
        },
        user: user
          ? {
              id: user.id,
              email: user.email,
              authenticated: "✅ Yes",
            }
          : {
              authenticated: "❌ No",
            },
        timestamp: new Date().toISOString(),
      }

      setDebugInfo(info)
      console.log("[v0] Debug info collected:", info)
    }

    collectDebugInfo()
  }, [user])

  const testApiEndpoint = async (endpoint: string, method = "GET") => {
    console.log(`[v0] Testing API endpoint: ${method} ${endpoint}`)

    try {
      const response = await fetch(`/api${endpoint}`, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()
      const result = {
        status: response.status,
        success: response.ok,
        data: response.ok ? data : null,
        error: !response.ok ? data.error || "Unknown error" : null,
        timestamp: new Date().toISOString(),
      }

      setApiTests((prev) => ({
        ...prev,
        [endpoint]: result,
      }))

      console.log(`[v0] API test result for ${endpoint}:`, result)
      return result
    } catch (error) {
      const result = {
        status: 0,
        success: false,
        error: error instanceof Error ? error.message : "Network error",
        timestamp: new Date().toISOString(),
      }

      setApiTests((prev) => ({
        ...prev,
        [endpoint]: result,
      }))

      console.log(`[v0] API test error for ${endpoint}:`, result)
      return result
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">CivicConnect Platform</h1>
          <p className="text-xl text-muted-foreground mb-6">Debug Dashboard & API Testing</p>

          {user ? (
            <Badge variant="default" className="mb-4">
              Logged in as: {user.email}
            </Badge>
          ) : (
            <Badge variant="secondary" className="mb-4">
              Not authenticated
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Environment Status */}
          <Card>
            <CardHeader>
              <CardTitle>Environment Status</CardTitle>
              <CardDescription>Configuration check</CardDescription>
            </CardHeader>
            <CardContent>
              {debugInfo ? (
                <div className="space-y-2">
                  <div>Supabase URL: {debugInfo.environment.supabaseUrl}</div>
                  <div>Supabase Key: {debugInfo.environment.supabaseKey}</div>
                  <div>Groq Key: {debugInfo.environment.groqKey}</div>
                </div>
              ) : (
                <div>Loading...</div>
              )}
            </CardContent>
          </Card>

          {/* Authentication Status */}
          <Card>
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
              <CardDescription>User session info</CardDescription>
            </CardHeader>
            <CardContent>
              {user ? (
                <div className="space-y-2">
                  <div>Status: ✅ Authenticated</div>
                  <div>Email: {user.email}</div>
                  <div>ID: {user.id.substring(0, 8)}...</div>
                  <Link href="/auth/login">
                    <Button variant="outline" size="sm" className="mt-2 bg-transparent">
                      Switch Account
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  <div>Status: ❌ Not authenticated</div>
                  <Link href="/auth/login">
                    <Button size="sm">Login</Button>
                  </Link>
                  <Link href="/auth/signup">
                    <Button variant="outline" size="sm" className="ml-2 bg-transparent">
                      Sign Up
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* API Testing */}
          <Card>
            <CardHeader>
              <CardTitle>API Testing</CardTitle>
              <CardDescription>Test backend endpoints</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button size="sm" variant="outline" onClick={() => testApiEndpoint("/issues")} className="w-full">
                  Test Issues API
                </Button>
                <Button size="sm" variant="outline" onClick={() => testApiEndpoint("/events")} className="w-full">
                  Test Events API
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => testApiEndpoint("/profiles")}
                  className="w-full"
                  disabled={!user}
                >
                  Test Profile API
                </Button>
                {user && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => testApiEndpoint("/admin/dashboard")}
                    className="w-full"
                  >
                    Test Admin API
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* API Test Results */}
        {Object.keys(apiTests).length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>API Test Results</CardTitle>
              <CardDescription>Latest endpoint test results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(apiTests).map(([endpoint, result]) => (
                  <div key={endpoint} className="border rounded p-4">
                    <div className="flex items-center justify-between mb-2">
                      <code className="text-sm font-mono">{endpoint}</code>
                      <Badge variant={result.success ? "default" : "destructive"}>{result.status}</Badge>
                    </div>
                    {result.success ? (
                      <div className="text-sm text-green-600">
                        ✅ Success: {JSON.stringify(result.data).substring(0, 100)}...
                      </div>
                    ) : (
                      <div className="text-sm text-red-600">❌ Error: {result.error}</div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">{result.timestamp}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Links */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Quick Navigation</CardTitle>
            <CardDescription>Access different parts of the application</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/auth/login">
                <Button variant="outline" className="w-full bg-transparent">
                  Login
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button variant="outline" className="w-full bg-transparent">
                  Sign Up
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" className="w-full bg-transparent" disabled={!user}>
                  Dashboard
                </Button>
              </Link>
              <Button variant="outline" className="w-full bg-transparent" onClick={() => window.location.reload()}>
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
