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
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="text-center animate-fade-in">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto mb-4"></div>
          <p className="text-primary-foreground font-medium">Loading CivicConnect...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Hero Section */}
      <div className="bg-gradient-hero text-white py-16 mb-8">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-4 animate-fade-in">CivicConnect Platform</h1>
          <p className="text-xl opacity-90 mb-6 animate-slide-up">
            Empowering communities through digital civic engagement
          </p>

          {user ? (
            <Badge variant="secondary" className="animate-scale-in bg-white/20 text-white border-white/30">
              Welcome back, {user.email}
            </Badge>
          ) : (
            <div className="flex gap-4 justify-center animate-slide-up">
              <Link href="/auth/login">
                <Button
                  variant="secondary"
                  size="lg"
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                >
                  Login
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/30 text-white hover:bg-white/10 bg-transparent"
                >
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Environment Status */}
          <Card className="shadow-card hover:shadow-civic transition-all duration-300 animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-float"></div>
                Environment Status
              </CardTitle>
              <CardDescription>Configuration check</CardDescription>
            </CardHeader>
            <CardContent>
              {debugInfo ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Supabase URL:</span>
                    <span
                      className={debugInfo.environment.supabaseUrl.includes("✅") ? "text-success" : "text-destructive"}
                    >
                      {debugInfo.environment.supabaseUrl}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Supabase Key:</span>
                    <span
                      className={debugInfo.environment.supabaseKey.includes("✅") ? "text-success" : "text-destructive"}
                    >
                      {debugInfo.environment.supabaseKey}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Groq Key:</span>
                    <span className="text-warning">{debugInfo.environment.groqKey}</span>
                  </div>
                </div>
              ) : (
                <div className="animate-pulse">Loading configuration...</div>
              )}
            </CardContent>
          </Card>

          {/* Authentication Status */}
          <Card
            className="shadow-card hover:shadow-civic transition-all duration-300 animate-slide-up"
            style={{ animationDelay: "0.1s" }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${user ? "bg-success animate-float" : "bg-destructive"}`}></div>
                Authentication
              </CardTitle>
              <CardDescription>User session info</CardDescription>
            </CardHeader>
            <CardContent>
              {user ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-success">✅ Authenticated</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <div>Email: {user.email}</div>
                    <div>ID: {user.id.substring(0, 8)}...</div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Link href="/dashboard">
                      <Button size="sm" className="bg-gradient-civic hover:opacity-90">
                        Dashboard
                      </Button>
                    </Link>
                    <Link href="/auth/login">
                      <Button variant="outline" size="sm">
                        Switch Account
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-destructive">❌ Not authenticated</span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Link href="/auth/login">
                      <Button size="sm" className="bg-gradient-civic hover:opacity-90">
                        Login
                      </Button>
                    </Link>
                    <Link href="/auth/signup">
                      <Button variant="outline" size="sm">
                        Sign Up
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* API Testing */}
          <Card
            className="shadow-card hover:shadow-civic transition-all duration-300 animate-slide-up"
            style={{ animationDelay: "0.2s" }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-2 h-2 bg-accent rounded-full animate-float" style={{ animationDelay: "1s" }}></div>
                API Testing
              </CardTitle>
              <CardDescription>Test backend endpoints</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => testApiEndpoint("/issues")}
                  className="w-full hover:bg-gradient-subtle transition-all duration-200"
                >
                  Test Issues API
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => testApiEndpoint("/events")}
                  className="w-full hover:bg-gradient-subtle transition-all duration-200"
                >
                  Test Events API
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => testApiEndpoint("/profiles")}
                  className="w-full hover:bg-gradient-subtle transition-all duration-200"
                  disabled={!user}
                >
                  Test Profile API
                </Button>
                {user && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => testApiEndpoint("/admin/dashboard")}
                    className="w-full hover:bg-gradient-subtle transition-all duration-200"
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
          <Card className="mt-8 shadow-floating animate-fade-in">
            <CardHeader>
              <CardTitle>API Test Results</CardTitle>
              <CardDescription>Latest endpoint test results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(apiTests).map(([endpoint, result], index) => (
                  <div
                    key={endpoint}
                    className="border rounded-lg p-4 hover:shadow-card transition-all duration-200 animate-slide-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{endpoint}</code>
                      <Badge
                        variant={result.success ? "default" : "destructive"}
                        className={result.success ? "bg-success text-success-foreground" : ""}
                      >
                        {result.status}
                      </Badge>
                    </div>
                    {result.success ? (
                      <div className="text-sm text-success">
                        ✅ Success: {JSON.stringify(result.data).substring(0, 100)}...
                      </div>
                    ) : (
                      <div className="text-sm text-destructive">❌ Error: {result.error}</div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">{result.timestamp}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Links */}
        <Card className="mt-8 shadow-card animate-fade-in">
          <CardHeader>
            <CardTitle>Quick Navigation</CardTitle>
            <CardDescription>Access different parts of the application</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/auth/login">
                <Button
                  variant="outline"
                  className="w-full hover:bg-gradient-subtle transition-all duration-200 bg-transparent"
                >
                  Login
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button
                  variant="outline"
                  className="w-full hover:bg-gradient-subtle transition-all duration-200 bg-transparent"
                >
                  Sign Up
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  className="w-full hover:bg-gradient-subtle transition-all duration-200 bg-transparent"
                  disabled={!user}
                >
                  Dashboard
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full hover:bg-gradient-subtle transition-all duration-200 bg-transparent"
                onClick={() => window.location.reload()}
              >
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
