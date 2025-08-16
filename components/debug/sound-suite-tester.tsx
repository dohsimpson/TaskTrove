"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Volume2, Zap, Trees, Gamepad2, TrendingUp, Brain, Tv, Rocket } from "lucide-react"
import { playSoundFromDefinition } from "@/lib/utils/audio"
import {
  SOUND_SUITES,
  getAvailableSuites,
  getSuiteInfo,
  type InteractionType,
} from "@/lib/utils/audio-suites"

// Suite icons
const SUITE_ICONS = {
  minimalist: Zap,
  nature: Trees,
  arcade: Gamepad2,
  productivity: TrendingUp,
  zen: Brain,
  retro: Tv,
  space: Rocket,
} as const

// Type guard to check if a suite has an icon
function isSuiteWithIcon(suite: string): suite is keyof typeof SUITE_ICONS {
  return suite in SUITE_ICONS
}

function getSuiteIcon(suite: string): React.ComponentType<{ className?: string }> {
  if (isSuiteWithIcon(suite)) {
    return SUITE_ICONS[suite]
  }
  return Zap
}

// Interaction categories for better organization
const INTERACTION_CATEGORIES: Record<string, InteractionType[]> = {
  "Task Operations": [
    "taskComplete",
    "taskCreate",
    "taskDelete",
    "taskEdit",
    "taskMove",
    "taskPriorityUp",
    "taskPriorityDown",
    "taskSchedule",
    "taskUnschedule",
    "taskRestore",
    "taskDuplicate",
    "taskConvert",
  ],
  Subtasks: ["subtaskAdd", "subtaskComplete", "subtaskRemove"],
  Organization: ["projectCreate", "projectDelete", "projectSwitch", "labelAdd", "labelRemove"],
  Navigation: [
    "navigationClick",
    "dialogOpen",
    "dialogClose",
    "tabSwitch",
    "filterToggle",
    "viewChange",
    "pageTransition",
  ],
  Notifications: [
    "reminderDue",
    "reminderOverdue",
    "achievementUnlock",
    "streakContinue",
    "streakBreak",
    "syncComplete",
    "error",
    "warning",
    "info",
  ],
  "Bulk Actions": ["bulkSelect", "bulkComplete", "bulkDelete"],
  Special: ["focusMode", "breakTime", "dayComplete", "weekComplete", "ambient"],
}

// Human-friendly interaction names
const INTERACTION_NAMES: Record<InteractionType, string> = {
  taskComplete: "Task Complete ✓",
  taskCreate: "Task Create",
  taskDelete: "Task Delete",
  taskEdit: "Task Edit",
  taskMove: "Task Move",
  taskPriorityUp: "Priority Up",
  taskPriorityDown: "Priority Down",
  taskSchedule: "Schedule Task",
  taskUnschedule: "Unschedule Task",
  taskRestore: "Restore Task",
  taskDuplicate: "Duplicate Task",
  taskConvert: "Convert Task",
  subtaskAdd: "Add Subtask",
  subtaskComplete: "Complete Subtask",
  subtaskRemove: "Remove Subtask",
  projectCreate: "Create Project",
  projectDelete: "Delete Project",
  projectSwitch: "Switch Project",
  labelAdd: "Add Label",
  labelRemove: "Remove Label",
  navigationClick: "Navigation Click",
  dialogOpen: "Dialog Open",
  dialogClose: "Dialog Close",
  tabSwitch: "Tab Switch",
  filterToggle: "Filter Toggle",
  viewChange: "View Change",
  pageTransition: "Page Transition",
  reminderDue: "Reminder Due",
  reminderOverdue: "Reminder Overdue",
  achievementUnlock: "Achievement Unlock",
  streakContinue: "Streak Continue",
  streakBreak: "Streak Break",
  syncComplete: "Sync Complete",
  error: "Error",
  warning: "Warning",
  info: "Info",
  bulkSelect: "Bulk Select",
  bulkComplete: "Bulk Complete",
  bulkDelete: "Bulk Delete",
  focusMode: "Focus Mode",
  breakTime: "Break Time",
  dayComplete: "Day Complete",
  weekComplete: "Week Complete",
  ambient: "Ambient Sound",
}

