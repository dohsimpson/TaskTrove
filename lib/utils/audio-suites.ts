/**
 * Comprehensive Sound Design System for TaskTrove
 * Multiple themed suites covering all interaction needs
 */

export type InteractionType =
  // Task Operations
  | "taskComplete" // Checking off a task
  | "taskCreate" // Creating new task
  | "taskDelete" // Deleting/archiving task
  | "taskEdit" // Editing task content
  | "taskMove" // Moving task between lists
  | "taskPriorityUp" // Increasing priority
  | "taskPriorityDown" // Decreasing priority
  | "taskSchedule" // Setting due date
  | "taskUnschedule" // Removing due date
  | "taskRestore" // Restoring deleted task
  | "taskDuplicate" // Duplicating task
  | "taskConvert" // Converting to subtask or vice versa

  // Subtask Operations
  | "subtaskAdd" // Adding subtask
  | "subtaskComplete" // Completing subtask
  | "subtaskRemove" // Removing subtask

  // Project & Label Operations
  | "projectCreate" // Creating project
  | "projectDelete" // Deleting project
  | "projectSwitch" // Switching between projects
  | "labelAdd" // Adding label
  | "labelRemove" // Removing label

  // Navigation & UI
  | "navigationClick" // Menu/nav clicks
  | "dialogOpen" // Opening modal/dialog
  | "dialogClose" // Closing modal/dialog
  | "tabSwitch" // Switching tabs
  | "filterToggle" // Toggling filters
  | "viewChange" // Changing view mode
  | "pageTransition" // Page navigation

  // Notifications & Feedback
  | "reminderDue" // Task due reminder
  | "reminderOverdue" // Overdue notification
  | "achievementUnlock" // Milestone reached
  | "streakContinue" // Continuing streak
  | "streakBreak" // Breaking streak
  | "syncComplete" // Sync successful
  | "error" // Error occurred
  | "warning" // Warning message
  | "info" // Info notification

  // Bulk Operations
  | "bulkSelect" // Selecting multiple items
  | "bulkComplete" // Completing multiple tasks
  | "bulkDelete" // Deleting multiple tasks

  // Special Interactions
  | "focusMode" // Entering focus mode
  | "breakTime" // Break reminder
  | "dayComplete" // All tasks done for day
  | "weekComplete" // Weekly goal achieved
  | "ambient" // Background ambience

export interface SoundSuite {
  name: string
  description: string
  theme: string
  sounds: Record<InteractionType, SoundDefinition>
}

export interface SoundDefinition {
  frequencies: number[]
  durations: number[]
  waveTypes: OscillatorType[]
  volumes: number[]
  effects?: SoundEffect[]
  timing?: TimingPattern
  envelope?: EnvelopeConfig
}

export interface SoundEffect {
  type: "filter" | "reverb" | "delay" | "distortion" | "chorus"
  config: Record<string, unknown>
}

export interface TimingPattern {
  pattern: "sequential" | "simultaneous" | "staggered" | "rhythmic"
  delays?: number[]
  rhythm?: number[]
}

export interface EnvelopeConfig {
  attack: number
  decay: number
  sustain: number
  release: number
}

/**
 * 1. MINIMALIST SUITE - Clean, subtle, professional
 */
