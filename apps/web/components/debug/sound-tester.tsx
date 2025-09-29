"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Volume2 } from "lucide-react"
import { playSound, type SoundType, SOUND_DESCRIPTIONS } from "@tasktrove/dom-utils/audio"
import { log } from "@/lib/utils/logger"

interface SoundTestButtonProps {
  soundType: SoundType
  label: string
  description: string
  isRecommended?: boolean
}

function SoundTestButton({ soundType, label, description, isRecommended }: SoundTestButtonProps) {
  const handlePlay = () => {
    playSound(soundType).catch((error: unknown) => {
      log.warn({ soundType, error, module: "debug" }, `Failed to play ${soundType} sound`)
    })
  }

  return (
    <Button
      variant="outline"
      className={`h-auto p-4 flex flex-col items-start text-left space-y-2 ${
        isRecommended ? "ring-2 ring-green-500 border-green-300" : ""
      }`}
      onClick={handlePlay}
    >
      <div className="flex items-center gap-2 w-full">
        <Volume2 className="h-4 w-4" />
        <span className="font-medium">{label}</span>
        {isRecommended && (
          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
            Recommended
          </span>
        )}
      </div>
      <span className="text-xs text-muted-foreground leading-relaxed">{description}</span>
      <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded">
        {SOUND_DESCRIPTIONS[soundType]}
      </span>
    </Button>
  )
}

export function SoundTester() {
  const soundCategories = [
    {
      title: "Todo Completion Bell Sounds",
      description: "New bell sounds specifically designed for todo completion - try them all!",
      sounds: [
        {
          type: "bellClear" as const,
          label: "Clear Bell",
          description: "Crisp and instant - perfect for quick todo completion feedback",
          isRecommended: true,
        },
        {
          type: "bellWarm" as const,
          label: "Warm Bell",
          description: "Comforting and rounded - gentle completion sound",
          isRecommended: false,
        },
        {
          type: "bellBright" as const,
          label: "Bright Bell",
          description: "Energetic and uplifting - sparkling completion feedback",
          isRecommended: false,
        },
        {
          type: "bellDeep" as const,
          label: "Deep Bell",
          description: "Rich and satisfying - grounding completion sound",
          isRecommended: false,
        },
      ],
    },
    {
      title: "Current Task Completion Sounds",
      description: "Priority-based sounds currently used for task completion",
      sounds: [
        {
          type: "levelup" as const,
          label: "Level Up",
          description: "High priority tasks (Priority 1) - ascending arpeggio",
          isRecommended: false,
        },
        {
          type: "success" as const,
          label: "Success",
          description: "Medium priority tasks (Priority 2) - major chord",
          isRecommended: false,
        },
        {
          type: "ding" as const,
          label: "Ding",
          description: "Normal priority tasks (Priority 3) - simple tone",
          isRecommended: false,
        },
        {
          type: "pop" as const,
          label: "Pop",
          description: "No priority tasks (Priority 4) - bubble pop",
          isRecommended: false,
        },
        {
          type: "bell" as const,
          label: "Original Bell",
          description: "Two-tone notification bell",
          isRecommended: false,
        },
      ],
    },
    {
      title: "UI Interaction Sounds",
      description: "Sounds for various user interface interactions",
      sounds: [
        {
          type: "click" as const,
          label: "Click",
          description: "Button and link clicks - sharp and immediate",
          isRecommended: false,
        },
        {
          type: "tap" as const,
          label: "Tap",
          description: "Light interactions - subtle feedback",
          isRecommended: false,
        },
        {
          type: "swoosh" as const,
          label: "Swoosh",
          description: "Page transitions - smooth movement",
          isRecommended: false,
        },
        {
          type: "confirm" as const,
          label: "Confirm",
          description: "Task creation and confirmations - gentle acknowledgment",
          isRecommended: false,
        },
      ],
    },
    {
      title: "Feedback Sounds",
      description: "Sounds for system feedback and notifications",
      sounds: [
        {
          type: "alert" as const,
          label: "Alert",
          description: "High priority notifications - attention-grabbing beeps",
          isRecommended: false,
        },
        {
          type: "chime" as const,
          label: "Chime",
          description: "Gentle reminders - soft bell-like tones",
          isRecommended: false,
        },
        {
          type: "whoosh" as const,
          label: "Whoosh",
          description: "Task deletion - swift removal sound",
          isRecommended: false,
        },
        {
          type: "error" as const,
          label: "Error",
          description: "Error feedback - clear negative indication",
          isRecommended: false,
        },
      ],
    },
  ]

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Sound Effects Tester</h2>
        <p className="text-muted-foreground">
          Test all the different sound effects used throughout TaskTrove. Click any button to hear
          the sound.
        </p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            <strong>🚧 Development Only:</strong> This component is only available in development
            environment and will not be included in production builds.
          </p>
        </div>
      </div>

      {soundCategories.map((category) => (
        <Card key={category.title}>
          <CardHeader>
            <CardTitle className="text-lg">{category.title}</CardTitle>
            <CardDescription>{category.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {category.sounds.map((sound) => (
                <SoundTestButton
                  key={sound.type}
                  soundType={sound.type}
                  label={sound.label}
                  description={sound.description}
                  isRecommended={sound.isRecommended}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Usage in TaskTrove</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm space-y-3">
            <div>
              <p className="font-medium mb-1">Current Implementation:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>
                  <strong>Task Completion:</strong> Now uses Clear Bell for instant, satisfying
                  feedback
                </li>
                <li>
                  <strong>Task Creation:</strong> Confirmation sound when adding new tasks
                </li>
                <li>
                  <strong>Task Deletion:</strong> Whoosh sound for deletion feedback
                </li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-1">New Bell Options:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>
                  <strong>Clear Bell:</strong> Short, crisp, immediate feedback - recommended for
                  todos
                </li>
                <li>
                  <strong>Warm Bell:</strong> Comforting tone with subtle harmonics
                </li>
                <li>
                  <strong>Bright Bell:</strong> High-frequency sparkle with harmonics
                </li>
                <li>
                  <strong>Deep Bell:</strong> Rich, resonant tone with multiple harmonics
                </li>
              </ul>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm">
                <strong>💡 Tip:</strong> The Clear Bell is specifically designed for todo completion
                - it's short (120ms), crisp, and provides instant satisfying feedback without being
                distracting.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
