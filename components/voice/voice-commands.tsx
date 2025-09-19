"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { v4 as uuidv4 } from "uuid"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Settings,
  Play,
  Square,
  CheckCircle,
  AlertTriangle,
  Headphones,
} from "lucide-react"
import { toast } from "sonner"
import { log } from "@/lib/utils/logger"
import { VoiceCommand, createVoiceCommandId } from "@/lib/types"

// Define proper SpeechRecognition interface for browser API
interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionErrorEvent {
  error: string
  message: string
}

// Extend global Window interface
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition
    webkitSpeechRecognition?: new () => SpeechRecognition
  }
}

interface VoiceSettings {
  enabled: boolean
  language: string
  sensitivity: number
  continuousListening: boolean
  wakeWord: string
  voiceFeedback: boolean
  commands: {
    createTask: string[]
    completeTask: string[]
    deleteTask: string[]
    setDueDate: string[]
    setPriority: string[]
    addProject: string[]
    searchTasks: string[]
    showStats: string[]
  }
}

interface VoiceCommandsProps {
  settings: VoiceSettings
  recentCommands: VoiceCommand[]
  isListening: boolean
  isSupported: boolean
  onUpdateSettings: (settings: VoiceSettings) => void
  onStartListening: () => void
  onStopListening: () => void
  onExecuteCommand: (command: VoiceCommand) => Promise<void>
  onTrainCommand: (phrase: string, action: string) => void
}