export const minimalistSuite: SoundSuite = {
  name: "Minimalist",
  description: "Clean and subtle sounds for professional environments",
  theme: "Professional, understated, elegant",
  sounds: {
    // Task completion - subtle click with harmonic
    taskComplete: {
      frequencies: [2093, 3136], // C7 + G7
      durations: [0.08, 0.06],
      waveTypes: ["sine", "sine"],
      volumes: [0.3, 0.15],
      timing: { pattern: "staggered", delays: [0, 0.02] },
      envelope: { attack: 0.001, decay: 0.02, sustain: 0.3, release: 0.05 },
    },

    // Task creation - gentle ascending tone
    taskCreate: {
      frequencies: [1047, 1319], // C6 to E6
      durations: [0.1, 0.1],
      waveTypes: ["sine", "sine"],
      volumes: [0.25, 0.25],
      timing: { pattern: "sequential", delays: [0, 0.08] },
      envelope: { attack: 0.02, decay: 0.03, sustain: 0.5, release: 0.05 },
    },

    // Task deletion - soft descending sweep
    taskDelete: {
      frequencies: [800, 400],
      durations: [0.15],
      waveTypes: ["sine"],
      volumes: [0.2],
      effects: [{ type: "filter", config: { type: "lowpass", frequency: 2000 } }],
      envelope: { attack: 0.01, decay: 0.02, sustain: 0.4, release: 0.1 },
    },

    // Continue with all other interactions...
    taskEdit: {
      frequencies: [1200],
      durations: [0.03],
      waveTypes: ["triangle"],
      volumes: [0.15],
      envelope: { attack: 0.001, decay: 0.01, sustain: 0.3, release: 0.02 },
    },

    taskMove: {
      frequencies: [600, 900],
      durations: [0.1],
      waveTypes: ["sine"],
      volumes: [0.2],
      effects: [{ type: "filter", config: { type: "bandpass", frequency: 750, Q: 2 } }],
      timing: { pattern: "sequential", delays: [0, 0.05] },
    },

    taskPriorityUp: {
      frequencies: [1000, 1500],
      durations: [0.05, 0.05],
      waveTypes: ["sine", "sine"],
      volumes: [0.2, 0.2],
      timing: { pattern: "sequential", delays: [0, 0.04] },
    },

    taskPriorityDown: {
      frequencies: [1500, 1000],
      durations: [0.05, 0.05],
      waveTypes: ["sine", "sine"],
      volumes: [0.2, 0.2],
      timing: { pattern: "sequential", delays: [0, 0.04] },
    },

    taskSchedule: {
      frequencies: [880, 1320],
      durations: [0.1, 0.08],
      waveTypes: ["sine", "sine"],
      volumes: [0.25, 0.2],
      timing: { pattern: "staggered", delays: [0, 0.05] },
    },

    taskUnschedule: {
      frequencies: [1320, 880],
      durations: [0.08, 0.1],
      waveTypes: ["sine", "sine"],
      volumes: [0.2, 0.25],
      timing: { pattern: "staggered", delays: [0, 0.05] },
    },

    taskRestore: {
      frequencies: [400, 600, 800],
      durations: [0.05, 0.05, 0.05],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.15, 0.2, 0.25],
      timing: { pattern: "sequential", delays: [0, 0.04, 0.08] },
    },

    taskDuplicate: {
      frequencies: [1047, 1047],
      durations: [0.05, 0.05],
      waveTypes: ["sine", "sine"],
      volumes: [0.25, 0.15],
      timing: { pattern: "staggered", delays: [0, 0.1] },
    },

    taskConvert: {
      frequencies: [800, 1200, 800],
      durations: [0.05, 0.05, 0.05],
      waveTypes: ["triangle", "triangle", "triangle"],
      volumes: [0.2, 0.25, 0.2],
      timing: { pattern: "sequential", delays: [0, 0.04, 0.08] },
    },

    subtaskAdd: {
      frequencies: [1568],
      durations: [0.04],
      waveTypes: ["sine"],
      volumes: [0.2],
      envelope: { attack: 0.001, decay: 0.01, sustain: 0.3, release: 0.03 },
    },

    subtaskComplete: {
      frequencies: [1865],
      durations: [0.05],
      waveTypes: ["sine"],
      volumes: [0.18],
      envelope: { attack: 0.001, decay: 0.01, sustain: 0.4, release: 0.04 },
    },

    subtaskRemove: {
      frequencies: [1568, 1047],
      durations: [0.03, 0.04],
      waveTypes: ["sine", "sine"],
      volumes: [0.15, 0.1],
      timing: { pattern: "sequential", delays: [0, 0.02] },
    },

    projectCreate: {
      frequencies: [523, 659, 784],
      durations: [0.1, 0.1, 0.1],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.2, 0.2, 0.2],
      timing: { pattern: "sequential", delays: [0, 0.08, 0.16] },
    },

    projectDelete: {
      frequencies: [784, 659, 523],
      durations: [0.08, 0.08, 0.1],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.15, 0.18, 0.2],
      timing: { pattern: "sequential", delays: [0, 0.06, 0.12] },
    },

    projectSwitch: {
      frequencies: [1047, 1175],
      durations: [0.05, 0.05],
      waveTypes: ["sine", "sine"],
      volumes: [0.2, 0.2],
      timing: { pattern: "simultaneous" },
    },

    labelAdd: {
      frequencies: [1397],
      durations: [0.06],
      waveTypes: ["triangle"],
      volumes: [0.18],
      envelope: { attack: 0.002, decay: 0.01, sustain: 0.4, release: 0.05 },
    },

    labelRemove: {
      frequencies: [1397, 1047],
      durations: [0.04, 0.05],
      waveTypes: ["triangle", "triangle"],
      volumes: [0.15, 0.12],
      timing: { pattern: "sequential", delays: [0, 0.03] },
    },

    navigationClick: {
      frequencies: [2500],
      durations: [0.02],
      waveTypes: ["square"],
      volumes: [0.1],
      envelope: { attack: 0.0005, decay: 0.005, sustain: 0.2, release: 0.014 },
    },

    dialogOpen: {
      frequencies: [400, 800],
      durations: [0.15],
      waveTypes: ["sine"],
      volumes: [0.2],
      effects: [{ type: "filter", config: { type: "lowpass", frequency: 3000 } }],
      envelope: { attack: 0.05, decay: 0.02, sustain: 0.5, release: 0.08 },
    },

    dialogClose: {
      frequencies: [800, 400],
      durations: [0.12],
      waveTypes: ["sine"],
      volumes: [0.18],
      effects: [{ type: "filter", config: { type: "lowpass", frequency: 2500 } }],
      envelope: { attack: 0.01, decay: 0.02, sustain: 0.4, release: 0.09 },
    },

    tabSwitch: {
      frequencies: [1200, 1400],
      durations: [0.03, 0.03],
      waveTypes: ["sine", "sine"],
      volumes: [0.15, 0.15],
      timing: { pattern: "staggered", delays: [0, 0.02] },
    },

    filterToggle: {
      frequencies: [1800],
      durations: [0.025],
      waveTypes: ["square"],
      volumes: [0.12],
      envelope: { attack: 0.001, decay: 0.005, sustain: 0.3, release: 0.019 },
    },

    viewChange: {
      frequencies: [600, 900, 1200],
      durations: [0.03, 0.03, 0.03],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.12, 0.14, 0.16],
      timing: { pattern: "sequential", delays: [0, 0.025, 0.05] },
    },

    pageTransition: {
      frequencies: [500, 1500],
      durations: [0.2],
      waveTypes: ["sawtooth"],
      volumes: [0.15],
      effects: [{ type: "filter", config: { type: "lowpass", frequency: 4000, sweep: true } }],
      envelope: { attack: 0.02, decay: 0.03, sustain: 0.3, release: 0.15 },
    },

    reminderDue: {
      frequencies: [660, 880],
      durations: [0.2, 0.15],
      waveTypes: ["sine", "sine"],
      volumes: [0.3, 0.25],
      timing: { pattern: "staggered", delays: [0, 0.15] },
    },

    reminderOverdue: {
      frequencies: [440, 440, 440],
      durations: [0.1, 0.1, 0.1],
      waveTypes: ["square", "square", "square"],
      volumes: [0.25, 0.25, 0.25],
      timing: { pattern: "rhythmic", rhythm: [0, 0.15, 0.3] },
    },

    achievementUnlock: {
      frequencies: [523, 659, 784, 1047],
      durations: [0.1, 0.1, 0.1, 0.2],
      waveTypes: ["sine", "sine", "sine", "sine"],
      volumes: [0.2, 0.22, 0.24, 0.3],
      timing: { pattern: "sequential", delays: [0, 0.08, 0.16, 0.24] },
    },

    streakContinue: {
      frequencies: [880, 1109, 1319],
      durations: [0.08, 0.08, 0.12],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.2, 0.22, 0.25],
      timing: { pattern: "sequential", delays: [0, 0.06, 0.12] },
    },

    streakBreak: {
      frequencies: [440, 349, 294],
      durations: [0.1, 0.1, 0.15],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.2, 0.18, 0.15],
      timing: { pattern: "sequential", delays: [0, 0.08, 0.16] },
    },

    syncComplete: {
      frequencies: [1047, 1319, 1568],
      durations: [0.05, 0.05, 0.08],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.15, 0.15, 0.2],
      timing: { pattern: "sequential", delays: [0, 0.04, 0.08] },
    },

    error: {
      frequencies: [200],
      durations: [0.3],
      waveTypes: ["square"],
      volumes: [0.3],
      envelope: { attack: 0.01, decay: 0.02, sustain: 0.7, release: 0.27 },
    },

    warning: {
      frequencies: [600, 600],
      durations: [0.1, 0.1],
      waveTypes: ["triangle", "triangle"],
      volumes: [0.25, 0.25],
      timing: { pattern: "rhythmic", rhythm: [0, 0.15] },
    },

    info: {
      frequencies: [1200],
      durations: [0.15],
      waveTypes: ["sine"],
      volumes: [0.2],
      envelope: { attack: 0.02, decay: 0.03, sustain: 0.5, release: 0.1 },
    },

    bulkSelect: {
      frequencies: [1500],
      durations: [0.02],
      waveTypes: ["square"],
      volumes: [0.1],
      envelope: { attack: 0.0005, decay: 0.005, sustain: 0.2, release: 0.014 },
    },

    bulkComplete: {
      frequencies: [1047, 1319, 1568, 2093],
      durations: [0.05, 0.05, 0.05, 0.1],
      waveTypes: ["sine", "sine", "sine", "sine"],
      volumes: [0.18, 0.2, 0.22, 0.25],
      timing: { pattern: "sequential", delays: [0, 0.03, 0.06, 0.09] },
    },

    bulkDelete: {
      frequencies: [800, 600, 400],
      durations: [0.05, 0.05, 0.1],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.2, 0.18, 0.15],
      timing: { pattern: "sequential", delays: [0, 0.04, 0.08] },
    },

    focusMode: {
      frequencies: [440],
      durations: [2.0],
      waveTypes: ["sine"],
      volumes: [0.1],
      effects: [{ type: "reverb", config: { roomSize: 0.8, wet: 0.3 } }],
      envelope: { attack: 0.5, decay: 0.3, sustain: 0.6, release: 1.2 },
    },

    breakTime: {
      frequencies: [523, 659, 523],
      durations: [0.2, 0.2, 0.3],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.25, 0.25, 0.3],
      timing: { pattern: "rhythmic", rhythm: [0, 0.25, 0.5] },
    },

    dayComplete: {
      frequencies: [261, 329, 392, 523, 659, 784, 1047],
      durations: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.3],
      waveTypes: ["sine", "sine", "sine", "sine", "sine", "sine", "sine"],
      volumes: [0.15, 0.17, 0.19, 0.21, 0.23, 0.25, 0.3],
      timing: { pattern: "sequential", delays: [0, 0.08, 0.16, 0.24, 0.32, 0.4, 0.48] },
    },

    weekComplete: {
      frequencies: [261, 329, 392, 523, 392, 523, 659, 784, 1047],
      durations: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.4],
      waveTypes: ["sine", "sine", "sine", "sine", "sine", "sine", "sine", "sine", "sine"],
      volumes: [0.15, 0.16, 0.17, 0.18, 0.17, 0.18, 0.2, 0.23, 0.3],
      timing: { pattern: "sequential", delays: [0, 0.06, 0.12, 0.18, 0.24, 0.3, 0.36, 0.42, 0.48] },
    },

    ambient: {
      frequencies: [110, 220, 330],
      durations: [10.0, 10.0, 10.0],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.05, 0.03, 0.02],
      effects: [{ type: "reverb", config: { roomSize: 0.9, wet: 0.5 } }],
      timing: { pattern: "simultaneous" },
      envelope: { attack: 2.0, decay: 1.0, sustain: 0.7, release: 7.0 },
    },
  },
}

/**
 * 2. NATURE SUITE - Organic, calming sounds inspired by nature
 */
