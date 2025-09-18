import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>
}) {
  const params = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-red-600">Authentication Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="bg-red-50 p-4 rounded-lg">
              {params?.error ? (
                <p className="text-sm text-red-700">Error: {params.error}</p>
              ) : (
                <p className="text-sm text-red-700">An authentication error occurred. Please try again.</p>
              )}
            </div>
            <Link href="/auth/login">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">Back to Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
