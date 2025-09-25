import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Home, ArrowLeft } from "lucide-react"

export default function DebugNotFound() {
  return (
    <div className="container mx-auto py-16 px-4 max-w-2xl">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Debug Tools Not Available</CardTitle>
          <CardDescription>
            Debug tools are only available in development environment for security and performance
            reasons.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            This page contains development tools and debugging utilities that are not meant for
            production use.
          </p>
          <div className="flex justify-center gap-4">
            <Button asChild variant="outline">
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Link>
            </Button>
            <Button asChild>
              <Link href="/today">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Tasks
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
