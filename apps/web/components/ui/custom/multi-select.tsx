"use client"

import * as React from "react"
import { Check, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface MultiSelectOption<T = string> {
  value: T
  label: string
}

interface MultiSelectMenuProps<T = string> {
  options: MultiSelectOption<T>[]
  value: T[]
  onValueChange: (value: T[]) => void
  className?: string
}

interface MultiSelectProps<T = string> {
  options: MultiSelectOption<T>[]
  value: T[]
  onValueChange: (value: T[]) => void
  placeholder?: string
  className?: string
  size?: "sm" | "default"
  maxDisplay?: number // Max items to display before showing count
}

/**
 * Menu component that displays multi-select options with checkboxes.
 * Can be used standalone or within a Popover.
 */
export function MultiSelectMenu<T = string>({
  options,
  value,
  onValueChange,
  className,
}: MultiSelectMenuProps<T>) {
  const toggleOption = (optionValue: T) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue]
    onValueChange(newValue)
  }

  return (
    <div className={cn("max-h-60 overflow-auto", className)}>
      {options.map((option) => {
        const isSelected = value.includes(option.value)
        return (
          <div
            key={String(option.value)}
            className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
            onClick={() => toggleOption(option.value)}
          >
            <div
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded border",
                isSelected ? "bg-primary text-primary-foreground border-primary" : "border-input",
              )}
            >
              {isSelected && <Check className="h-3 w-3" />}
            </div>
            <span className="flex-1">{option.label}</span>
          </div>
        )
      })}
    </div>
  )
}

export function MultiSelect<T = string>({
  options,
  value,
  onValueChange,
  placeholder = "Select options...",
  className,
  size = "default",
  maxDisplay = 2,
}: MultiSelectProps<T>) {
  const [open, setOpen] = React.useState(false)

  const getDisplayText = () => {
    if (value.length === 0) return placeholder

    const selectedOptions = options.filter((option) => value.includes(option.value))

    if (selectedOptions.length <= maxDisplay) {
      return selectedOptions.map((option) => option.label).join(", ")
    }

    return `${selectedOptions.length} selected`
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between bg-transparent hover:bg-transparent focus:bg-transparent",
            size === "sm" && "h-8 text-sm",
            size === "default" && "h-9",
            className,
          )}
        >
          <span className="truncate text-left flex-1">{getDisplayText()}</span>
          <div className="flex items-center gap-1">
            <ChevronDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <MultiSelectMenu options={options} value={value} onValueChange={onValueChange} />
      </PopoverContent>
    </Popover>
  )
}