export const natureSuite: SoundSuite = {
  name: "Nature",
  description: "Organic sounds inspired by natural environments",
  theme: "Calming, organic, earthy",
  sounds: {
    // Task completion - water drop
    taskComplete: {
      frequencies: [1200, 600, 300],
      durations: [0.05, 0.1, 0.2],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.3, 0.2, 0.1],
      timing: { pattern: "sequential", delays: [0, 0.04, 0.08] },
      effects: [{ type: "reverb", config: { roomSize: 0.4, wet: 0.3 } }],
      envelope: { attack: 0.001, decay: 0.02, sustain: 0.2, release: 0.15 },
    },

    // Task creation - bird chirp
    taskCreate: {
      frequencies: [2000, 2500, 2200],
      durations: [0.05, 0.03, 0.04],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.2, 0.25, 0.2],
      timing: { pattern: "sequential", delays: [0, 0.04, 0.07] },
      envelope: { attack: 0.001, decay: 0.01, sustain: 0.3, release: 0.02 },
    },

    // Task deletion - wind whoosh
    taskDelete: {
      frequencies: [300, 100],
      durations: [0.3],
      waveTypes: ["sawtooth"],
      volumes: [0.2],
      effects: [
        { type: "filter", config: { type: "lowpass", frequency: 800, sweep: true } },
        { type: "reverb", config: { roomSize: 0.6, wet: 0.4 } },
      ],
      envelope: { attack: 0.02, decay: 0.05, sustain: 0.3, release: 0.23 },
    },

    // Continue implementing all interactions with nature-inspired sounds...
    // (Wood knocks, rain drops, bird songs, wind chimes, etc.)

    taskEdit: {
      frequencies: [800, 1000],
      durations: [0.03, 0.03],
      waveTypes: ["triangle", "triangle"],
      volumes: [0.2, 0.15],
      timing: { pattern: "sequential", delays: [0, 0.025] },
      envelope: { attack: 0.001, decay: 0.01, sustain: 0.3, release: 0.02 },
    },

    taskMove: {
      frequencies: [400, 600, 800],
      durations: [0.1, 0.1, 0.1],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.15, 0.18, 0.2],
      effects: [{ type: "filter", config: { type: "bandpass", frequency: 600, Q: 1.5 } }],
      timing: { pattern: "staggered", delays: [0, 0.05, 0.1] },
    },

    // Rest of nature suite sounds...
    taskPriorityUp: {
      frequencies: [1500, 1800, 2100],
      durations: [0.04, 0.04, 0.04],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.18, 0.2, 0.22],
      timing: { pattern: "sequential", delays: [0, 0.03, 0.06] },
    },

    taskPriorityDown: {
      frequencies: [2100, 1800, 1500],
      durations: [0.04, 0.04, 0.04],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.22, 0.2, 0.18],
      timing: { pattern: "sequential", delays: [0, 0.03, 0.06] },
    },

    // ... (continuing with all other interactions in nature theme)
    taskSchedule: { frequencies: [1000], durations: [0.1], waveTypes: ["sine"], volumes: [0.2] },
    taskUnschedule: { frequencies: [1000], durations: [0.1], waveTypes: ["sine"], volumes: [0.2] },
    taskRestore: { frequencies: [500], durations: [0.1], waveTypes: ["sine"], volumes: [0.2] },
    taskDuplicate: { frequencies: [1200], durations: [0.1], waveTypes: ["sine"], volumes: [0.2] },
    taskConvert: { frequencies: [800], durations: [0.1], waveTypes: ["sine"], volumes: [0.2] },
    subtaskAdd: { frequencies: [1400], durations: [0.05], waveTypes: ["sine"], volumes: [0.18] },
    subtaskComplete: {
      frequencies: [1600],
      durations: [0.06],
      waveTypes: ["sine"],
      volumes: [0.2],
    },
    subtaskRemove: { frequencies: [1400], durations: [0.05], waveTypes: ["sine"], volumes: [0.15] },
    projectCreate: { frequencies: [600], durations: [0.2], waveTypes: ["sine"], volumes: [0.25] },
    projectDelete: { frequencies: [600], durations: [0.2], waveTypes: ["sine"], volumes: [0.2] },
    projectSwitch: { frequencies: [800], durations: [0.1], waveTypes: ["sine"], volumes: [0.2] },
    labelAdd: { frequencies: [1200], durations: [0.08], waveTypes: ["triangle"], volumes: [0.18] },
    labelRemove: {
      frequencies: [1200],
      durations: [0.08],
      waveTypes: ["triangle"],
      volumes: [0.15],
    },
    navigationClick: {
      frequencies: [2000],
      durations: [0.02],
      waveTypes: ["sine"],
      volumes: [0.1],
    },
    dialogOpen: { frequencies: [400], durations: [0.2], waveTypes: ["sine"], volumes: [0.2] },
    dialogClose: { frequencies: [400], durations: [0.2], waveTypes: ["sine"], volumes: [0.18] },
    tabSwitch: { frequencies: [1000], durations: [0.05], waveTypes: ["sine"], volumes: [0.15] },
    filterToggle: {
      frequencies: [1500],
      durations: [0.03],
      waveTypes: ["square"],
      volumes: [0.12],
    },
    viewChange: { frequencies: [700], durations: [0.1], waveTypes: ["sine"], volumes: [0.18] },
    pageTransition: { frequencies: [500], durations: [0.3], waveTypes: ["sine"], volumes: [0.2] },
    reminderDue: { frequencies: [800], durations: [0.3], waveTypes: ["sine"], volumes: [0.3] },
    reminderOverdue: { frequencies: [600], durations: [0.4], waveTypes: ["sine"], volumes: [0.35] },
    achievementUnlock: {
      frequencies: [1000],
      durations: [0.5],
      waveTypes: ["sine"],
      volumes: [0.3],
    },
    streakContinue: { frequencies: [1200], durations: [0.3], waveTypes: ["sine"], volumes: [0.25] },
    streakBreak: { frequencies: [400], durations: [0.4], waveTypes: ["sine"], volumes: [0.2] },
    syncComplete: { frequencies: [1500], durations: [0.2], waveTypes: ["sine"], volumes: [0.2] },
    error: { frequencies: [300], durations: [0.3], waveTypes: ["square"], volumes: [0.3] },
    warning: { frequencies: [500], durations: [0.2], waveTypes: ["triangle"], volumes: [0.25] },
    info: { frequencies: [1000], durations: [0.15], waveTypes: ["sine"], volumes: [0.2] },
    bulkSelect: { frequencies: [1800], durations: [0.02], waveTypes: ["sine"], volumes: [0.12] },
    bulkComplete: { frequencies: [1200], durations: [0.3], waveTypes: ["sine"], volumes: [0.25] },
    bulkDelete: { frequencies: [400], durations: [0.3], waveTypes: ["sine"], volumes: [0.2] },
    focusMode: { frequencies: [200], durations: [3.0], waveTypes: ["sine"], volumes: [0.1] },
    breakTime: { frequencies: [600], durations: [0.5], waveTypes: ["sine"], volumes: [0.25] },
    dayComplete: { frequencies: [800], durations: [1.0], waveTypes: ["sine"], volumes: [0.3] },
    weekComplete: { frequencies: [1000], durations: [1.5], waveTypes: ["sine"], volumes: [0.35] },
    ambient: { frequencies: [150], durations: [15.0], waveTypes: ["sine"], volumes: [0.05] },
  },
}

/**
 * 3. ARCADE SUITE - Fun, gamified, 8-bit inspired
 */
