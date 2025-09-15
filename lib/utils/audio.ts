/**
 * Comprehensive audio utility for TaskTrove with multiple sound effects
 */

import { log } from "@/lib/utils/logger"

let audioContext: AudioContext | null = null

// Type guard for webkit AudioContext
function hasWebkitAudioContext(
  win: Window,
): win is Window & { webkitAudioContext: typeof AudioContext } {
  return "webkitAudioContext" in win && typeof win.webkitAudioContext === "function"
}

const initAudioContext = () => {
  if (!audioContext && typeof window !== "undefined") {
    try {
      // Type-safe approach to handle webkit prefixed AudioContext
      const AudioContextConstructor =
        window.AudioContext ||
        (hasWebkitAudioContext(window) ? window.webkitAudioContext : undefined)

      if (AudioContextConstructor) {
        audioContext = new AudioContextConstructor()
      }
    } catch (error) {
      log.warn({ error, module: "audio" }, "Web Audio API not supported")
    }
  }
  return audioContext
}

/**
 * Sound effect types available in the system
 */
export type SoundType =
  | "bell" // Notification bell (original completion sound)
  | "bellClear" // Clear, crisp bell for todo completion
  | "bellWarm" // Warm, rounded bell tone
  | "bellBright" // Bright, sparkling bell
  | "bellDeep" // Deep, resonant bell
  | "pop" // Satisfying bubble pop
  | "ding" // Single soft tone
  | "success" // Major chord progression
  | "levelup" // Ascending arpeggio
  | "click" // UI click sound
  | "swoosh" // Transition sound
  | "tap" // Light interaction
  | "alert" // High priority notification
  | "chime" // Gentle reminder
  | "whoosh" // Deletion/removal
  | "error" // Error feedback
  | "confirm" // Confirmation sound

/**
 * Detailed descriptions for each sound effect
 */
export const SOUND_DESCRIPTIONS = {
  bell: "Original two-tone notification bell - C5 to E5 ascending tones with smooth attack and decay",
  bellClear:
    "Crystal clear single bell tone with sharp attack and quick decay - perfect for todo completion",
  bellWarm:
    "Warm, rounded bell with gentle harmonics and medium sustain - comforting completion sound",
  bellBright: "Bright, sparkling bell with high-frequency harmonics - energetic and uplifting",
  bellDeep: "Deep, resonant bell with rich low-end and long sustain - satisfying and grounding",
  pop: "Quick frequency sweep from 800Hz to 200Hz - mimics a satisfying bubble pop",
  ding: "Single 880Hz sine wave with gentle attack and release - clean and simple",
  success: "C major triad (C4-E4-G4) played simultaneously - harmonic and triumphant",
  levelup: "Ascending arpeggio C4-E4-G4-C5 with staggered timing - progression and achievement",
  click: "Sharp 1000Hz square wave burst - crisp UI feedback",
  swoosh: "Filtered sawtooth sweep from 100Hz to 2000Hz with lowpass filter - smooth transition",
  tap: "Brief 600Hz triangle wave - subtle interaction feedback",
  alert: "Two 800Hz square wave beeps with gap - attention-grabbing but not harsh",
  chime: "Dual sine waves at 523Hz and 698Hz with overlapping timing - gentle and pleasant",
  whoosh: "Descending sawtooth sweep from 1000Hz to 100Hz - swift removal sound",
  error: "Low 150Hz square wave with harsh envelope - clear negative feedback",
  confirm: "Ascending sine waves 440Hz to 554Hz - gentle positive acknowledgment",
} satisfies Record<SoundType, string>

/**
 * Play a specific sound effect
 */
export const playSound = async (soundType: SoundType, volume: number = 0.3) => {
  const context = initAudioContext()
  if (!context) return

  try {
    // Resume context if suspended (required by some browsers)
    if (context.state === "suspended") {
      await context.resume()
    }

    const now = context.currentTime

    switch (soundType) {
      case "bell":
        await playBellSound(context, now, volume)
        break
      case "bellClear":
        await playBellClearSound(context, now, volume)
        break
      case "bellWarm":
        await playBellWarmSound(context, now, volume)
        break
      case "bellBright":
        await playBellBrightSound(context, now, volume)
        break
      case "bellDeep":
        await playBellDeepSound(context, now, volume)
        break
      case "pop":
        await playPopSound(context, now, volume)
        break
      case "ding":
        await playDingSound(context, now, volume)
        break
      case "success":
        await playSuccessSound(context, now, volume)
        break
      case "levelup":
        await playLevelUpSound(context, now, volume)
        break
      case "click":
        await playClickSound(context, now, volume)
        break
      case "swoosh":
        await playSwooshSound(context, now, volume)
        break
      case "tap":
        await playTapSound(context, now, volume)
        break
      case "alert":
        await playAlertSound(context, now, volume)
        break
      case "chime":
        await playChimeSound(context, now, volume)
        break
      case "whoosh":
        await playWhooshSound(context, now, volume)
        break
      case "error":
        await playErrorSound(context, now, volume)
        break
      case "confirm":
        await playConfirmSound(context, now, volume)
        break
      default:
        log.warn({ soundType, module: "audio" }, `Unknown sound type: ${soundType}`)
    }
  } catch (error) {
    log.warn({ soundType, error, module: "audio" }, `Failed to play ${soundType} sound`)
  }
}

