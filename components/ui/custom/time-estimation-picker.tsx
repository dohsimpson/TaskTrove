"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface TimeEstimationPickerProps {
  value?: number // Time in seconds
  onChange: (seconds: number) => void
  trigger: React.ReactNode
  open?: boolean
  setOpen?: (open: boolean) => void
}

export function TimeEstimationPicker({
  value = 0,
  onChange,
  trigger,
  open,
  setOpen,
}: TimeEstimationPickerProps) {
  // Local state for tracking current selection (not yet committed)
  const [currentSeconds, setCurrentSeconds] = useState(value || 0)
  const [hourInput, setHourInput] = useState("")
  const [minuteInput, setMinuteInput] = useState("")
  const [hourError, setHourError] = useState("")
  const [minuteError, setMinuteError] = useState("")
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null)

  // Preset options in minutes
  const presets = useMemo(
    () => [
      { label: "5min", seconds: 5 * 60 },
      { label: "15min", seconds: 15 * 60 },
      { label: "30min", seconds: 30 * 60 },
      { label: "1h", seconds: 60 * 60 },
      { label: "2h", seconds: 120 * 60 },
      { label: "4h", seconds: 240 * 60 },
    ],
    [],
  )

  // Initialize local state when component opens or value prop changes
  useEffect(() => {
    const seconds = value || 0
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    setCurrentSeconds(seconds)
    setHourInput(h.toString().padStart(2, "0"))
    setMinuteInput(m.toString().padStart(2, "0"))
    setHourError("")
    setMinuteError("")

    // Check if the current value matches any preset
    const matchingPreset = presets.find((preset) => preset.seconds === seconds)
    setSelectedPreset(matchingPreset ? matchingPreset.seconds : null)
  }, [value, open, presets])

  const handlePresetClick = (seconds: number) => {
    setCurrentSeconds(seconds)
    setSelectedPreset(seconds)
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    setHourInput(h.toString().padStart(2, "0"))
    setMinuteInput(m.toString().padStart(2, "0"))
    setHourError("")
    setMinuteError("")
  }

  const validateAndParseHour = (input: string) => {
    const trimmed = input.trim()
    if (trimmed === "") return { value: 0, error: "" }

    const parsed = parseInt(trimmed)
    if (isNaN(parsed)) {
      return { value: 0, error: "Must be a number (0-99)" }
    }

    if (parsed < 0 || parsed > 99) {
      return { value: Math.max(0, Math.min(parsed, 99)), error: "Hours must be between 0-99" }
    }

    return { value: parsed, error: "" }
  }

  const validateAndParseMinute = (input: string) => {
    const trimmed = input.trim()
    if (trimmed === "") return { value: 0, error: "" }

    const parsed = parseInt(trimmed)
    if (isNaN(parsed)) {
      return { value: 0, error: "Must be a number (0-59)" }
    }

    if (parsed < 0 || parsed > 59) {
      return { value: Math.max(0, Math.min(parsed, 59)), error: "Minutes must be between 0-59" }
    }

    return { value: parsed, error: "" }
  }

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    setHourInput(inputValue)
    setSelectedPreset(null) // Clear preset selection when user types

    const { value: hourValue, error } = validateAndParseHour(inputValue)
    setHourError(error)

    // Re-validate minutes
    const { value: minuteValue, error: minuteError } = validateAndParseMinute(minuteInput)
    setMinuteError(minuteError)

    // Update local state only if no errors in both fields
    if (!error && !minuteError) {
      const totalSeconds = hourValue * 3600 + minuteValue * 60
      setCurrentSeconds(totalSeconds)
    }
  }

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    setMinuteInput(inputValue)
    setSelectedPreset(null) // Clear preset selection when user types

    const { value: hourValue } = validateAndParseHour(hourInput)
    const { value: minuteValue, error } = validateAndParseMinute(inputValue)
    setMinuteError(error)

    // Update local state only if no error
    if (!error) {
      const totalSeconds = hourValue * 3600 + minuteValue * 60
      setCurrentSeconds(totalSeconds)
    }
  }

  const handleHourBlur = () => {
    const { value, error } = validateAndParseHour(hourInput)
    if (!error && hourInput.trim() !== "") {
      setHourInput(value.toString().padStart(2, "0"))
    }
  }

  const handleMinuteBlur = () => {
    const { value, error } = validateAndParseMinute(minuteInput)

    if (!error && minuteInput.trim() !== "") {
      setMinuteInput(value.toString().padStart(2, "0"))
    }
  }

  const handleClear = () => {
    setHourInput("00")
    setMinuteInput("00")
    setHourError("")
    setMinuteError("")
    setCurrentSeconds(0)
    setSelectedPreset(null)
    onChange(0)
    setOpen?.(false)
  }

  const handleDone = () => {
    onChange(currentSeconds)
    setOpen?.(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen} defaultOpen={open}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start" asChild>
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Time Estimation</Label>
            <p className="text-xs text-muted-foreground">Choose a preset or set custom time</p>
          </div>

          {/* Quick presets */}
          <div className="grid grid-cols-3 gap-2">
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant={selectedPreset === preset.seconds ? "default" : "outline"}
                size="sm"
                onClick={() => handlePresetClick(preset.seconds)}
                className="h-8"
              >
                {preset.label}
              </Button>
            ))}
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Custom Duration</Label>
            <div className="flex items-center justify-center gap-2">
              <div className="flex flex-col items-center space-y-1">
                <Input
                  type="text"
                  value={hourInput}
                  onChange={handleHourChange}
                  onBlur={handleHourBlur}
                  onFocus={(e) => e.target.select()}
                  className={`w-12 h-10 text-center text-lg font-mono ${
                    hourError ? "border-destructive focus-visible:border-destructive" : ""
                  }`}
                />
                <Label className="text-xs text-muted-foreground font-medium">Hour</Label>
              </div>

              <div className="text-lg font-bold text-muted-foreground pb-4">:</div>

              <div className="flex flex-col items-center space-y-1">
                <Input
                  type="text"
                  value={minuteInput}
                  onChange={handleMinuteChange}
                  onBlur={handleMinuteBlur}
                  onFocus={(e) => e.target.select()}
                  className={`w-12 h-10 text-center text-lg font-mono ${
                    minuteError ? "border-destructive focus-visible:border-destructive" : ""
                  }`}
                />
                <Label className="text-xs text-muted-foreground font-medium">Minute</Label>
              </div>
            </div>
            {hourError && <p className="text-xs text-destructive text-center">{hourError}</p>}
            {minuteError && <p className="text-xs text-destructive text-center">{minuteError}</p>}
          </div>

          <div className="flex justify-between gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={handleClear}>
              Clear
            </Button>
            <Button size="sm" onClick={handleDone}>
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