export const arcadeSuite: SoundSuite = {
  name: "Arcade",
  description: "Retro gaming-inspired sounds for a fun, gamified experience",
  theme: "Playful, energetic, nostalgic",
  sounds: {
    // Task completion - coin collect
    taskComplete: {
      frequencies: [988, 1319],
      durations: [0.05, 0.1],
      waveTypes: ["square", "square"],
      volumes: [0.25, 0.3],
      timing: { pattern: "sequential", delays: [0, 0.04] },
      envelope: { attack: 0.001, decay: 0.01, sustain: 0.5, release: 0.08 },
    },

    // Task creation - power up
    taskCreate: {
      frequencies: [400, 500, 600, 800],
      durations: [0.05, 0.05, 0.05, 0.08],
      waveTypes: ["square", "square", "square", "square"],
      volumes: [0.2, 0.22, 0.24, 0.28],
      timing: { pattern: "sequential", delays: [0, 0.04, 0.08, 0.12] },
    },

    // Continue with all arcade-style sounds...
    taskDelete: {
      frequencies: [800, 400, 200],
      durations: [0.05, 0.05, 0.1],
      waveTypes: ["square", "square", "square"],
      volumes: [0.25, 0.2, 0.15],
      timing: { pattern: "sequential", delays: [0, 0.04, 0.08] },
    },

    // ... (rest of arcade suite)
    taskEdit: { frequencies: [1200], durations: [0.03], waveTypes: ["square"], volumes: [0.2] },
    taskMove: {
      frequencies: [600, 1200],
      durations: [0.05, 0.05],
      waveTypes: ["square", "square"],
      volumes: [0.2, 0.2],
    },
    taskPriorityUp: {
      frequencies: [800, 1200, 1600],
      durations: [0.03, 0.03, 0.03],
      waveTypes: ["square", "square", "square"],
      volumes: [0.2, 0.22, 0.25],
    },
    taskPriorityDown: {
      frequencies: [1600, 1200, 800],
      durations: [0.03, 0.03, 0.03],
      waveTypes: ["square", "square", "square"],
      volumes: [0.25, 0.22, 0.2],
    },
    taskSchedule: { frequencies: [1000], durations: [0.1], waveTypes: ["square"], volumes: [0.25] },
    taskUnschedule: {
      frequencies: [1000],
      durations: [0.1],
      waveTypes: ["square"],
      volumes: [0.2],
    },
    taskRestore: {
      frequencies: [400, 800],
      durations: [0.05, 0.1],
      waveTypes: ["square", "square"],
      volumes: [0.2, 0.25],
    },
    taskDuplicate: {
      frequencies: [1200, 1200],
      durations: [0.05, 0.05],
      waveTypes: ["square", "square"],
      volumes: [0.25, 0.2],
    },
    taskConvert: {
      frequencies: [800, 1200, 800],
      durations: [0.04, 0.04, 0.04],
      waveTypes: ["square", "square", "square"],
      volumes: [0.2, 0.25, 0.2],
    },
    subtaskAdd: { frequencies: [1600], durations: [0.04], waveTypes: ["square"], volumes: [0.2] },
    subtaskComplete: {
      frequencies: [1800],
      durations: [0.05],
      waveTypes: ["square"],
      volumes: [0.22],
    },
    subtaskRemove: {
      frequencies: [1600, 1200],
      durations: [0.03, 0.04],
      waveTypes: ["square", "square"],
      volumes: [0.18, 0.15],
    },
    projectCreate: {
      frequencies: [400, 600, 800],
      durations: [0.08, 0.08, 0.08],
      waveTypes: ["square", "square", "square"],
      volumes: [0.2, 0.22, 0.25],
    },
    projectDelete: {
      frequencies: [800, 600, 400],
      durations: [0.08, 0.08, 0.08],
      waveTypes: ["square", "square", "square"],
      volumes: [0.2, 0.18, 0.15],
    },
    projectSwitch: {
      frequencies: [1000, 1200],
      durations: [0.05, 0.05],
      waveTypes: ["square", "square"],
      volumes: [0.2, 0.2],
    },
    labelAdd: { frequencies: [1400], durations: [0.06], waveTypes: ["square"], volumes: [0.2] },
    labelRemove: {
      frequencies: [1400, 1000],
      durations: [0.04, 0.05],
      waveTypes: ["square", "square"],
      volumes: [0.18, 0.15],
    },
    navigationClick: {
      frequencies: [2000],
      durations: [0.02],
      waveTypes: ["square"],
      volumes: [0.15],
    },
    dialogOpen: {
      frequencies: [400, 800],
      durations: [0.1, 0.1],
      waveTypes: ["square", "square"],
      volumes: [0.2, 0.22],
    },
    dialogClose: {
      frequencies: [800, 400],
      durations: [0.08, 0.1],
      waveTypes: ["square", "square"],
      volumes: [0.2, 0.18],
    },
    tabSwitch: {
      frequencies: [1200, 1400],
      durations: [0.03, 0.03],
      waveTypes: ["square", "square"],
      volumes: [0.18, 0.18],
    },
    filterToggle: {
      frequencies: [1800],
      durations: [0.025],
      waveTypes: ["square"],
      volumes: [0.15],
    },
    viewChange: {
      frequencies: [600, 900, 1200],
      durations: [0.03, 0.03, 0.03],
      waveTypes: ["square", "square", "square"],
      volumes: [0.15, 0.17, 0.2],
    },
    pageTransition: {
      frequencies: [400, 1600],
      durations: [0.15],
      waveTypes: ["square"],
      volumes: [0.2],
    },
    reminderDue: {
      frequencies: [800, 800],
      durations: [0.1, 0.1],
      waveTypes: ["square", "square"],
      volumes: [0.3, 0.3],
    },
    reminderOverdue: {
      frequencies: [600, 600, 600],
      durations: [0.1, 0.1, 0.1],
      waveTypes: ["square", "square", "square"],
      volumes: [0.3, 0.3, 0.3],
    },
    achievementUnlock: {
      frequencies: [400, 500, 600, 800, 1000, 1200],
      durations: [0.05, 0.05, 0.05, 0.05, 0.05, 0.1],
      waveTypes: ["square", "square", "square", "square", "square", "square"],
      volumes: [0.2, 0.22, 0.24, 0.26, 0.28, 0.35],
    },
    streakContinue: {
      frequencies: [800, 1000, 1200],
      durations: [0.05, 0.05, 0.08],
      waveTypes: ["square", "square", "square"],
      volumes: [0.2, 0.23, 0.28],
    },
    streakBreak: {
      frequencies: [400, 300, 200],
      durations: [0.08, 0.08, 0.12],
      waveTypes: ["square", "square", "square"],
      volumes: [0.25, 0.22, 0.18],
    },
    syncComplete: {
      frequencies: [1200, 1400, 1600],
      durations: [0.04, 0.04, 0.06],
      waveTypes: ["square", "square", "square"],
      volumes: [0.18, 0.2, 0.22],
    },
    error: {
      frequencies: [200, 200],
      durations: [0.15, 0.15],
      waveTypes: ["square", "square"],
      volumes: [0.35, 0.35],
    },
    warning: {
      frequencies: [600, 600],
      durations: [0.1, 0.1],
      waveTypes: ["square", "square"],
      volumes: [0.3, 0.3],
    },
    info: { frequencies: [1200], durations: [0.15], waveTypes: ["square"], volumes: [0.25] },
    bulkSelect: { frequencies: [1800], durations: [0.02], waveTypes: ["square"], volumes: [0.15] },
    bulkComplete: {
      frequencies: [800, 1000, 1200, 1600],
      durations: [0.04, 0.04, 0.04, 0.08],
      waveTypes: ["square", "square", "square", "square"],
      volumes: [0.2, 0.22, 0.25, 0.3],
    },
    bulkDelete: {
      frequencies: [800, 600, 400],
      durations: [0.05, 0.05, 0.08],
      waveTypes: ["square", "square", "square"],
      volumes: [0.25, 0.22, 0.18],
    },
    focusMode: { frequencies: [400], durations: [2.0], waveTypes: ["square"], volumes: [0.1] },
    breakTime: {
      frequencies: [600, 800, 600],
      durations: [0.15, 0.15, 0.2],
      waveTypes: ["square", "square", "square"],
      volumes: [0.25, 0.25, 0.3],
    },
    dayComplete: {
      frequencies: [400, 500, 600, 800, 1000, 1200, 1600],
      durations: [0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.2],
      waveTypes: ["square", "square", "square", "square", "square", "square", "square"],
      volumes: [0.18, 0.2, 0.22, 0.24, 0.26, 0.28, 0.35],
    },
    weekComplete: {
      frequencies: [400, 500, 600, 800, 600, 800, 1000, 1200, 1600],
      durations: [0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.3],
      waveTypes: [
        "square",
        "square",
        "square",
        "square",
        "square",
        "square",
        "square",
        "square",
        "square",
      ],
      volumes: [0.18, 0.19, 0.2, 0.21, 0.2, 0.21, 0.23, 0.26, 0.35],
    },
    ambient: {
      frequencies: [100, 200],
      durations: [8.0, 8.0],
      waveTypes: ["square", "square"],
      volumes: [0.05, 0.03],
    },
  },
}

/**
 * 4. PRODUCTIVITY SUITE - Motivating, achievement-focused
 */
