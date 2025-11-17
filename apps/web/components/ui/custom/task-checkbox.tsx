"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { getPriorityColor } from "@/lib/color-utils"

type TaskCheckboxProps = React.ComponentProps<typeof CheckboxPrimitive.Root> & {
  indicatorClassName?: string
  priority?: number
}

const PRIORITY_CHECKBOX_COLORS: Record<string, { root: string; indicator: string }> = {
  "text-red-500": {
    root: cn(
      "border-red-500",
      "hover:border-red-500",
      "hover:bg-red-500/10",
      "data-[state=checked]:bg-red-500/15",
      "data-[state=checked]:border-red-500",
      "focus-visible:ring-2",
      "focus-visible:ring-red-500/40",
    ),
    indicator: "text-red-500",
  },
  "text-orange-500": {
    root: cn(
      "border-orange-500",
      "hover:border-orange-500",
      "hover:bg-orange-500/10",
      "data-[state=checked]:bg-orange-500/15",
      "data-[state=checked]:border-orange-500",
      "focus-visible:ring-2",
      "focus-visible:ring-orange-500/40",
    ),
    indicator: "text-orange-500",
  },
  "text-blue-500": {
    root: cn(
      "border-blue-500",
      "hover:border-blue-500",
      "hover:bg-blue-500/10",
      "data-[state=checked]:bg-blue-500/15",
      "data-[state=checked]:border-blue-500",
      "focus-visible:ring-2",
      "focus-visible:ring-blue-500/40",
    ),
    indicator: "text-blue-500",
  },
}

const DEFAULT_COLOR_CLASSES = cn(
  "border-muted-foreground/70",
  "hover:border-primary",
  "hover:bg-accent/30",
  "data-[state=checked]:bg-primary/30",
  "data-[state=checked]:border-primary",
  "data-[state=checked]:text-primary-foreground",
  "focus-visible:ring-2",
  "focus-visible:ring-ring/50",
)

function TaskCheckbox({ className, indicatorClassName, priority, ...props }: TaskCheckboxProps) {
  const priorityColorKey = typeof priority === "number" ? getPriorityColor(priority) : undefined
  const priorityClasses = priorityColorKey ? PRIORITY_CHECKBOX_COLORS[priorityColorKey] : undefined

  return (
    <CheckboxPrimitive.Root
      data-slot="task-checkbox"
      className={cn(
        // Base styles with transparent background
        "peer cursor-pointer flex-shrink-0 size-5 rounded-full transition-all duration-200 outline-none",
        // Border width baseline
        "border-2",
        // Color styles - priority aware fallback
        priorityClasses?.root ?? DEFAULT_COLOR_CLASSES,
        // Disabled state
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="task-checkbox-indicator"
        className={cn(
          "flex items-center justify-center text-primary transition-none",
          priorityClasses?.indicator,
          indicatorClassName,
        )}
      >
        <CheckIcon className="size-3.5 stroke-[2.5]" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { TaskCheckbox }
