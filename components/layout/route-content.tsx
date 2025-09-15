"use client"

import { useAtomValue } from "jotai"
import { pathnameAtom } from "@/lib/atoms/ui/navigation"
import { MainContent } from "@/components/layout/main-content"
import { SearchPage } from "@/components/pages/search-page"
import { Task, VoiceCommand } from "@/lib/types"
// No longer using custom hooks - migrated to Jotai atoms

// Define interfaces for type safety

interface RouteContentProps {
  onVoiceCommand: (command: VoiceCommand) => void
  onTaskClick: (task: Task) => void // Still needed for SearchPage
}

export function RouteContent({ onVoiceCommand, onTaskClick }: RouteContentProps) {
  const pathname = useAtomValue(pathnameAtom)

  // Handle search page
  if (pathname === "/search") {
    return <SearchPage onTaskClick={onTaskClick} />
  }

  // Handle debug page (development only)
  if (pathname === "/debug") {
    // Only show debug page in development environment
    if (process.env.NODE_ENV !== "development") {
      return (
        <div className="container mx-auto py-16 px-4 max-w-2xl">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Debug Tools Not Available</h1>
            <p className="text-muted-foreground">
              Debug tools are only available in development environment for security and performance
              reasons.
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">TaskTrove Debug Tools</h1>
          <p className="text-muted-foreground">
            Development-only debugging and testing utilities. This page is not available in
            production.
          </p>
        </div>

        <div className="text-center text-muted-foreground">
          <p>Debug tools have been simplified in this version.</p>
        </div>
      </div>
    )
  }

  // Handle crash test page (development only)
  if (pathname === "/crash") {
    // Only show crash page in development environment
    if (process.env.NODE_ENV !== "development") {
      return (
        <div className="container mx-auto py-16 px-4 max-w-2xl">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Crash Test Not Available</h1>
            <p className="text-muted-foreground">
              Crash test is only available in development environment.
            </p>
          </div>
        </div>
      )
    }

    // This component will immediately crash to test the error boundary
    const CrashTestComponent = () => {
      throw new Error(
        "Intentional crash to test TaskTrove error boundary - navigate away to recover",
      )
    }

    return <CrashTestComponent />
  }

  return <MainContent onVoiceCommand={onVoiceCommand} />
}
