"use client"

import { isPro } from "@/lib/utils/env"

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 text-2xl font-bold">{`TaskTrove${isPro() ? " Pro" : ""}`}</h1>
        <p className="text-muted-foreground">Redirecting to your tasks...</p>
      </div>
    </div>
  )
}
