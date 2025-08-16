"use client"

import type React from "react"

import { cn } from "@/lib/utils"

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>

export function Skeleton({ className, ...props }: SkeletonProps) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />
}

export function TaskItemSkeleton() {
  return (
    <div className="p-4 bg-card rounded-lg border border-border">
      <div className="flex items-start gap-3">
        <Skeleton className="h-4 w-4 rounded mt-1" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-8 w-8 rounded" />
      </div>
    </div>
  )
}

export function MetricCardSkeleton() {
  return (
    <div className="p-6 bg-card rounded-lg border border-border">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 w-5 rounded" />
      </div>
      <div className="flex items-baseline justify-between">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-6 w-12 rounded-full" />
      </div>
      <Skeleton className="h-3 w-24 mt-2" />
    </div>
  )
}
