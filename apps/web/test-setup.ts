import "@testing-library/jest-dom"
import { cleanup } from "@testing-library/react"
import { afterEach, vi } from "vitest"
import i18next from "i18next"
import { initReactI18next } from "react-i18next"

// Initialize i18next before any tests run
// This mimics what the old @/lib/i18n/client.ts did at module load time
// The LanguageProvider will skip initialization if already initialized
if (!i18next.isInitialized) {
  i18next.use(initReactI18next).init({
    lng: "en",
    fallbackLng: "en",
    ns: ["common", "dialogs", "settings", "layout", "navigation", "task", "auth"],
    defaultNS: "common",
    interpolation: {
      escapeValue: false,
    },
    // Empty resources - tests will use translation keys as fallback
    resources: {
      en: {
        common: {},
        dialogs: {},
        settings: {},
        layout: {},
        navigation: {},
        task: {},
        auth: {},
      },
    },
  })
}

// Mock next-auth globally to prevent module resolution issues with v5 beta
// Returns an authenticated session by default to allow tests to run
vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "test-user", name: "Test User" },
    expires: new Date(Date.now() + 86400000).toISOString(),
  }),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: {
    GET: vi.fn(),
    POST: vi.fn(),
  },
}))

// Only set up browser mocks if window is available (not in Node environment)
if (typeof window !== "undefined") {
  // Mock window.matchMedia
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })

  // Mock Web Audio API
  Object.defineProperty(window, "AudioContext", {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      createOscillator: vi.fn(() => ({
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        frequency: {
          value: 440,
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
        },
        type: "sine",
      })),
      createGain: vi.fn(() => ({
        connect: vi.fn(),
        disconnect: vi.fn(),
        gain: {
          value: 0.5,
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
        },
      })),
      currentTime: 0,
      destination: {},
      state: "running",
      resume: vi.fn().mockResolvedValue(undefined),
    })),
  })

  Object.defineProperty(window, "webkitAudioContext", {
    writable: true,
    value: window.AudioContext,
  })

  // Mock document.caretRangeFromPoint for click-to-edit components
  if (typeof document.caretRangeFromPoint === "undefined") {
    Object.defineProperty(document, "caretRangeFromPoint", {
      value: () => null,
      writable: true,
    })
  }
}

// Mock HTMLAudioElement globally (works in both browser and Node)
Object.defineProperty(global, "HTMLAudioElement", {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    load: vi.fn(),
    src: "",
    preload: "",
    currentTime: 0,
    duration: 0,
    paused: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Clean up after each test
afterEach(() => {
  cleanup()
})
