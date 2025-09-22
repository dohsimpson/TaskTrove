"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, X, Edit, Calendar, Timer, Mic } from "lucide-react"
import { cn } from "@/lib/utils"

interface FloatingAction {
  id: string
  label: string
  icon: React.ReactNode
  onClick: () => void
  color?: string
}

interface FloatingActionButtonProps {
  actions: FloatingAction[]
  className?: string
}

export function FloatingActionButton({ actions, className }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  const toggleOpen = () => setIsOpen(!isOpen)

  return (
    <div className={cn("fixed bottom-6 right-6 z-50", className)}>
      {/* Action Buttons */}
      <div
        className={cn(
          "flex flex-col-reverse gap-3 mb-3 transition-all duration-300",
          isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none",
        )}
      >
        {actions.map((action, index) => (
          <div
            key={action.id}
            className="flex items-center gap-3"
            style={{
              transitionDelay: isOpen
                ? `${index * 50}ms`
                : `${(actions.length - index - 1) * 50}ms`,
            }}
          >
            <div className="bg-popover text-popover-foreground px-3 py-1 rounded-lg text-sm font-medium shadow-lg">
              {action.label}
            </div>
            <Button
              size="icon"
              className={cn(
                "h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-200",
                "bg-background text-foreground border border-border",
                "hover:scale-110 cursor-pointer",
              )}
              onClick={() => {
                action.onClick()
                setIsOpen(false)
              }}
            >
              {action.icon}
            </Button>
          </div>
        ))}
      </div>

      {/* Main FAB */}
      <Button
        size="icon"
        className={cn(
          "h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300",
          "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer",
          isOpen && "rotate-45",
        )}
        onClick={toggleOpen}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </Button>
    </div>
  )
}

// Example usage
export function TaskTroveFAB({
  onQuickAdd,
  onVoiceAdd,
  onSchedule,
  onStartTimer,
}: {
  onQuickAdd: () => void
  onVoiceAdd: () => void
  onSchedule: () => void
  onStartTimer: () => void
}) {
  const actions: FloatingAction[] = [
    {
      id: "quick-add",
      label: "Quick Add",
      icon: <Edit className="h-5 w-5" />,
      onClick: onQuickAdd,
    },
    {
      id: "voice-add",
      label: "Voice Input",
      icon: <Mic className="h-5 w-5" />,
      onClick: onVoiceAdd,
    },
    {
      id: "schedule",
      label: "Schedule",
      icon: <Calendar className="h-5 w-5" />,
      onClick: onSchedule,
    },
    {
      id: "timer",
      label: "Start Timer",
      icon: <Timer className="h-5 w-5" />,
      onClick: onStartTimer,
    },
  ]

  return <FloatingActionButton actions={actions} />
}
