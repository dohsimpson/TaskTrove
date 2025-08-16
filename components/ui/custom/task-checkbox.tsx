"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function TaskCheckbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="task-checkbox"
      className={cn(
        // Base styles with transparent background
        "peer cursor-pointer flex-shrink-0 size-5 rounded-full transition-all duration-200 outline-none",
        // Border and hover states - themeable colors
        "border-2 border-muted-foreground/70 hover:border-primary hover:bg-accent/30",
        // Checked state - semi-transparent background with visible check
        "data-[state=checked]:bg-primary/30 data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground",
        // Focus states
        "focus-visible:ring-2 focus-visible:ring-ring/50",
        // Disabled state
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="task-checkbox-indicator"
        className="flex items-center justify-center text-primary transition-none"
      >
        <CheckIcon className="size-3.5 stroke-[2.5]" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { TaskCheckbox }