/**
 * Helper function to create an oscillator with gain envelope
 */
const createTone = (
  context: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  volume: number,
  waveType: OscillatorType = "sine",
  envelope?: { attack?: number; decay?: number; sustain?: number; release?: number },
) => {
  const oscillator = context.createOscillator()
  const gainNode = context.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(context.destination)

  oscillator.type = waveType
  oscillator.frequency.setValueAtTime(frequency, startTime)

  // Apply envelope
  const env = { attack: 0.02, decay: 0.1, sustain: 0.7, release: 0.3, ...envelope }
  const attackTime = env.attack
  const decayTime = env.decay
  const sustainLevel = volume * env.sustain
  const releaseTime = env.release

  gainNode.gain.setValueAtTime(0, startTime)
  gainNode.gain.linearRampToValueAtTime(volume, startTime + attackTime)
  gainNode.gain.linearRampToValueAtTime(sustainLevel, startTime + attackTime + decayTime)
  gainNode.gain.setValueAtTime(sustainLevel, startTime + duration - releaseTime)
  gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration)

  oscillator.start(startTime)
  oscillator.stop(startTime + duration)

  return { oscillator, gainNode }
}

/**
 * Original notification bell sound (two ascending tones)
 */
const playBellSound = async (context: AudioContext, startTime: number, volume: number) => {
  const duration = 0.15

  // First tone (C5 - 523.25 Hz)
  createTone(context, 523.25, startTime, duration, volume)

  // Second tone (E5 - 659.25 Hz) - slightly delayed
  createTone(context, 659.25, startTime + 0.1, duration, volume)
}

/**
 * Clear, crisp bell for todo completion
 */
const playBellClearSound = async (context: AudioContext, startTime: number, volume: number) => {
  // Single clear tone with sharp attack and quick decay - perfect for instant feedback
  createTone(context, 1046.5, startTime, 0.12, volume, "sine", {
    attack: 0.005,
    decay: 0.03,
    sustain: 0.3,
    release: 0.08,
  })
}

/**
 * Warm, rounded bell tone
 */
const playBellWarmSound = async (context: AudioContext, startTime: number, volume: number) => {
  // Fundamental frequency with subtle harmonic
  const fundamental = 698.46 // F5
  const harmonic = fundamental * 1.5 // Third harmonic for warmth

  createTone(context, fundamental, startTime, 0.25, volume, "sine", {
    attack: 0.02,
    decay: 0.05,
    sustain: 0.6,
    release: 0.18,
  })

  // Add subtle harmonic for warmth
  createTone(context, harmonic, startTime, 0.2, volume * 0.3, "sine", {
    attack: 0.03,
    decay: 0.04,
    sustain: 0.4,
    release: 0.13,
  })
}

/**
 * Bright, sparkling bell
 */
const playBellBrightSound = async (context: AudioContext, startTime: number, volume: number) => {
  // Higher frequency with sparkle harmonics
  const fundamental = 1396.91 // F6

  // Main bright tone
  createTone(context, fundamental, startTime, 0.15, volume, "sine", {
    attack: 0.002,
    decay: 0.02,
    sustain: 0.4,
    release: 0.12,
  })

  // Add sparkling harmonics
  createTone(context, fundamental * 2, startTime, 0.08, volume * 0.2, "sine", {
    attack: 0.001,
    decay: 0.01,
    sustain: 0.2,
    release: 0.06,
  })

  createTone(context, fundamental * 3, startTime, 0.05, volume * 0.1, "sine", {
    attack: 0.001,
    decay: 0.005,
    sustain: 0.1,
    release: 0.04,
  })
}

/**
 * Deep, resonant bell
 */
const playBellDeepSound = async (context: AudioContext, startTime: number, volume: number) => {
  // Lower fundamental with rich harmonics
  const fundamental = 261.63 // C4

  // Deep fundamental
  createTone(context, fundamental, startTime, 0.4, volume, "sine", {
    attack: 0.03,
    decay: 0.08,
    sustain: 0.7,
    release: 0.29,
  })

  // Perfect fifth for richness
  createTone(context, fundamental * 1.5, startTime, 0.35, volume * 0.6, "sine", {
    attack: 0.04,
    decay: 0.06,
    sustain: 0.5,
    release: 0.25,
  })

  // Octave for depth
  createTone(context, fundamental * 2, startTime, 0.25, volume * 0.4, "sine", {
    attack: 0.05,
    decay: 0.04,
    sustain: 0.3,
    release: 0.16,
  })
}

/**
 * Satisfying bubble pop sound
 */
