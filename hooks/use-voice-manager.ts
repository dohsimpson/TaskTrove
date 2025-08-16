"use client"

import { useState } from "react"
import { toast } from "@/hooks/use-toast"
import { log } from "../lib/utils/logger"

export function useVoiceManager() {
  log.warn(
    { module: "hooks" },
    "DEPRECATED: useVoiceManager hook is deprecated and will be removed in a future version. This feature should be implemented using atoms from @/lib/atoms.",
  )

  const [settings, setSettings] = useState({
    enabled: true,
    language: "en-US",
    sensitivity: 80,
    continuousListening: false,
    wakeWord: "tasktrove",
    voiceFeedback: true,
    commands: {
      createTask: ["create task", "add task", "new task"],
      completeTask: ["complete task", "finish task", "done"],
      deleteTask: ["delete task", "remove task"],
      setDueDate: ["set due date", "schedule for"],
      setPriority: ["set priority", "make urgent"],
      addProject: ["create project", "new project"],
      searchTasks: ["search tasks", "find tasks"],
      showStats: ["show statistics", "show analytics"],
    },
  })

  const [recentCommands, setRecentCommands] = useState<any[]>([])
  const [isListening, setIsListening] = useState(false)
  const [isSupported] = useState(
    typeof window !== "undefined" && "webkitSpeechRecognition" in window,
  )

  const startListening = () => {
    setIsListening(true)
    toast({
      title: "Voice listening started",
      description: "Speak your commands now.",
    })
  }

  const stopListening = () => {
    setIsListening(false)
    toast({
      title: "Voice listening stopped",
      description: "Voice commands are now disabled.",
    })
  }

  const executeCommand = async (command: any) => {
    setRecentCommands((prev) => [command, ...prev.slice(0, 9)])
    // Command execution will be handled by the parent component
  }

  const trainCommand = (phrase: string, action: string) => {
    toast({
      title: "Command trained",
      description: `Added "${phrase}" for ${action} action.`,
    })
  }

  return {
    settings,
    recentCommands,
    isListening,
    isSupported,
    updateSettings: setSettings,
    startListening,
    stopListening,
    executeCommand,
    trainCommand,
  }
}
