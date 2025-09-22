"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface AddSectionDividerProps {
  onAddSection: (position?: number) => void
  position?: number
  className?: string
}

export function AddSectionDivider({ onAddSection, position, className }: AddSectionDividerProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className={cn(
        "relative h-6 flex items-center justify-center group cursor-pointer",
        className,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onAddSection(position)}
    >
      {/* Base line */}
      <div className="absolute inset-x-0 h-px bg-border transition-colors group-hover:bg-primary/30" />

      {/* Hover state: thicker line with add button */}
      {isHovered && <div className="absolute inset-x-0 h-0.5 bg-primary/60" />}

      {/* Add button that appears on hover */}
      {isHovered && (
        <div className="absolute flex items-center gap-2 px-3 py-1 bg-background border border-primary/60 rounded-full text-sm text-primary">
          <Plus className="h-3 w-3" />
          <span className="font-medium">Add section</span>
        </div>
      )}
    </div>
  )
}