export function SoundSuiteTester() {
  const [selectedSuite, setSelectedSuite] = useState<string>("minimalist")
  const [volume, setVolume] = useState<number>(0.5)
  const [playingSound, setPlayingSound] = useState<string | null>(null)

  const handlePlaySound = async (interactionType: InteractionType) => {
    const suite = SOUND_SUITES[selectedSuite]
    if (!suite) return

    const soundDef = suite.sounds[interactionType]
    if (!soundDef) return

    setPlayingSound(interactionType)
    await playSoundFromDefinition(soundDef, volume)

    // Clear playing state after a reasonable time
    const maxDuration = Math.max(...soundDef.durations) * 1000 + 500
    setTimeout(() => setPlayingSound(null), maxDuration)
  }

  const suiteInfo = getSuiteInfo(selectedSuite)
  const SuiteIcon = getSuiteIcon(selectedSuite)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold">Sound Suite Tester</h2>
        <p className="text-muted-foreground">
          Explore comprehensive sound suites designed for TaskTrove. Each suite offers a complete
          audio experience covering every interaction in the app.
        </p>
      </div>

      {/* Suite Selection and Volume Control */}
      <Card>
        <CardHeader>
          <CardTitle>Sound Suite Settings</CardTitle>
          <CardDescription>Choose a suite and adjust the volume</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sound Suite</label>
              <Select
                value={selectedSuite}
                onValueChange={(value: string) => setSelectedSuite(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableSuites().map((suite) => {
                    const info = getSuiteInfo(suite)
                    const Icon = getSuiteIcon(suite)
                    return (
                      <SelectItem key={suite} value={suite}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{info?.name}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Volume: {Math.round(volume * 100)}%</label>
              <Slider
                value={[volume]}
                onValueChange={([v]) => setVolume(v)}
                min={0}
                max={1}
                step={0.1}
                className="w-full"
              />
            </div>
          </div>

          {suiteInfo && (
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <SuiteIcon className="h-5 w-5" />
                <h3 className="font-semibold">{suiteInfo.name} Suite</h3>
              </div>
              <p className="text-sm text-muted-foreground">{suiteInfo.description}</p>
              <p className="text-sm">
                <span className="font-medium">Theme:</span> {suiteInfo.theme}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sound Categories */}
      {Object.entries(INTERACTION_CATEGORIES).map(([category, interactions]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-lg">{category}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {interactions.map((interaction) => (
                <Button
                  key={interaction}
                  variant="outline"
                  className={`h-auto p-3 flex flex-col items-center gap-2 ${
                    playingSound === interaction ? "ring-2 ring-primary" : ""
                  } ${
                    interaction === "taskComplete" ? "border-green-500 hover:border-green-600" : ""
                  }`}
                  onClick={() => handlePlaySound(interaction)}
                  disabled={playingSound !== null && playingSound !== interaction}
                >
                  <Volume2
                    className={`h-4 w-4 ${playingSound === interaction ? "animate-pulse" : ""}`}
                  />
                  <span className="text-xs text-center">{INTERACTION_NAMES[interaction]}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Suite Comparisons */}
      <Card>
        <CardHeader>
          <CardTitle>Suite Characteristics</CardTitle>
          <CardDescription>Quick comparison of different sound suites</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getAvailableSuites().map((suite) => {
              const info = getSuiteInfo(suite)
              const Icon = getSuiteIcon(suite)
              return (
                <div
                  key={suite}
                  className={`p-4 rounded-lg border ${
                    selectedSuite === suite ? "border-primary bg-primary/5" : "border-border"
                  } cursor-pointer transition-colors hover:border-primary/50`}
                  onClick={() => setSelectedSuite(suite)}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                    <div className="space-y-1 flex-1">
                      <h4 className="font-medium">{info?.name}</h4>
                      <p className="text-xs text-muted-foreground">{info?.theme}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Usage Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium mb-1">Recommended Usage:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>
                  <strong>Task Complete:</strong> The most important sound - should be satisfying
                  and instant
                </li>
                <li>
                  <strong>Minimalist Suite:</strong> Best for professional environments and focus
                </li>
                <li>
                  <strong>Nature Suite:</strong> Ideal for calm, stress-free productivity
                </li>
                <li>
                  <strong>Arcade Suite:</strong> Perfect for gamified task management
                </li>
                <li>
                  <strong>Productivity Suite:</strong> Designed to motivate and celebrate
                  achievements
                </li>
                <li>
                  <strong>Zen Suite:</strong> For mindful work sessions with meditation-inspired
                  sounds
                </li>
                <li>
                  <strong>Retro Suite:</strong> Nostalgic terminal beeps for classic computing fans
                </li>
                <li>
                  <strong>Space Suite:</strong> Futuristic sounds for an otherworldly experience
                </li>
              </ul>
            </div>

            <div className="bg-primary/10 p-3 rounded-lg">
              <p className="text-sm">
                <strong>💡 Pro Tip:</strong> Each suite is designed as a complete audio identity.
                Pick one that matches your work style and stick with it for a consistent experience.
              </p>
            </div>

            <div className="bg-secondary/10 p-3 rounded-lg">
              <p className="text-sm">
                <strong>🎯 Task Complete Sound:</strong> Try the "Task Complete" sound in each suite
                - it's been specially crafted to provide the perfect feedback for checking off
                todos!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