export const productivitySuite: SoundSuite = {
  name: "Productivity",
  description: "Motivating sounds designed to boost focus and achievement",
  theme: "Professional, motivating, achievement-oriented",
  sounds: {
    // Task completion - satisfying check
    taskComplete: {
      frequencies: [1047, 1568, 2093],
      durations: [0.06, 0.05, 0.08],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.25, 0.28, 0.3],
      timing: { pattern: "sequential", delays: [0, 0.04, 0.08] },
      envelope: { attack: 0.001, decay: 0.015, sustain: 0.4, release: 0.04 },
    },

    // Continue with productivity-focused sounds...
    taskCreate: {
      frequencies: [784, 988, 1175],
      durations: [0.08, 0.08, 0.1],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.2, 0.23, 0.26],
      timing: { pattern: "sequential", delays: [0, 0.06, 0.12] },
    },

    // ... (rest of productivity suite)
    taskDelete: { frequencies: [1000, 500], durations: [0.1], waveTypes: ["sine"], volumes: [0.2] },
    taskEdit: { frequencies: [1400], durations: [0.04], waveTypes: ["sine"], volumes: [0.18] },
    taskMove: {
      frequencies: [800, 1200],
      durations: [0.08, 0.08],
      waveTypes: ["sine", "sine"],
      volumes: [0.2, 0.22],
    },
    taskPriorityUp: {
      frequencies: [1000, 1400, 1800],
      durations: [0.05, 0.05, 0.05],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.2, 0.23, 0.26],
    },
    taskPriorityDown: {
      frequencies: [1800, 1400, 1000],
      durations: [0.05, 0.05, 0.05],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.26, 0.23, 0.2],
    },
    taskSchedule: {
      frequencies: [1175, 1568],
      durations: [0.08, 0.1],
      waveTypes: ["sine", "sine"],
      volumes: [0.22, 0.25],
    },
    taskUnschedule: {
      frequencies: [1568, 1175],
      durations: [0.08, 0.1],
      waveTypes: ["sine", "sine"],
      volumes: [0.22, 0.2],
    },
    taskRestore: {
      frequencies: [600, 900, 1200],
      durations: [0.06, 0.06, 0.08],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.18, 0.21, 0.25],
    },
    taskDuplicate: {
      frequencies: [1319, 1319],
      durations: [0.06, 0.06],
      waveTypes: ["sine", "sine"],
      volumes: [0.25, 0.2],
    },
    taskConvert: {
      frequencies: [1000, 1500, 1000],
      durations: [0.05, 0.05, 0.05],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.2, 0.25, 0.2],
    },
    subtaskAdd: { frequencies: [1760], durations: [0.05], waveTypes: ["sine"], volumes: [0.2] },
    subtaskComplete: {
      frequencies: [2093],
      durations: [0.06],
      waveTypes: ["sine"],
      volumes: [0.22],
    },
    subtaskRemove: {
      frequencies: [1760, 1319],
      durations: [0.04, 0.05],
      waveTypes: ["sine", "sine"],
      volumes: [0.18, 0.15],
    },
    projectCreate: {
      frequencies: [659, 784, 988],
      durations: [0.1, 0.1, 0.12],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.22, 0.24, 0.28],
    },
    projectDelete: {
      frequencies: [988, 784, 659],
      durations: [0.08, 0.09, 0.1],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.2, 0.19, 0.17],
    },
    projectSwitch: {
      frequencies: [1175, 1319],
      durations: [0.06, 0.06],
      waveTypes: ["sine", "sine"],
      volumes: [0.22, 0.22],
    },
    labelAdd: { frequencies: [1568], durations: [0.07], waveTypes: ["sine"], volumes: [0.2] },
    labelRemove: {
      frequencies: [1568, 1175],
      durations: [0.05, 0.06],
      waveTypes: ["sine", "sine"],
      volumes: [0.18, 0.15],
    },
    navigationClick: {
      frequencies: [2500],
      durations: [0.02],
      waveTypes: ["sine"],
      volumes: [0.12],
    },
    dialogOpen: {
      frequencies: [523, 1047],
      durations: [0.15],
      waveTypes: ["sine"],
      volumes: [0.22],
    },
    dialogClose: {
      frequencies: [1047, 523],
      durations: [0.12],
      waveTypes: ["sine"],
      volumes: [0.2],
    },
    tabSwitch: {
      frequencies: [1319, 1568],
      durations: [0.04, 0.04],
      waveTypes: ["sine", "sine"],
      volumes: [0.18, 0.18],
    },
    filterToggle: { frequencies: [2093], durations: [0.03], waveTypes: ["sine"], volumes: [0.15] },
    viewChange: {
      frequencies: [784, 1175, 1568],
      durations: [0.04, 0.04, 0.04],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.16, 0.18, 0.2],
    },
    pageTransition: {
      frequencies: [600, 1800],
      durations: [0.2],
      waveTypes: ["sine"],
      volumes: [0.18],
    },
    reminderDue: {
      frequencies: [880, 1175],
      durations: [0.2, 0.18],
      waveTypes: ["sine", "sine"],
      volumes: [0.3, 0.28],
    },
    reminderOverdue: {
      frequencies: [659, 659, 659],
      durations: [0.12, 0.12, 0.12],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.32, 0.32, 0.32],
    },
    achievementUnlock: {
      frequencies: [659, 784, 988, 1319],
      durations: [0.1, 0.1, 0.1, 0.2],
      waveTypes: ["sine", "sine", "sine", "sine"],
      volumes: [0.22, 0.25, 0.28, 0.35],
    },
    streakContinue: {
      frequencies: [988, 1175, 1568],
      durations: [0.08, 0.08, 0.12],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.22, 0.25, 0.3],
    },
    streakBreak: {
      frequencies: [659, 523, 440],
      durations: [0.1, 0.1, 0.15],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.22, 0.2, 0.17],
    },
    syncComplete: {
      frequencies: [1319, 1568, 2093],
      durations: [0.06, 0.06, 0.1],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.18, 0.2, 0.24],
    },
    error: { frequencies: [294], durations: [0.3], waveTypes: ["sine"], volumes: [0.32] },
    warning: {
      frequencies: [740, 740],
      durations: [0.12, 0.12],
      waveTypes: ["sine", "sine"],
      volumes: [0.28, 0.28],
    },
    info: { frequencies: [1319], durations: [0.18], waveTypes: ["sine"], volumes: [0.22] },
    bulkSelect: { frequencies: [2093], durations: [0.025], waveTypes: ["sine"], volumes: [0.14] },
    bulkComplete: {
      frequencies: [1175, 1319, 1568, 2093],
      durations: [0.06, 0.06, 0.06, 0.12],
      waveTypes: ["sine", "sine", "sine", "sine"],
      volumes: [0.2, 0.23, 0.26, 0.32],
    },
    bulkDelete: {
      frequencies: [988, 784, 523],
      durations: [0.06, 0.06, 0.12],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.22, 0.2, 0.17],
    },
    focusMode: { frequencies: [523], durations: [2.5], waveTypes: ["sine"], volumes: [0.12] },
    breakTime: {
      frequencies: [659, 880, 659],
      durations: [0.25, 0.25, 0.35],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.28, 0.28, 0.32],
    },
    dayComplete: {
      frequencies: [392, 494, 587, 784, 988, 1175, 1568],
      durations: [0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.35],
      waveTypes: ["sine", "sine", "sine", "sine", "sine", "sine", "sine"],
      volumes: [0.18, 0.2, 0.22, 0.24, 0.26, 0.28, 0.38],
    },
    weekComplete: {
      frequencies: [392, 494, 587, 784, 587, 784, 988, 1175, 1568],
      durations: [0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.5],
      waveTypes: ["sine", "sine", "sine", "sine", "sine", "sine", "sine", "sine", "sine"],
      volumes: [0.17, 0.18, 0.19, 0.2, 0.19, 0.2, 0.23, 0.27, 0.4],
    },
    ambient: {
      frequencies: [165, 330, 495],
      durations: [12.0, 12.0, 12.0],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.06, 0.04, 0.03],
    },
  },
}

/**
 * 5. ZEN SUITE - Mindful, meditation-inspired
 */
