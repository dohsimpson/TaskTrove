# TaskTrove Sound System Integration Guide

## Overview

TaskTrove now has a comprehensive sound design system with 7 different themed sound suites covering every interaction in the app. Each suite provides a complete audio identity with sounds for task operations, navigation, notifications, and more.

## Sound Suites Available

1. **Minimalist** - Clean, subtle, professional sounds
2. **Nature** - Organic sounds inspired by natural environments
3. **Arcade** - Fun, gamified, 8-bit inspired sounds
4. **Productivity** - Motivating, achievement-focused sounds
5. **Zen** - Mindful, meditation-inspired sounds
6. **Retro** - Nostalgic, vintage computer sounds
7. **Space** - Futuristic, sci-fi inspired sounds

## Integration Example

To integrate the new sound system into the task completion action, update the `toggleTaskAtom` in `/lib/atoms/core/tasks.ts`:

```typescript
// At the top of the file, add imports:
import { soundSettingsAtom } from "@/lib/atoms/ui/sound-settings-atom"
import { playInteractionSound } from "@/lib/utils/sound-player"

// Update the toggleTaskAtom:
export const toggleTaskAtom = atom(null, async (get, set, taskId: string) => {
  try {
    const tasks = get(tasksAtom)
    const task = tasks.find((t) => t.id === taskId)

    if (!task) return

    const wasCompleted = task.completed
    const willBeCompleted = !wasCompleted

    const updatedTasks = tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            completed: willBeCompleted,
            completedAt: willBeCompleted ? new Date() : undefined,
            status: willBeCompleted ? "completed" : "active",
            kanbanStatus: willBeCompleted ? "done" : task.kanbanStatus || "todo",
          }
        : task,
    )

    set(tasksAtom, updatedTasks)

    // Play sound using the new sound system
    if (willBeCompleted) {
      const soundSettings = get(soundSettingsAtom)
      await playInteractionSound("taskComplete", soundSettings)
    }
  } catch (error) {
    handleAtomError(error, "toggleTaskAtom")
  }
})
```

## Using the Sound Hook in Components

For components that need to play sounds, use the `useSound` hook:

```typescript
import { useSound } from '@/hooks/use-sound'

export function MyComponent() {
  const { playSound, playTaskComplete, playError } = useSound()

  const handleAction = async () => {
    // Play a specific interaction sound
    await playSound('taskCreate')

    // Or use helper methods
    await playTaskComplete()
  }

  return <button onClick={handleAction}>Create Task</button>
}
```

## Available Interaction Types

The system supports sounds for all these interactions:

### Task Operations

- `taskComplete` - Checking off a task
- `taskCreate` - Creating new task
- `taskDelete` - Deleting/archiving task
- `taskEdit` - Editing task content
- `taskMove` - Moving task between lists
- `taskPriorityUp/Down` - Changing priority
- `taskSchedule/Unschedule` - Setting/removing due dates
- And more...

### UI & Navigation

- `navigationClick` - Menu/nav clicks
- `dialogOpen/Close` - Modal interactions
- `tabSwitch` - Switching tabs
- `pageTransition` - Page navigation

### Notifications

- `reminderDue` - Task due reminder
- `achievementUnlock` - Milestone reached
- `streakContinue/Break` - Streak management
- `error` - Error feedback
- `warning` - Warning message

### Special Interactions

- `focusMode` - Entering focus mode
- `dayComplete` - All tasks done for day
- `weekComplete` - Weekly goal achieved
- `ambient` - Background ambience

## User Settings

Users can configure their sound preferences through the Sound Settings component:

```typescript
import { SoundSettings } from '@/components/settings/sound-settings'

// Add to your settings page:
<SoundSettings />
```

This allows users to:

- Enable/disable sounds globally
- Choose their preferred sound suite
- Adjust volume
- Toggle individual sound types

## Testing Sounds

Two testing components are available:

1. **Basic Sound Tester** (`/components/debug/sound-tester.tsx`) - Tests the original sounds
2. **Sound Suite Tester** (`/components/debug/sound-suite-tester.tsx`) - Tests all suite sounds

Add to a debug page:

```typescript
import { SoundSuiteTester } from '@/components/debug/sound-suite-tester'

export default function DebugPage() {
  return <SoundSuiteTester />
}
```

## Sound Design Philosophy

Each suite is designed with a specific mood and use case:

- **Minimalist**: For focused work in professional environments
- **Nature**: For calm, stress-free productivity
- **Arcade**: For gamified task management
- **Productivity**: For motivation and achievement
- **Zen**: For mindful work sessions
- **Retro**: For nostalgic computing fans
- **Space**: For futuristic experiences

## Performance Considerations

- Sounds are played using Web Audio API for low latency
- Audio context is initialized only when first needed
- Sounds include proper envelopes (ADSR) for smooth playback
- Effects (reverb, delay, filters) are applied efficiently

## Customization

The sound system is highly extensible. To add new sounds:

1. Add the interaction type to `InteractionType` in `audio-suites.ts`
2. Add sound definitions for each suite
3. Update the sound settings UI if needed

## Best Practices

1. **Consistency**: Use sounds from the same suite throughout the app
2. **Feedback**: Task completion should have the most satisfying sound
3. **Subtlety**: Navigation sounds should be subtle and quick
4. **Context**: Error sounds should be distinct but not jarring
5. **Volume**: Default to 30% volume for comfortable listening