export function VoiceCommands({
  settings,
  recentCommands,
  isListening,
  isSupported,
  onUpdateSettings,
  onStartListening,
  onStopListening,
  onExecuteCommand,
  onTrainCommand,
}: VoiceCommandsProps) {
  const [showSettings, setShowSettings] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState("")
  const [confidence, setConfidence] = useState(0)
  const [trainingMode, setTrainingMode] = useState(false)
  const [newCommandPhrase, setNewCommandPhrase] = useState("")
  const [newCommandAction, setNewCommandAction] = useState("")
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)

  const detectAction = useCallback(
    (transcript: string): string => {
      const phrase = transcript.toLowerCase()

      // Create task commands
      if (settings.commands.createTask.some((cmd) => phrase.includes(cmd.toLowerCase()))) {
        return "create_task"
      }

      // Complete task commands
      if (settings.commands.completeTask.some((cmd) => phrase.includes(cmd.toLowerCase()))) {
        return "complete_task"
      }

      // Delete task commands
      if (settings.commands.deleteTask.some((cmd) => phrase.includes(cmd.toLowerCase()))) {
        return "delete_task"
      }

      // Set due date commands
      if (settings.commands.setDueDate.some((cmd) => phrase.includes(cmd.toLowerCase()))) {
        return "set_due_date"
      }

      // Set priority commands
      if (settings.commands.setPriority.some((cmd) => phrase.includes(cmd.toLowerCase()))) {
        return "set_priority"
      }

      // Add project commands
      if (settings.commands.addProject.some((cmd) => phrase.includes(cmd.toLowerCase()))) {
        return "add_project"
      }

      // Search tasks commands
      if (settings.commands.searchTasks.some((cmd) => phrase.includes(cmd.toLowerCase()))) {
        return "search_tasks"
      }

      // Show stats commands
      if (settings.commands.showStats.some((cmd) => phrase.includes(cmd.toLowerCase()))) {
        return "show_stats"
      }

      return "unknown"
    },
    [settings.commands],
  )

  const speak = useCallback(
    (text: string) => {
      if (synthRef.current && settings.voiceFeedback) {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = settings.language
        synthRef.current.speak(utterance)
      }
    },
    [settings.voiceFeedback, settings.language],
  )

  const processVoiceCommand = useCallback(
    async (transcript: string, confidence: number) => {
      const command: VoiceCommand = {
        id: createVoiceCommandId(uuidv4()),
        phrase: transcript.toLowerCase(),
        action: detectAction(transcript),
        confidence: confidence * 100,
        timestamp: new Date(),
        executed: false,
      }

      try {
        await onExecuteCommand(command)
        command.executed = true
        command.result = "Command executed successfully"

        if (settings.voiceFeedback) {
          speak(`Command executed: ${command.action}`)
        }
      } catch {
        command.result = "Failed to execute command"
        toast.error(`Unable to execute: ${command.phrase}`)
      }
    },
    [onExecuteCommand, settings.voiceFeedback, speak, detectAction],
  )

  // Initialize speech recognition
  useEffect(() => {
    if (!isSupported) return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition()

      recognitionRef.current.continuous = settings.continuousListening
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = settings.language

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const result = event.results[event.results.length - 1]
        const transcript = result[0].transcript
        const confidence = result[0].confidence

        setCurrentTranscript(transcript)
        setConfidence(confidence * 100)

        if (result.isFinal && confidence > settings.sensitivity / 100) {
          processVoiceCommand(transcript, confidence)
        }
      }

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        log.error({ error: event.error, module: "voice" }, "Speech recognition error")
        toast.error("Unable to process voice command. Please try again.")
      }

      recognitionRef.current.onend = () => {
        if (settings.continuousListening && isListening) {
          recognitionRef.current?.start()
        }
      }
    }

    // Initialize speech synthesis
    synthRef.current = window.speechSynthesis

    return () => {
      recognitionRef.current?.stop()
    }
  }, [settings, isListening, isSupported, processVoiceCommand])

  const handleTrainCommand = () => {
    if (newCommandPhrase && newCommandAction) {
      onTrainCommand(newCommandPhrase, newCommandAction)
      setNewCommandPhrase("")
      setNewCommandAction("")
      setTrainingMode(false)
      toast.success("New voice command has been added successfully.")
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case "create_task":
        return "text-green-700 bg-green-100 dark:bg-green-900 dark:text-green-300"
      case "complete_task":
        return "text-blue-700 bg-blue-100 dark:bg-blue-900 dark:text-blue-300"
      case "delete_task":
        return "text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-300"
      case "set_due_date":
        return "text-orange-700 bg-orange-100 dark:bg-orange-900 dark:text-orange-300"
      case "set_priority":
        return "text-purple-700 bg-purple-100 dark:bg-purple-900 dark:text-purple-300"
      default:
        return "text-gray-700 bg-gray-100 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  if (!isSupported) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <MicOff className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Voice Commands Not Supported
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Your browser doesn't support speech recognition. Please use a modern browser like Chrome
            or Firefox.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Voice Control Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Headphones className="h-5 w-5" />
              Voice Commands
              {isListening && (
                <Badge className="bg-red-100 text-red-700 animate-pulse">Listening</Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button onClick={() => setShowSettings(!showSettings)} variant="outline" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                onClick={isListening ? onStopListening : onStartListening}
                variant={isListening ? "destructive" : "default"}
                disabled={!settings.enabled}
              >
                {isListening ? (
                  <Square className="h-4 w-4 mr-2" />
                ) : (
                  <Mic className="h-4 w-4 mr-2" />
                )}
                {isListening ? "Stop" : "Start"} Listening
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Status */}
          {!settings.enabled && (
            <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription>
                Voice commands are disabled. Enable them in settings to start using voice control.
              </AlertDescription>
            </Alert>
          )}

          {/* Live Transcript */}
          {isListening && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Live Transcript
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-blue-600 dark:text-blue-400">
                    Confidence: {Math.round(confidence)}%
                  </span>
                  <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                </div>
              </div>
              <p className="text-blue-900 dark:text-blue-100 font-mono">
                {currentTranscript || "Listening for commands..."}
              </p>
              <Progress value={confidence} className="h-1 mt-2" />
            </div>
          )}

          {/* Quick Commands */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { phrase: "Create task", action: "create_task" },
              { phrase: "Show my tasks", action: "search_tasks" },
              { phrase: "Complete task", action: "complete_task" },
              { phrase: "Show statistics", action: "show_stats" },
            ].map((cmd) => (
              <Button
                key={cmd.action}
                variant="outline"
                size="sm"
                onClick={() => processVoiceCommand(cmd.phrase, 1)}
                className="text-xs"
              >
                <Play className="h-3 w-3 mr-1" />
                {cmd.phrase}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Settings Panel */}
      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle>Voice Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Enable Voice Commands</label>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Allow voice control of the application
                  </p>
                </div>
                <Button
                  variant={settings.enabled ? "default" : "outline"}
                  size="sm"
                  onClick={() => onUpdateSettings({ ...settings, enabled: !settings.enabled })}
                >
                  {settings.enabled ? "Enabled" : "Disabled"}
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Language</label>
                <select
                  value={settings.language}
                  onChange={(e) => onUpdateSettings({ ...settings, language: e.target.value })}
                  className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-background"
                >
                  <option value="en-US">English (US)</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="es-ES">Spanish</option>
                  <option value="fr-FR">French</option>
                  <option value="de-DE">German</option>
                  <option value="it-IT">Italian</option>
                  <option value="pt-BR">Portuguese</option>
                  <option value="ja-JP">Japanese</option>
                  <option value="ko-KR">Korean</option>
                  <option value="zh-CN">Chinese (Simplified)</option>
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Sensitivity</label>
                  <span className="text-sm text-gray-600">{settings.sensitivity}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={settings.sensitivity}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, sensitivity: Number.parseInt(e.target.value) })
                  }
                  className="w-full"
                />
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Higher sensitivity may capture more commands but also more false positives
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Continuous Listening</label>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Keep listening after each command
                  </p>
                </div>
                <Button
                  variant={settings.continuousListening ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    onUpdateSettings({
                      ...settings,
                      continuousListening: !settings.continuousListening,
                    })
                  }
                >
                  {settings.continuousListening ? "On" : "Off"}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Voice Feedback</label>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Speak confirmation of executed commands
                  </p>
                </div>
                <Button
                  variant={settings.voiceFeedback ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    onUpdateSettings({ ...settings, voiceFeedback: !settings.voiceFeedback })
                  }
                >
                  {settings.voiceFeedback ? (
                    <Volume2 className="h-4 w-4" />
                  ) : (
                    <VolumeX className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Command Training */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Custom Commands</h4>
                <Button onClick={() => setTrainingMode(!trainingMode)} variant="outline" size="sm">
                  {trainingMode ? "Cancel" : "Add Command"}
                </Button>
              </div>

              {trainingMode && (
                <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <label className="text-sm font-medium">Voice Phrase</label>
                    <input
                      type="text"
                      value={newCommandPhrase}
                      onChange={(e) => setNewCommandPhrase(e.target.value)}
                      placeholder="e.g., 'add urgent task'"
                      className="w-full mt-1 p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Action</label>
                    <select
                      value={newCommandAction}
                      onChange={(e) => setNewCommandAction(e.target.value)}
                      className="w-full mt-1 p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-background"
                    >
                      <option value="">Select action</option>
                      <option value="create_task">Create Task</option>
                      <option value="complete_task">Complete Task</option>
                      <option value="delete_task">Delete Task</option>
                      <option value="set_due_date">Set Due Date</option>
                      <option value="set_priority">Set Priority</option>
                      <option value="add_project">Add Project</option>
                      <option value="search_tasks">Search Tasks</option>
                      <option value="show_stats">Show Statistics</option>
                    </select>
                  </div>
                  <Button onClick={handleTrainCommand} size="sm" className="w-full">
                    Train Command
                  </Button>
                </div>
              )}

              {/* Existing Commands */}
              <div className="space-y-2">
                <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  EXISTING COMMANDS
                </h5>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {Object.entries(settings.commands).map(([action, phrases]) =>
                    phrases.map((phrase, index) => (
                      <div
                        key={`${action}-${index}`}
                        className="flex items-center justify-between text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded"
                      >
                        <span>"{phrase}"</span>
                        <Badge className={getActionColor(action)} variant="outline">
                          {action.replace("_", " ")}
                        </Badge>
                      </div>
                    )),
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Commands */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Commands</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {recentCommands.map((command) => (
              <div
                key={command.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {command.executed ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium">"{command.phrase}"</p>
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <span>{command.timestamp?.toLocaleTimeString() || "No timestamp"}</span>
                      <Badge className={getActionColor(command.action)} variant="outline">
                        {command.action.replace("_", " ")}
                      </Badge>
                      <span>{Math.round(command.confidence)}% confidence</span>
                    </div>
                  </div>
                </div>
                <div className="text-right text-xs">
                  {command.result && (
                    <p className={command.executed ? "text-green-600" : "text-red-600"}>
                      {command.result}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {recentCommands.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Mic className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No voice commands yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Start speaking to see your command history
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