export const zenSuite: SoundSuite = {
  name: "Zen",
  description: "Calming, mindful sounds inspired by meditation practices",
  theme: "Peaceful, mindful, harmonious",
  sounds: {
    // Task completion - meditation bowl
    taskComplete: {
      frequencies: [528, 1056, 1584],
      durations: [0.8, 0.6, 0.4],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.3, 0.15, 0.08],
      timing: { pattern: "simultaneous" },
      effects: [{ type: "reverb", config: { roomSize: 0.8, wet: 0.5 } }],
      envelope: { attack: 0.05, decay: 0.1, sustain: 0.6, release: 0.65 },
    },

    // Continue with zen/meditation sounds...
    taskCreate: {
      frequencies: [396, 639, 852],
      durations: [0.6, 0.5, 0.4],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.25, 0.2, 0.15],
      timing: { pattern: "staggered", delays: [0, 0.1, 0.2] },
      effects: [{ type: "reverb", config: { roomSize: 0.7, wet: 0.4 } }],
    },

    // ... (rest of zen suite)
    taskDelete: {
      frequencies: [432],
      durations: [0.5],
      waveTypes: ["sine"],
      volumes: [0.2],
      effects: [{ type: "reverb", config: { roomSize: 0.6, wet: 0.4 } }],
    },
    taskEdit: { frequencies: [639], durations: [0.3], waveTypes: ["sine"], volumes: [0.18] },
    taskMove: {
      frequencies: [528, 792],
      durations: [0.4, 0.4],
      waveTypes: ["sine", "sine"],
      volumes: [0.2, 0.18],
    },
    taskPriorityUp: {
      frequencies: [639, 852, 1074],
      durations: [0.3, 0.3, 0.3],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.18, 0.2, 0.22],
    },
    taskPriorityDown: {
      frequencies: [1074, 852, 639],
      durations: [0.3, 0.3, 0.3],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.22, 0.2, 0.18],
    },
    taskSchedule: { frequencies: [741], durations: [0.4], waveTypes: ["sine"], volumes: [0.22] },
    taskUnschedule: { frequencies: [639], durations: [0.4], waveTypes: ["sine"], volumes: [0.2] },
    taskRestore: {
      frequencies: [396, 528, 639],
      durations: [0.3, 0.3, 0.3],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.17, 0.19, 0.22],
    },
    taskDuplicate: {
      frequencies: [852, 852],
      durations: [0.3, 0.3],
      waveTypes: ["sine", "sine"],
      volumes: [0.22, 0.18],
    },
    taskConvert: {
      frequencies: [528, 792, 528],
      durations: [0.25, 0.25, 0.25],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.18, 0.22, 0.18],
    },
    subtaskAdd: { frequencies: [963], durations: [0.25], waveTypes: ["sine"], volumes: [0.18] },
    subtaskComplete: { frequencies: [1074], durations: [0.3], waveTypes: ["sine"], volumes: [0.2] },
    subtaskRemove: {
      frequencies: [963, 741],
      durations: [0.2, 0.25],
      waveTypes: ["sine", "sine"],
      volumes: [0.16, 0.14],
    },
    projectCreate: {
      frequencies: [396, 528, 639],
      durations: [0.4, 0.4, 0.4],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.2, 0.22, 0.25],
    },
    projectDelete: {
      frequencies: [639, 528, 396],
      durations: [0.35, 0.38, 0.4],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.18, 0.17, 0.15],
    },
    projectSwitch: {
      frequencies: [741, 852],
      durations: [0.3, 0.3],
      waveTypes: ["sine", "sine"],
      volumes: [0.2, 0.2],
    },
    labelAdd: { frequencies: [852], durations: [0.35], waveTypes: ["sine"], volumes: [0.18] },
    labelRemove: {
      frequencies: [852, 639],
      durations: [0.25, 0.3],
      waveTypes: ["sine", "sine"],
      volumes: [0.16, 0.14],
    },
    navigationClick: {
      frequencies: [1200],
      durations: [0.08],
      waveTypes: ["sine"],
      volumes: [0.1],
    },
    dialogOpen: { frequencies: [396, 792], durations: [0.5], waveTypes: ["sine"], volumes: [0.2] },
    dialogClose: {
      frequencies: [792, 396],
      durations: [0.45],
      waveTypes: ["sine"],
      volumes: [0.18],
    },
    tabSwitch: {
      frequencies: [741, 852],
      durations: [0.2, 0.2],
      waveTypes: ["sine", "sine"],
      volumes: [0.16, 0.16],
    },
    filterToggle: { frequencies: [963], durations: [0.15], waveTypes: ["sine"], volumes: [0.14] },
    viewChange: {
      frequencies: [528, 741, 963],
      durations: [0.2, 0.2, 0.2],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.15, 0.17, 0.19],
    },
    pageTransition: {
      frequencies: [432, 864],
      durations: [0.6],
      waveTypes: ["sine"],
      volumes: [0.17],
    },
    reminderDue: {
      frequencies: [528, 792],
      durations: [0.5, 0.4],
      waveTypes: ["sine", "sine"],
      volumes: [0.28, 0.25],
    },
    reminderOverdue: {
      frequencies: [396, 396],
      durations: [0.4, 0.4],
      waveTypes: ["sine", "sine"],
      volumes: [0.3, 0.3],
    },
    achievementUnlock: {
      frequencies: [396, 528, 639, 852],
      durations: [0.4, 0.4, 0.4, 0.5],
      waveTypes: ["sine", "sine", "sine", "sine"],
      volumes: [0.2, 0.23, 0.26, 0.32],
    },
    streakContinue: {
      frequencies: [639, 852, 1074],
      durations: [0.35, 0.35, 0.4],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.2, 0.23, 0.28],
    },
    streakBreak: {
      frequencies: [528, 432, 396],
      durations: [0.4, 0.4, 0.5],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.2, 0.18, 0.15],
    },
    syncComplete: {
      frequencies: [741, 963, 1074],
      durations: [0.3, 0.3, 0.4],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.17, 0.19, 0.22],
    },
    error: { frequencies: [285], durations: [0.6], waveTypes: ["sine"], volumes: [0.28] },
    warning: {
      frequencies: [417, 417],
      durations: [0.35, 0.35],
      waveTypes: ["sine", "sine"],
      volumes: [0.25, 0.25],
    },
    info: { frequencies: [741], durations: [0.4], waveTypes: ["sine"], volumes: [0.2] },
    bulkSelect: { frequencies: [963], durations: [0.1], waveTypes: ["sine"], volumes: [0.12] },
    bulkComplete: {
      frequencies: [639, 741, 852, 1074],
      durations: [0.3, 0.3, 0.3, 0.4],
      waveTypes: ["sine", "sine", "sine", "sine"],
      volumes: [0.18, 0.21, 0.24, 0.3],
    },
    bulkDelete: {
      frequencies: [639, 528, 396],
      durations: [0.3, 0.3, 0.4],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.2, 0.18, 0.15],
    },
    focusMode: {
      frequencies: [396],
      durations: [5.0],
      waveTypes: ["sine"],
      volumes: [0.1],
      effects: [{ type: "reverb", config: { roomSize: 0.9, wet: 0.6 } }],
    },
    breakTime: {
      frequencies: [528, 639, 528],
      durations: [0.6, 0.6, 0.8],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.25, 0.25, 0.28],
    },
    dayComplete: {
      frequencies: [285, 396, 417, 528, 639, 741, 852],
      durations: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.8],
      waveTypes: ["sine", "sine", "sine", "sine", "sine", "sine", "sine"],
      volumes: [0.15, 0.17, 0.19, 0.21, 0.23, 0.25, 0.32],
    },
    weekComplete: {
      frequencies: [285, 396, 417, 528, 417, 528, 639, 741, 852],
      durations: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1.0],
      waveTypes: ["sine", "sine", "sine", "sine", "sine", "sine", "sine", "sine", "sine"],
      volumes: [0.14, 0.16, 0.18, 0.2, 0.18, 0.2, 0.23, 0.26, 0.35],
    },
    ambient: {
      frequencies: [174, 285, 396],
      durations: [20.0, 20.0, 20.0],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.05, 0.04, 0.03],
      effects: [{ type: "reverb", config: { roomSize: 0.95, wet: 0.7 } }],
    },
  },
}

/**
 * 6. RETRO SUITE - Nostalgic, vintage computer sounds
 */
