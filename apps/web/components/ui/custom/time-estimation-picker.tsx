"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { useTranslation } from "@tasktrove/i18n"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ContentPopover } from "@/components/ui/content-popover"
import { HelpPopover } from "@/components/ui/help-popover"
import { Badge } from "@/components/ui/badge"
import { tasksAtom, updateTaskAtom } from "@/lib/atoms"
import type { TaskId } from "@/lib/types"

interface TimeEstimationPickerProps {
  taskId?: TaskId // For existing tasks
  value?: number // For new items (backward compatibility)
  onChange?: (seconds: number | null) => void // For new items (backward compatibility)
  trigger: React.ReactNode
  open?: boolean
  setOpen?: (open: boolean) => void
  triggerMode?: "click" | "hover"
  asChild?: boolean
  disableOutsideInteraction?: boolean
}

export function TimeEstimationPicker({
  taskId,
  value: propValue,
  onChange: propOnChange,
  trigger,
  open,
  setOpen,
  triggerMode = "click",
  asChild = false,
  disableOutsideInteraction = false,
}: TimeEstimationPickerProps) {
  // Translation setup
  const { t } = useTranslation("task")

  // Get task data and update function for existing tasks
  const tasks = useAtomValue(tasksAtom)
  const updateTask = useSetAtom(updateTaskAtom)

  // For existing tasks: find the task
  const task = taskId ? tasks.find((t) => t.id === taskId) : null

  // Calculate effective estimation (task estimation or sum of subtasks)
  const subtaskEstimationSum =
    task?.subtasks.reduce((total, subtask) => total + (subtask.estimation || 0), 0) || 0
  const isUsingSubtaskEstimation =
    taskId && task && (!task.estimation || task.estimation === 0) && subtaskEstimationSum > 0

  const value =
    taskId && task
      ? task.estimation && task.estimation > 0
        ? task.estimation
        : subtaskEstimationSum
      : propValue || 0 // Fallback for new items

  // Handle estimation changes
  const onChange = taskId
    ? (estimation: number | null) => updateTask({ updateRequest: { id: taskId, estimation } })
    : propOnChange || (() => {})
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
    // Apply the preset immediately
    onChange(seconds)
  }

  const validateAndParseHour = (input: string) => {
    const trimmed = input.trim()
    if (trimmed === "") return { value: 0, error: "" }

    const parsed = parseInt(trimmed)
    if (isNaN(parsed)) {
      return { value: 0, error: t("timeEstimation.errors.hourNumber", "Must be a number (0-99)") }
    }

    if (parsed < 0 || parsed > 99) {
      return {
        value: Math.max(0, Math.min(parsed, 99)),
        error: t("timeEstimation.errors.hourRange", "Hours must be between 0-99"),
      }
    }

    return { value: parsed, error: "" }
  }

  const validateAndParseMinute = (input: string) => {
    const trimmed = input.trim()
    if (trimmed === "") return { value: 0, error: "" }

    const parsed = parseInt(trimmed)
    if (isNaN(parsed)) {
      return { value: 0, error: t("timeEstimation.errors.minuteNumber", "Must be a number (0-59)") }
    }

    if (parsed < 0 || parsed > 59) {
      return {
        value: Math.max(0, Math.min(parsed, 59)),
        error: t("timeEstimation.errors.minuteRange", "Minutes must be between 0-59"),
      }
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
    onChange(null)
    setOpen?.(false)
  }

  const handleDone = () => {
    onChange(currentSeconds)
    setOpen?.(false)
  }

  return (
    <ContentPopover
      open={open}
      onOpenChange={setOpen}
      className="w-auto overflow-hidden p-0"
      align="start"
      triggerMode={triggerMode}
      asChild={asChild}
      disableOutsideInteraction={disableOutsideInteraction}
      content={
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">
                {t("timeEstimation.title", "Time Estimation")}
              </Label>
              <HelpPopover
                content={
                  isUsingSubtaskEstimation
                    ? t(
                        "timeEstimation.helpTextSubtasks",
                        "This estimation is calculated from the sum of subtask estimations. Setting a direct estimation here will override the calculated value.",
                      )
                    : t(
                        "timeEstimation.helpText",
                        "Estimate how long this task will take to complete. This helps with planning and tracking your productivity.",
                      )
                }
                align="start"
              />
            </div>
            {isUsingSubtaskEstimation && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {t("timeEstimation.calculatedFromSubtasks", "Calculated from subtasks")}
                </Badge>
              </div>
            )}
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
            <Label className="text-xs font-medium">
              {t("timeEstimation.customDuration", "Custom Duration")}
            </Label>
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
                <Label className="text-xs text-muted-foreground font-medium">
                  {t("timeEstimation.hour", "Hour")}
                </Label>
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
                <Label className="text-xs text-muted-foreground font-medium">
                  {t("timeEstimation.minute", "Minute")}
                </Label>
              </div>
            </div>
            {hourError && <p className="text-xs text-destructive text-center">{hourError}</p>}
            {minuteError && <p className="text-xs text-destructive text-center">{minuteError}</p>}
          </div>

          <div className="flex justify-between gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={handleClear}>
              {t("timeEstimation.clear", "Clear")}
            </Button>
            <Button size="sm" onClick={handleDone}>
              {t("timeEstimation.done", "Done")}
            </Button>
          </div>
        </div>
      }
    >
      {trigger}
    </ContentPopover>
  )
}
