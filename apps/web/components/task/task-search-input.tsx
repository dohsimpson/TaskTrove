"use client"

import { useState, useRef, useEffect } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { currentViewStateAtom, setSearchQueryAtom } from "@/lib/atoms/ui/views"
import { Input } from "@/components/ui/input"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface TaskSearchInputProps {
  className?: string
  placeholder?: string
  "data-testid"?: string
}

export function TaskSearchInput({
  className,
  placeholder = "Search tasks...",
  "data-testid": dataTestId,
}: TaskSearchInputProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const currentViewState = useAtomValue(currentViewStateAtom)
  const setSearchQuery = useSetAtom(setSearchQueryAtom)

  // Auto-open when there's a search query
  useEffect(() => {
    if (currentViewState.searchQuery) {
      setIsSearchOpen(true)
    }
  }, [currentViewState.searchQuery])

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isSearchOpen])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchInputRef.current &&
        e.target instanceof Node &&
        !searchInputRef.current.contains(e.target)
      ) {
        // Only close if there's no search query
        if (!currentViewState.searchQuery) {
          setIsSearchOpen(false)
        }
      }
    }

    if (isSearchOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isSearchOpen, currentViewState.searchQuery])

  const handleClearSearch = () => {
    setSearchQuery("")
    setIsSearchOpen(false)
  }

  return (
    <div
      className={cn(
        "relative h-9 rounded-md transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
        "overflow-hidden cursor-pointer",
        isSearchOpen
          ? "w-64 bg-transparent border-1 border-foreground/20"
          : "w-9 bg-transparent hover:bg-accent/60 border border-transparent",
        className,
      )}
      onClick={() => !isSearchOpen && setIsSearchOpen(true)}
      data-testid={dataTestId}
    >
      {/* Search Icon */}
      <Search
        className={cn(
          "absolute top-1/2 -translate-y-1/2 h-4 w-4 z-10",
          "transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          isSearchOpen ? "left-3 text-muted-foreground" : "left-[10px] text-foreground",
        )}
      />

      {/* Input Field */}
      <Input
        ref={searchInputRef}
        placeholder={placeholder}
        value={currentViewState.searchQuery || ""}
        onChange={(e) => setSearchQuery(e.target.value)}
        className={cn(
          "absolute inset-0 h-9 border-0 bg-transparent pl-10",
          currentViewState.searchQuery ? "pr-10" : "pr-4",
          "transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-hidden",
          "placeholder:text-muted-foreground text-sm",
          "text-foreground font-medium",
          isSearchOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        onBlur={() => {
          if (!currentViewState.searchQuery) {
            setIsSearchOpen(false)
          }
        }}
      />

      {/* Clear Button */}
      {currentViewState.searchQuery && isSearchOpen && (
        <button
          onClick={handleClearSearch}
          className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 z-10",
            "text-muted-foreground hover:text-foreground",
            "transition-colors duration-200 cursor-pointer",
            "flex items-center justify-center",
          )}
          aria-label="Clear search"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}
