"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Loader2, LogIn, UserPlus } from "lucide-react"

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (user) {
    return null // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Welcome</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one to get started.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sign In Button */}
            <Button
              onClick={() => router.push("/login")}
              className="w-full flex items-center gap-2"
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </Button>

            {/* Create Account Button */}
            <Button
              onClick={() => router.push("/register")}
              variant="outline"
              className="w-full flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Create Account
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
