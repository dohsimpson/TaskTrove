"use client"

import React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface SimpleInputDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  buttonText?: string
}

export function SimpleInputDialog({
  open,
  onOpenChange,
  title,
  placeholder = "Enter text...",
  value,
  onChange,
  onSubmit,
  buttonText = "Add",
}: SimpleInputDialogProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      onSubmit()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <Button onClick={onSubmit} disabled={!value.trim()} size="sm">
            {buttonText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