export const retroSuite: SoundSuite = {
  name: "Retro",
  description: "Vintage computer and terminal sounds for nostalgic users",
  theme: "Nostalgic, vintage, classic computing",
  sounds: {
    // Task completion - terminal beep
    taskComplete: {
      frequencies: [800],
      durations: [0.1],
      waveTypes: ["square"],
      volumes: [0.3],
      envelope: { attack: 0.001, decay: 0.01, sustain: 0.8, release: 0.089 },
    },

    // Continue with retro computer sounds...
    taskCreate: {
      frequencies: [440, 880],
      durations: [0.05, 0.05],
      waveTypes: ["square", "square"],
      volumes: [0.25, 0.25],
      timing: { pattern: "sequential", delays: [0, 0.05] },
    },

    // ... (rest of retro suite)
    taskDelete: {
      frequencies: [880, 440],
      durations: [0.05, 0.08],
      waveTypes: ["square", "square"],
      volumes: [0.25, 0.2],
    },
    taskEdit: { frequencies: [1000], durations: [0.03], waveTypes: ["square"], volumes: [0.2] },
    taskMove: {
      frequencies: [600, 800],
      durations: [0.05, 0.05],
      waveTypes: ["square", "square"],
      volumes: [0.2, 0.2],
    },
    taskPriorityUp: {
      frequencies: [600, 800, 1000],
      durations: [0.04, 0.04, 0.04],
      waveTypes: ["square", "square", "square"],
      volumes: [0.2, 0.22, 0.24],
    },
    taskPriorityDown: {
      frequencies: [1000, 800, 600],
      durations: [0.04, 0.04, 0.04],
      waveTypes: ["square", "square", "square"],
      volumes: [0.24, 0.22, 0.2],
    },
    taskSchedule: { frequencies: [750], durations: [0.08], waveTypes: ["square"], volumes: [0.22] },
    taskUnschedule: {
      frequencies: [650],
      durations: [0.08],
      waveTypes: ["square"],
      volumes: [0.2],
    },
    taskRestore: {
      frequencies: [400, 600, 800],
      durations: [0.05, 0.05, 0.06],
      waveTypes: ["square", "square", "square"],
      volumes: [0.18, 0.2, 0.23],
    },
    taskDuplicate: {
      frequencies: [880, 880],
      durations: [0.05, 0.05],
      waveTypes: ["square", "square"],
      volumes: [0.23, 0.18],
    },
    taskConvert: {
      frequencies: [700, 900, 700],
      durations: [0.04, 0.04, 0.04],
      waveTypes: ["square", "square", "square"],
      volumes: [0.2, 0.23, 0.2],
    },
    subtaskAdd: { frequencies: [1100], durations: [0.04], waveTypes: ["square"], volumes: [0.18] },
    subtaskComplete: {
      frequencies: [1200],
      durations: [0.05],
      waveTypes: ["square"],
      volumes: [0.2],
    },
    subtaskRemove: {
      frequencies: [1100, 900],
      durations: [0.03, 0.04],
      waveTypes: ["square", "square"],
      volumes: [0.16, 0.14],
    },
    projectCreate: {
      frequencies: [440, 550, 660],
      durations: [0.08, 0.08, 0.1],
      waveTypes: ["square", "square", "square"],
      volumes: [0.2, 0.22, 0.25],
    },
    projectDelete: {
      frequencies: [660, 550, 440],
      durations: [0.07, 0.08, 0.09],
      waveTypes: ["square", "square", "square"],
      volumes: [0.18, 0.17, 0.15],
    },
    projectSwitch: {
      frequencies: [770, 880],
      durations: [0.05, 0.05],
      waveTypes: ["square", "square"],
      volumes: [0.2, 0.2],
    },
    labelAdd: { frequencies: [990], durations: [0.06], waveTypes: ["square"], volumes: [0.18] },
    labelRemove: {
      frequencies: [990, 770],
      durations: [0.04, 0.05],
      waveTypes: ["square", "square"],
      volumes: [0.16, 0.14],
    },
    navigationClick: {
      frequencies: [1500],
      durations: [0.02],
      waveTypes: ["square"],
      volumes: [0.12],
    },
    dialogOpen: {
      frequencies: [330, 660],
      durations: [0.12],
      waveTypes: ["square"],
      volumes: [0.2],
    },
    dialogClose: {
      frequencies: [660, 330],
      durations: [0.1],
      waveTypes: ["square"],
      volumes: [0.18],
    },
    tabSwitch: {
      frequencies: [880, 990],
      durations: [0.03, 0.03],
      waveTypes: ["square", "square"],
      volumes: [0.16, 0.16],
    },
    filterToggle: {
      frequencies: [1320],
      durations: [0.025],
      waveTypes: ["square"],
      volumes: [0.14],
    },
    viewChange: {
      frequencies: [550, 770, 990],
      durations: [0.03, 0.03, 0.03],
      waveTypes: ["square", "square", "square"],
      volumes: [0.14, 0.16, 0.18],
    },
    pageTransition: {
      frequencies: [330, 1320],
      durations: [0.15],
      waveTypes: ["square"],
      volumes: [0.18],
    },
    reminderDue: {
      frequencies: [660, 660],
      durations: [0.15, 0.15],
      waveTypes: ["square", "square"],
      volumes: [0.28, 0.28],
    },
    reminderOverdue: {
      frequencies: [440, 440, 440],
      durations: [0.12, 0.12, 0.12],
      waveTypes: ["square", "square", "square"],
      volumes: [0.3, 0.3, 0.3],
    },
    achievementUnlock: {
      frequencies: [330, 440, 550, 660, 880],
      durations: [0.08, 0.08, 0.08, 0.08, 0.15],
      waveTypes: ["square", "square", "square", "square", "square"],
      volumes: [0.2, 0.22, 0.24, 0.26, 0.32],
    },
    streakContinue: {
      frequencies: [660, 770, 990],
      durations: [0.07, 0.07, 0.1],
      waveTypes: ["square", "square", "square"],
      volumes: [0.2, 0.23, 0.28],
    },
    streakBreak: {
      frequencies: [550, 440, 330],
      durations: [0.08, 0.08, 0.12],
      waveTypes: ["square", "square", "square"],
      volumes: [0.22, 0.2, 0.17],
    },
    syncComplete: {
      frequencies: [880, 990, 1100],
      durations: [0.05, 0.05, 0.08],
      waveTypes: ["square", "square", "square"],
      volumes: [0.17, 0.19, 0.22],
    },
    error: {
      frequencies: [220, 220],
      durations: [0.2, 0.2],
      waveTypes: ["square", "square"],
      volumes: [0.32, 0.32],
    },
    warning: {
      frequencies: [440, 440],
      durations: [0.12, 0.12],
      waveTypes: ["square", "square"],
      volumes: [0.28, 0.28],
    },
    info: { frequencies: [880], durations: [0.15], waveTypes: ["square"], volumes: [0.22] },
    bulkSelect: { frequencies: [1100], durations: [0.02], waveTypes: ["square"], volumes: [0.14] },
    bulkComplete: {
      frequencies: [660, 770, 880, 1100],
      durations: [0.05, 0.05, 0.05, 0.1],
      waveTypes: ["square", "square", "square", "square"],
      volumes: [0.2, 0.22, 0.25, 0.3],
    },
    bulkDelete: {
      frequencies: [660, 550, 440],
      durations: [0.05, 0.05, 0.1],
      waveTypes: ["square", "square", "square"],
      volumes: [0.22, 0.2, 0.17],
    },
    focusMode: { frequencies: [330], durations: [2.0], waveTypes: ["square"], volumes: [0.1] },
    breakTime: {
      frequencies: [550, 660, 550],
      durations: [0.2, 0.2, 0.3],
      waveTypes: ["square", "square", "square"],
      volumes: [0.25, 0.25, 0.3],
    },
    dayComplete: {
      frequencies: [330, 440, 550, 660, 770, 880, 1100],
      durations: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.3],
      waveTypes: ["square", "square", "square", "square", "square", "square", "square"],
      volumes: [0.16, 0.18, 0.2, 0.22, 0.24, 0.26, 0.35],
    },
    weekComplete: {
      frequencies: [330, 440, 550, 660, 550, 660, 770, 880, 1100],
      durations: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.4],
      waveTypes: [
        "square",
        "square",
        "square",
        "square",
        "square",
        "square",
        "square",
        "square",
        "square",
      ],
      volumes: [0.15, 0.17, 0.19, 0.21, 0.19, 0.21, 0.24, 0.27, 0.38],
    },
    ambient: {
      frequencies: [110, 220],
      durations: [10.0, 10.0],
      waveTypes: ["square", "square"],
      volumes: [0.04, 0.02],
    },
  },
}

/**
 * 7. SPACE SUITE - Futuristic, sci-fi inspired
 */
