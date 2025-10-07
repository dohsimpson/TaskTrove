"use client"

import { useEffect } from "react"

interface ShortcutHandlerProps {
  onQuickAdd: () => void
  onSearch: () => void
  onToggleTheme: () => void
  onShowHelp: () => void
  onNavigateToday: () => void
  onNavigateUpcoming: () => void
  onNavigateInbox: () => void
}

export function ShortcutHandler({
  onQuickAdd,
  onSearch,
  onToggleTheme,
  onShowHelp,
  onNavigateToday,
  onNavigateUpcoming,
  onNavigateInbox,
}: ShortcutHandlerProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs or editable elements
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        (event.target instanceof HTMLElement && event.target.isContentEditable)
      ) {
        return
      }

      const { key, metaKey, ctrlKey, shiftKey } = event
      const modifier = metaKey || ctrlKey

      // Quick add task (Cmd/Ctrl + N)
      if (modifier && key === "n") {
        event.preventDefault()
        onQuickAdd()
        return
      }

      // Search (Cmd/Ctrl + F or /)
      if ((modifier && key === "f") || key === "/") {
        event.preventDefault()
        onSearch()
        return
      }

      // Toggle theme (Cmd/Ctrl + Shift + T)
      if (modifier && shiftKey && key === "T") {
        event.preventDefault()
        onToggleTheme()
        return
      }

      // Show help (?)
      if (key === "?" && !modifier) {
        event.preventDefault()
        onShowHelp()
        return
      }

      // Navigation shortcuts
      if (key === "g" && !modifier) {
        // Wait for next key
        const handleSecondKey = (secondEvent: KeyboardEvent) => {
          secondEvent.preventDefault()
          document.removeEventListener("keydown", handleSecondKey)

          switch (secondEvent.key) {
            case "t":
              onNavigateToday()
              break
            case "u":
              onNavigateUpcoming()
              break
            case "i":
              onNavigateInbox()
              break
          }
        }

        document.addEventListener("keydown", handleSecondKey)
        setTimeout(() => {
          document.removeEventListener("keydown", handleSecondKey)
        }, 2000) // Remove listener after 2 seconds
        return
      }

      // Task actions (when a task is focused)
      const focusedTask = document.querySelector('[data-task-focused="true"]')
      if (focusedTask) {
        switch (key) {
          case "Enter": {
            event.preventDefault()
            // Edit task
            const editButton = focusedTask.querySelector('[data-action="edit"]')
            if (editButton instanceof HTMLElement) {
              editButton.click()
            }
            break
          }
          case " ": {
            event.preventDefault()
            // Toggle completion
            const toggleButton = focusedTask.querySelector('[data-action="toggle"]')
            if (toggleButton instanceof HTMLElement) {
              toggleButton.click()
            }
            break
          }
          case "Delete":
          case "Backspace":
            if (modifier) {
              event.preventDefault()
              // Delete task
              const deleteButton = focusedTask.querySelector('[data-action="delete"]')
              if (deleteButton instanceof HTMLElement) {
                deleteButton.click()
              }
            }
            break
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [
    onQuickAdd,
    onSearch,
    onToggleTheme,
    onShowHelp,
    onNavigateToday,
    onNavigateUpcoming,
    onNavigateInbox,
  ])

  return null
}

export function ShortcutHelp() {
  const shortcuts = [
    { keys: ["⌘", "N"], description: "Quick add task" },
    { keys: ["⌘", "F"], description: "Search tasks" },
    { keys: ["/"], description: "Search tasks" },
    { keys: ["⌘", "⇧", "T"], description: "Toggle theme" },
    { keys: ["?"], description: "Show this help" },
    { keys: ["G", "T"], description: "Go to Today" },
    { keys: ["G", "U"], description: "Go to Upcoming" },
    { keys: ["G", "I"], description: "Go to Inbox" },
    { keys: ["Enter"], description: "Edit focused task" },
    { keys: ["Space"], description: "Toggle task completion" },
    { keys: ["⌘", "⌫"], description: "Delete focused task" },
  ]

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Keyboard Shortcuts</h3>
      <div className="grid gap-2">
        {shortcuts.map((shortcut, index) => (
          <div key={index} className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-600">{shortcut.description}</span>
            <div className="flex items-center gap-1">
              {shortcut.keys.map((key, keyIndex) => (
                <span key={keyIndex} className="flex items-center">
                  <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
                    {key}
                  </kbd>
                  {keyIndex < shortcut.keys.length - 1 && (
                    <span className="mx-1 text-gray-400">+</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
