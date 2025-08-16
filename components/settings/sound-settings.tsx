"use client"

import React from "react"
import { useAtom, useSetAtom } from "jotai"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Volume2, VolumeX, Zap, Trees, Gamepad2, TrendingUp, Brain, Tv, Rocket } from "lucide-react"
import {
  soundSettingsAtom,
  toggleSoundAtom,
  changeSoundSuiteAtom,
  changeSoundVolumeAtom,
  toggleInteractionSoundAtom,
} from "@/lib/atoms/ui/sound-settings-atom"
import { getAvailableSuites, getSuiteInfo } from "@/lib/utils/audio-suites"
import { useSound } from "@/hooks/use-sound"

// Suite icons
const SUITE_ICONS = {
  minimalist: Zap,
  nature: Trees,
  arcade: Gamepad2,
  productivity: TrendingUp,
  zen: Brain,
  retro: Tv,
  space: Rocket,
}

// Type-safe helper functions
function isValidSuite(suite: string): suite is keyof typeof SUITE_ICONS {
  return suite in SUITE_ICONS
}

function getSuiteIcon(suite: string): React.ComponentType<{ className?: string }> {
  return isValidSuite(suite) ? SUITE_ICONS[suite] : Zap
}

export function SoundSettings() {
  const [settings] = useAtom(soundSettingsAtom)
  const toggleSound = useSetAtom(toggleSoundAtom)
  const changeSuite = useSetAtom(changeSoundSuiteAtom)
  const changeVolume = useSetAtom(changeSoundVolumeAtom)
  const toggleInteraction = useSetAtom(toggleInteractionSoundAtom)
  const { playSound, playTaskComplete } = useSound()

  const handleTestSound = async () => {
    await playTaskComplete()
  }

  const SuiteIcon = getSuiteIcon(settings.suite)
  const suiteInfo = getSuiteInfo(settings.suite)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sound Settings</CardTitle>
          <CardDescription>
            Customize your audio experience with different sound suites
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Master Sound Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sound-enabled" className="text-base">
                Enable Sounds
              </Label>
              <p className="text-sm text-muted-foreground">Play audio feedback for interactions</p>
            </div>
            <Switch
              id="sound-enabled"
              checked={settings.enabled}
              onCheckedChange={() => toggleSound()}
            />
          </div>

          {/* Sound Suite Selection */}
          <div className="space-y-2">
            <Label htmlFor="sound-suite">Sound Suite</Label>
            <Select
              value={settings.suite}
              onValueChange={(value) => changeSuite(value)}
              disabled={!settings.enabled}
            >
              <SelectTrigger id="sound-suite">
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
            {suiteInfo && <p className="text-sm text-muted-foreground">{suiteInfo.description}</p>}
          </div>

          {/* Volume Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="volume">Volume</Label>
              <span className="text-sm text-muted-foreground">
                {Math.round(settings.volume * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-3">
              <VolumeX className="h-4 w-4 text-muted-foreground" />
              <Slider
                id="volume"
                value={[settings.volume]}
                onValueChange={([v]) => changeVolume(v)}
                min={0}
                max={1}
                step={0.05}
                className="flex-1"
                disabled={!settings.enabled}
              />
              <Volume2 className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Test Sound Button */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestSound}
              disabled={!settings.enabled}
              className="gap-2"
            >
              <Volume2 className="h-4 w-4" />
              Test Task Complete Sound
            </Button>
            <p className="text-sm text-muted-foreground">Hear how completing a task will sound</p>
          </div>
        </CardContent>
      </Card>

      {/* Individual Sound Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Sound Types</CardTitle>
          <CardDescription>Choose which interactions play sounds</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sound-task-complete" className="text-sm font-medium">
                  Task Completion
                </Label>
                <p className="text-xs text-muted-foreground">Sound when checking off tasks</p>
              </div>
              <Switch
                id="sound-task-complete"
                checked={settings.interactions.taskComplete}
                onCheckedChange={() => toggleInteraction("taskComplete")}
                disabled={!settings.enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sound-task-create" className="text-sm font-medium">
                  Task Creation
                </Label>
                <p className="text-xs text-muted-foreground">Sound when adding new tasks</p>
              </div>
              <Switch
                id="sound-task-create"
                checked={settings.interactions.taskCreate}
                onCheckedChange={() => toggleInteraction("taskCreate")}
                disabled={!settings.enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sound-task-delete" className="text-sm font-medium">
                  Task Deletion
                </Label>
                <p className="text-xs text-muted-foreground">Sound when removing tasks</p>
              </div>
              <Switch
                id="sound-task-delete"
                checked={settings.interactions.taskDelete}
                onCheckedChange={() => toggleInteraction("taskDelete")}
                disabled={!settings.enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sound-project-switch" className="text-sm font-medium">
                  Project Switch
                </Label>
                <p className="text-xs text-muted-foreground">
                  Sound when navigating between projects
                </p>
              </div>
              <Switch
                id="sound-project-switch"
                checked={settings.interactions.projectSwitch}
                onCheckedChange={() => toggleInteraction("projectSwitch")}
                disabled={!settings.enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sound-achievement" className="text-sm font-medium">
                  Achievements
                </Label>
                <p className="text-xs text-muted-foreground">Sound for milestones and streaks</p>
              </div>
              <Switch
                id="sound-achievement"
                checked={settings.interactions.achievementUnlock}
                onCheckedChange={() => toggleInteraction("achievementUnlock")}
                disabled={!settings.enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sound-error" className="text-sm font-medium">
                  Error Sounds
                </Label>
                <p className="text-xs text-muted-foreground">Sound for errors and warnings</p>
              </div>
              <Switch
                id="sound-error"
                checked={settings.interactions.error}
                onCheckedChange={() => toggleInteraction("error")}
                disabled={!settings.enabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suite Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <SuiteIcon className="h-5 w-5" />
            <CardTitle>{suiteInfo?.name} Suite</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">{suiteInfo?.theme}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => playSound("taskCreate")}
              disabled={!settings.enabled}
            >
              Create
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => playSound("taskComplete")}
              disabled={!settings.enabled}
            >
              Complete
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => playSound("taskDelete")}
              disabled={!settings.enabled}
            >
              Delete
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => playSound("achievementUnlock")}
              disabled={!settings.enabled}
            >
              Achievement
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => playSound("error")}
              disabled={!settings.enabled}
            >
              Error
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