export const spaceSuite: SoundSuite = {
  name: "Space",
  description: "Futuristic sounds inspired by sci-fi and space exploration",
  theme: "Futuristic, cosmic, otherworldly",
  sounds: {
    // Task completion - space transmission
    taskComplete: {
      frequencies: [440, 660, 880, 1320],
      durations: [0.08, 0.06, 0.04, 0.1],
      waveTypes: ["sine", "triangle", "sine", "sine"],
      volumes: [0.2, 0.22, 0.24, 0.28],
      timing: { pattern: "sequential", delays: [0, 0.06, 0.11, 0.14] },
      effects: [
        { type: "filter", config: { type: "highpass", frequency: 300 } },
        { type: "delay", config: { time: 0.05, feedback: 0.3, wet: 0.2 } },
      ],
    },

    // Continue with space/sci-fi sounds...
    taskCreate: {
      frequencies: [220, 440, 880, 1760],
      durations: [0.1, 0.08, 0.06, 0.12],
      waveTypes: ["sawtooth", "sawtooth", "sine", "sine"],
      volumes: [0.15, 0.18, 0.21, 0.25],
      timing: { pattern: "sequential", delays: [0, 0.08, 0.15, 0.2] },
      effects: [{ type: "reverb", config: { roomSize: 0.7, wet: 0.4 } }],
    },

    // ... (rest of space suite)
    taskDelete: {
      frequencies: [1760, 440],
      durations: [0.2],
      waveTypes: ["sawtooth"],
      volumes: [0.2],
      effects: [{ type: "filter", config: { type: "lowpass", frequency: 1000, sweep: true } }],
    },
    taskEdit: { frequencies: [1320], durations: [0.04], waveTypes: ["triangle"], volumes: [0.18] },
    taskMove: {
      frequencies: [660, 990, 1320],
      durations: [0.06, 0.06, 0.06],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.18, 0.2, 0.22],
      effects: [{ type: "delay", config: { time: 0.03, feedback: 0.4, wet: 0.3 } }],
    },
    taskPriorityUp: {
      frequencies: [880, 1320, 1760],
      durations: [0.05, 0.05, 0.05],
      waveTypes: ["triangle", "triangle", "triangle"],
      volumes: [0.2, 0.23, 0.26],
    },
    taskPriorityDown: {
      frequencies: [1760, 1320, 880],
      durations: [0.05, 0.05, 0.05],
      waveTypes: ["triangle", "triangle", "triangle"],
      volumes: [0.26, 0.23, 0.2],
    },
    taskSchedule: {
      frequencies: [990, 1485],
      durations: [0.08, 0.1],
      waveTypes: ["sine", "sine"],
      volumes: [0.22, 0.25],
      effects: [{ type: "reverb", config: { roomSize: 0.5, wet: 0.3 } }],
    },
    taskUnschedule: {
      frequencies: [1485, 990],
      durations: [0.08, 0.1],
      waveTypes: ["sine", "sine"],
      volumes: [0.22, 0.2],
      effects: [{ type: "reverb", config: { roomSize: 0.5, wet: 0.3 } }],
    },
    taskRestore: {
      frequencies: [440, 660, 880],
      durations: [0.06, 0.06, 0.08],
      waveTypes: ["sawtooth", "sawtooth", "sawtooth"],
      volumes: [0.17, 0.2, 0.24],
    },
    taskDuplicate: {
      frequencies: [1320, 1320],
      durations: [0.06, 0.06],
      waveTypes: ["sine", "sine"],
      volumes: [0.24, 0.19],
      effects: [{ type: "delay", config: { time: 0.1, feedback: 0.5, wet: 0.4 } }],
    },
    taskConvert: {
      frequencies: [880, 1320, 880],
      durations: [0.05, 0.05, 0.05],
      waveTypes: ["triangle", "triangle", "triangle"],
      volumes: [0.2, 0.25, 0.2],
    },
    subtaskAdd: { frequencies: [1980], durations: [0.05], waveTypes: ["sine"], volumes: [0.19] },
    subtaskComplete: {
      frequencies: [2200],
      durations: [0.06],
      waveTypes: ["sine"],
      volumes: [0.21],
    },
    subtaskRemove: {
      frequencies: [1980, 1320],
      durations: [0.04, 0.05],
      waveTypes: ["sine", "sine"],
      volumes: [0.17, 0.14],
    },
    projectCreate: {
      frequencies: [440, 660, 880, 1320],
      durations: [0.1, 0.1, 0.1, 0.15],
      waveTypes: ["sawtooth", "sawtooth", "sine", "sine"],
      volumes: [0.2, 0.22, 0.25, 0.3],
    },
    projectDelete: {
      frequencies: [1320, 880, 660, 440],
      durations: [0.08, 0.09, 0.1, 0.12],
      waveTypes: ["sine", "sine", "sawtooth", "sawtooth"],
      volumes: [0.18, 0.17, 0.16, 0.14],
    },
    projectSwitch: {
      frequencies: [990, 1320],
      durations: [0.06, 0.06],
      waveTypes: ["sine", "sine"],
      volumes: [0.21, 0.21],
      effects: [{ type: "delay", config: { time: 0.05, feedback: 0.3, wet: 0.2 } }],
    },
    labelAdd: { frequencies: [1760], durations: [0.07], waveTypes: ["triangle"], volumes: [0.19] },
    labelRemove: {
      frequencies: [1760, 1320],
      durations: [0.05, 0.06],
      waveTypes: ["triangle", "triangle"],
      volumes: [0.17, 0.14],
    },
    navigationClick: {
      frequencies: [2640],
      durations: [0.02],
      waveTypes: ["sine"],
      volumes: [0.11],
    },
    dialogOpen: {
      frequencies: [330, 1320],
      durations: [0.2],
      waveTypes: ["sawtooth"],
      volumes: [0.21],
      effects: [{ type: "filter", config: { type: "bandpass", frequency: 800, Q: 2 } }],
    },
    dialogClose: {
      frequencies: [1320, 330],
      durations: [0.18],
      waveTypes: ["sawtooth"],
      volumes: [0.19],
      effects: [{ type: "filter", config: { type: "bandpass", frequency: 800, Q: 2 } }],
    },
    tabSwitch: {
      frequencies: [1485, 1760],
      durations: [0.04, 0.04],
      waveTypes: ["sine", "sine"],
      volumes: [0.17, 0.17],
    },
    filterToggle: {
      frequencies: [2200],
      durations: [0.03],
      waveTypes: ["triangle"],
      volumes: [0.14],
    },
    viewChange: {
      frequencies: [660, 990, 1485],
      durations: [0.04, 0.04, 0.04],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.15, 0.17, 0.2],
      effects: [{ type: "delay", config: { time: 0.02, feedback: 0.4, wet: 0.3 } }],
    },
    pageTransition: {
      frequencies: [220, 2200],
      durations: [0.25],
      waveTypes: ["sawtooth"],
      volumes: [0.18],
      effects: [{ type: "filter", config: { type: "lowpass", frequency: 5000, sweep: true } }],
    },
    reminderDue: {
      frequencies: [880, 1320],
      durations: [0.25, 0.2],
      waveTypes: ["sine", "sine"],
      volumes: [0.3, 0.28],
      effects: [{ type: "reverb", config: { roomSize: 0.6, wet: 0.4 } }],
    },
    reminderOverdue: {
      frequencies: [660, 660, 660],
      durations: [0.15, 0.15, 0.15],
      waveTypes: ["triangle", "triangle", "triangle"],
      volumes: [0.32, 0.32, 0.32],
    },
    achievementUnlock: {
      frequencies: [440, 660, 880, 1320, 1760],
      durations: [0.1, 0.1, 0.1, 0.1, 0.2],
      waveTypes: ["sawtooth", "sawtooth", "sine", "sine", "sine"],
      volumes: [0.2, 0.23, 0.26, 0.29, 0.35],
    },
    streakContinue: {
      frequencies: [990, 1320, 1760],
      durations: [0.08, 0.08, 0.12],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.22, 0.25, 0.3],
    },
    streakBreak: {
      frequencies: [660, 495, 330],
      durations: [0.1, 0.1, 0.15],
      waveTypes: ["sine", "sine", "sawtooth"],
      volumes: [0.22, 0.2, 0.17],
    },
    syncComplete: {
      frequencies: [1320, 1760, 2200],
      durations: [0.06, 0.06, 0.1],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.18, 0.21, 0.25],
    },
    error: {
      frequencies: [220],
      durations: [0.35],
      waveTypes: ["sawtooth"],
      volumes: [0.32],
      effects: [{ type: "distortion", config: { amount: 0.3 } }],
    },
    warning: {
      frequencies: [550, 550],
      durations: [0.15, 0.15],
      waveTypes: ["triangle", "triangle"],
      volumes: [0.28, 0.28],
    },
    info: { frequencies: [1485], durations: [0.18], waveTypes: ["sine"], volumes: [0.22] },
    bulkSelect: { frequencies: [2200], durations: [0.025], waveTypes: ["sine"], volumes: [0.13] },
    bulkComplete: {
      frequencies: [1320, 1485, 1760, 2200],
      durations: [0.06, 0.06, 0.06, 0.12],
      waveTypes: ["sine", "sine", "sine", "sine"],
      volumes: [0.2, 0.23, 0.26, 0.32],
    },
    bulkDelete: {
      frequencies: [880, 660, 440],
      durations: [0.06, 0.06, 0.12],
      waveTypes: ["sine", "sine", "sawtooth"],
      volumes: [0.22, 0.2, 0.17],
    },
    focusMode: {
      frequencies: [330],
      durations: [3.0],
      waveTypes: ["sine"],
      volumes: [0.1],
      effects: [{ type: "reverb", config: { roomSize: 0.9, wet: 0.6 } }],
    },
    breakTime: {
      frequencies: [660, 880, 660],
      durations: [0.3, 0.3, 0.4],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.28, 0.28, 0.32],
    },
    dayComplete: {
      frequencies: [330, 440, 550, 660, 880, 1100, 1320],
      durations: [0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.4],
      waveTypes: ["sawtooth", "sawtooth", "sine", "sine", "sine", "sine", "sine"],
      volumes: [0.17, 0.19, 0.21, 0.23, 0.25, 0.27, 0.38],
    },
    weekComplete: {
      frequencies: [330, 440, 550, 660, 550, 660, 880, 1100, 1320],
      durations: [0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.5],
      waveTypes: ["sawtooth", "sawtooth", "sine", "sine", "sine", "sine", "sine", "sine", "sine"],
      volumes: [0.16, 0.18, 0.2, 0.22, 0.2, 0.22, 0.25, 0.28, 0.4],
    },
    ambient: {
      frequencies: [110, 165, 220],
      durations: [15.0, 15.0, 15.0],
      waveTypes: ["sine", "sine", "sine"],
      volumes: [0.06, 0.04, 0.03],
      effects: [{ type: "reverb", config: { roomSize: 0.95, wet: 0.8 } }],
    },
  },
}

/**
 * Master sound suite collection
 */
export const SOUND_SUITES: Record<string, SoundSuite> = {
  minimalist: minimalistSuite,
  nature: natureSuite,
  arcade: arcadeSuite,
  productivity: productivitySuite,
  zen: zenSuite,
  retro: retroSuite,
  space: spaceSuite,
}

/**
 * Helper to get a specific sound from a suite
 */
export const getSoundFromSuite = (
  suiteName: string,
  interactionType: InteractionType,
): SoundDefinition | null => {
  const suite = SOUND_SUITES[suiteName]
  if (!suite) return null
  return suite.sounds[interactionType] || null
}

/**
 * Get all available suite names
 */
export const getAvailableSuites = (): (keyof typeof SOUND_SUITES)[] => {
  // Type-safe way to get object keys with proper typing
  const keys = Object.keys(SOUND_SUITES)
  return keys.filter((key): key is keyof typeof SOUND_SUITES => key in SOUND_SUITES)
}

/**
 * Get suite metadata
 */
export const getSuiteInfo = (
  suiteName: string,
): { name: string; description: string; theme: string } | null => {
  const suite = SOUND_SUITES[suiteName]
  if (!suite) return null
  return {
    name: suite.name,
    description: suite.description,
    theme: suite.theme,
  }
}
