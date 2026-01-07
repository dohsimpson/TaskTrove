"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { settingsAtom } from "@tasktrove/atoms/data/base/atoms"
import { useAtomValue } from "jotai"

export type TimePickerProps = {
  hourLabel: string
  minuteLabel: string
  periodLabel?: string
  setLabel: string
  selectedHour: string
  selectedMinute: string
  selectedAmPm: "AM" | "PM"
  onHourChange: (value: string) => void
  onMinuteChange: (value: string) => void
  onAmPmChange: (value: "AM" | "PM") => void
  onConfirm: () => void
  disableConfirm?: boolean
}

// Default (web/desktop) implementation keeps the numeric inputs that were inline before.
export function TimePicker({
  hourLabel,
  minuteLabel,
  periodLabel,
  setLabel,
  selectedHour,
  selectedMinute,
  selectedAmPm,
  onHourChange,
  onMinuteChange,
  onAmPmChange,
  onConfirm,
  disableConfirm,
}: TimePickerProps) {
  const setting = useAtomValue(settingsAtom)
  const use24HourTime = setting.uiSettings.use24HourTime
  const hourMin = use24HourTime ? 0 : 1
  const hourMax = use24HourTime ? 23 : 12

  return (
    <div className="grid grid-cols-[3.25rem_0.75rem_3.25rem_4rem_auto] justify-center items-center gap-x-2 gap-y-2">
      {/* Header row aligns with control widths */}
      <span className="text-xs font-semibold text-muted-foreground text-center">{hourLabel}</span>
      <span aria-hidden />
      <span className="text-xs font-semibold text-muted-foreground text-center">{minuteLabel}</span>
      {use24HourTime ? (
        <span
          className="text-xs font-semibold text-muted-foreground text-center w-16"
          aria-hidden
        />
      ) : (
        <span className="text-xs font-semibold text-muted-foreground text-center">
          {periodLabel}
        </span>
      )}
      <span aria-hidden />

      {/* Controls row */}
      <div className="flex justify-center">
        <Input
          aria-label={hourLabel}
          type="number"
          min={hourMin}
          max={hourMax}
          value={selectedHour}
          onChange={(e) => {
            const value = parseInt(e.target.value)
            if (value >= hourMin && value <= hourMax) {
              onHourChange(e.target.value)
            } else if (e.target.value === "") {
              onHourChange("")
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              onConfirm()
            }
          }}
          onBlur={(e) => {
            if (e.target.value === "") return
            const value = parseInt(e.target.value)
            if (isNaN(value) || value < hourMin) {
              onHourChange(use24HourTime ? "00" : "1")
            } else if (value > hourMax) {
              onHourChange(hourMax.toString())
            }
          }}
          className="w-12 h-10 text-center text-base font-medium px-2 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>
      <span className="text-lg font-semibold text-muted-foreground text-center">:</span>
      <div className="flex justify-center">
        <Input
          aria-label={minuteLabel}
          type="number"
          min="0"
          max="59"
          value={selectedMinute}
          onChange={(e) => {
            const value = parseInt(e.target.value)
            if (value >= 0 && value <= 59) {
              onMinuteChange(e.target.value)
            } else if (e.target.value === "") {
              onMinuteChange("")
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              onConfirm()
            }
          }}
          onBlur={(e) => {
            if (e.target.value === "") return
            const value = parseInt(e.target.value)
            let finalValue: string
            if (isNaN(value) || value < 0) {
              finalValue = "00"
            } else if (value > 59) {
              finalValue = "59"
            } else {
              finalValue = value.toString().padStart(2, "0")
            }
            onMinuteChange(finalValue)
          }}
          className="w-12 h-10 text-center text-base font-medium px-2 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>
      {!use24HourTime && (
        <Select value={selectedAmPm} onValueChange={onAmPmChange}>
          <SelectTrigger className="w-16 h-10 text-sm px-2 rounded-lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AM">AM</SelectItem>
            <SelectItem value="PM">PM</SelectItem>
          </SelectContent>
        </Select>
      )}
      <Button
        onClick={onConfirm}
        disabled={disableConfirm}
        size="sm"
        className="h-10 px-4 text-sm rounded-lg"
      >
        {setLabel}
      </Button>
    </div>
  )
}