const playPopSound = async (context: AudioContext, startTime: number, volume: number) => {
  // Quick frequency sweep from high to low
  const oscillator = context.createOscillator()
  const gainNode = context.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(context.destination)

  oscillator.type = "sine"
  oscillator.frequency.setValueAtTime(800, startTime)
  oscillator.frequency.exponentialRampToValueAtTime(200, startTime + 0.1)

  gainNode.gain.setValueAtTime(0, startTime)
  gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01)
  gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1)

  oscillator.start(startTime)
  oscillator.stop(startTime + 0.1)
}

/**
 * Single soft ding sound
 */
const playDingSound = async (context: AudioContext, startTime: number, volume: number) => {
  createTone(context, 880, startTime, 0.3, volume, "sine", { attack: 0.01, release: 0.2 })
}

/**
 * Success chord (C major triad)
 */
const playSuccessSound = async (context: AudioContext, startTime: number, volume: number) => {
  const chordVolume = volume * 0.6 // Reduce volume for chord

  // C4, E4, G4 (major triad)
  createTone(context, 261.63, startTime, 0.4, chordVolume)
  createTone(context, 329.63, startTime, 0.4, chordVolume)
  createTone(context, 392.0, startTime, 0.4, chordVolume)
}

/**
 * Level up sound (ascending arpeggio)
 */
const playLevelUpSound = async (context: AudioContext, startTime: number, volume: number) => {
  const notes = [261.63, 329.63, 392.0, 523.25] // C4, E4, G4, C5
  const noteVolume = volume * 0.7

  notes.forEach((freq: number, index: number) => {
    createTone(context, freq, startTime + index * 0.08, 0.15, noteVolume)
  })
}

/**
 * UI click sound
 */
const playClickSound = async (context: AudioContext, startTime: number, volume: number) => {
  createTone(context, 1000, startTime, 0.05, volume, "square", { attack: 0.001, release: 0.04 })
}

/**
 * Swoosh transition sound
 */
const playSwooshSound = async (context: AudioContext, startTime: number, volume: number) => {
  // Noise-like effect using filtered sawtooth
  const oscillator = context.createOscillator()
  const gainNode = context.createGain()
  const filter = context.createBiquadFilter()

  oscillator.connect(filter)
  filter.connect(gainNode)
  gainNode.connect(context.destination)

  oscillator.type = "sawtooth"
  oscillator.frequency.setValueAtTime(100, startTime)
  oscillator.frequency.exponentialRampToValueAtTime(2000, startTime + 0.2)

  filter.type = "lowpass"
  filter.frequency.setValueAtTime(5000, startTime)
  filter.frequency.exponentialRampToValueAtTime(100, startTime + 0.2)

  gainNode.gain.setValueAtTime(0, startTime)
  gainNode.gain.linearRampToValueAtTime(volume * 0.3, startTime + 0.05)
  gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2)

  oscillator.start(startTime)
  oscillator.stop(startTime + 0.2)
}

/**
 * Light tap sound
 */
const playTapSound = async (context: AudioContext, startTime: number, volume: number) => {
  createTone(context, 600, startTime, 0.03, volume * 0.5, "triangle", {
    attack: 0.001,
    release: 0.025,
  })
}

/**
 * Alert sound for high priority
 */
const playAlertSound = async (context: AudioContext, startTime: number, volume: number) => {
  // Two quick beeps
  createTone(context, 800, startTime, 0.1, volume, "square")
  createTone(context, 800, startTime + 0.15, 0.1, volume, "square")
}

/**
 * Gentle chime for reminders
 */
const playChimeSound = async (context: AudioContext, startTime: number, volume: number) => {
  // Soft bell-like sound
  createTone(context, 523.25, startTime, 0.6, volume * 0.8, "sine", { attack: 0.1, release: 0.4 })
  createTone(context, 698.46, startTime + 0.1, 0.5, volume * 0.6, "sine", {
    attack: 0.1,
    release: 0.3,
  })
}

/**
 * Whoosh sound for deletion
 */
const playWhooshSound = async (context: AudioContext, startTime: number, volume: number) => {
  // Descending frequency sweep
  const oscillator = context.createOscillator()
  const gainNode = context.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(context.destination)

  oscillator.type = "sawtooth"
  oscillator.frequency.setValueAtTime(1000, startTime)
  oscillator.frequency.exponentialRampToValueAtTime(100, startTime + 0.3)

  gainNode.gain.setValueAtTime(0, startTime)
  gainNode.gain.linearRampToValueAtTime(volume * 0.4, startTime + 0.02)
  gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3)

  oscillator.start(startTime)
  oscillator.stop(startTime + 0.3)
}

/**
 * Error sound
 */
const playErrorSound = async (context: AudioContext, startTime: number, volume: number) => {
  // Low, harsh sound
  createTone(context, 150, startTime, 0.3, volume, "square", { attack: 0.01, release: 0.2 })
}

/**
 * Confirmation sound
 */
const playConfirmSound = async (context: AudioContext, startTime: number, volume: number) => {
  // Gentle ascending tones
  createTone(context, 440, startTime, 0.15, volume * 0.8)
  createTone(context, 554.37, startTime + 0.1, 0.2, volume * 0.8)
}

/**
 * Legacy function for backward compatibility
 */
export const playCompletionSound = async () => {
  await playSound("bell")
}
