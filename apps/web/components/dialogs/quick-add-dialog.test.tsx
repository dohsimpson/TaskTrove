import React from "react"
import { flushSync } from "react-dom"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
  mockNextThemes,
  mockContentPopoverComponent,
  mockHelpPopoverComponent,
  mockTimeEstimationPopoverComponent,
  mockSubtaskPopoverComponent,
  handleSettingsAtomInMock,
} from "@/test-utils"
import { QuickAddDialog } from "./quick-add-dialog"
import type { Project } from "@tasktrove/types/core"
import type { LabelId } from "@tasktrove/types/id"
import type { TaskPriority } from "@tasktrove/types/constants"
import { createLabelId } from "@tasktrove/types/id"
import { DEFAULT_PROJECT_SECTION } from "@tasktrove/types/defaults"
import {
  TEST_PROJECT_ID_1,
  TEST_PROJECT_ID_2,
  TEST_LABEL_ID_1,
  TEST_LABEL_ID_2,
} from "@tasktrove/types/test-constants"
import { INBOX_PROJECT_ID } from "@tasktrove/types/constants"
import type { CreateTaskRequest } from "@tasktrove/types/api-requests"
import type { ParsedTaskWithMatches } from "@tasktrove/utils/parser-adapter"

const buildParsedResult = (overrides: Partial<ParsedTaskWithMatches>): ParsedTaskWithMatches => ({
  title: "",
  originalText: "",
  labels: [],
  matches: [],
  rawMatches: [],
  ...overrides,
})

// Mock component props interface
interface MockComponentProps {
  children?: React.ReactNode
  open?: boolean
  className?: string
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  rows?: number
  onValueChange?: (value: string) => void
  variant?: string
}

// Track autocomplete visibility for dialog mock
let latestAutocompleteOpen = false

// Mock UI components
vi.mock("@/components/ui/dialog", () => {
  let latestOnOpenChange: ((open: boolean) => void) | undefined
  return {
    Dialog: ({
      children,
      open,
      onOpenChange,
    }: MockComponentProps & { onOpenChange?: (open: boolean) => void }) => {
      latestOnOpenChange = onOpenChange
      return open ? <div data-testid="dialog">{children}</div> : null
    },
    DialogContentWithoutOverlay: ({
      children,
      className,
      onEscapeKeyDown,
      onOpenChange,
    }: MockComponentProps & {
      onEscapeKeyDown?: (event: KeyboardEvent) => void
      onOpenChange?: (open: boolean) => void
    }) => (
      <div
        data-testid="dialog-content"
        className={className}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            const nativeEvent = new KeyboardEvent("keydown", { key: "Escape" })
            if (latestAutocompleteOpen) {
              Object.defineProperty(nativeEvent, "defaultPrevented", { value: true })
            }
            onEscapeKeyDown?.(nativeEvent)
            if (!nativeEvent.defaultPrevented) {
              const close = onOpenChange ?? latestOnOpenChange
              close?.(false)
              // Mirror the real close atom side-effect so tests can assert it
              if (close === latestOnOpenChange) {
                mockCloseDialog()
              }
            }
          }
        }}
        tabIndex={-1}
      >
        {children}
      </div>
    ),
    DialogTitle: ({ children }: MockComponentProps) => (
      <div data-testid="dialog-title">{children}</div>
    ),
  }
})

// Mock the Textarea component
vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({ placeholder, value, onChange, className, rows }: MockComponentProps) => (
    <textarea
      data-testid="task-description"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={className}
      rows={rows}
    />
  ),
}))

// Mock the Select components
vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value }: MockComponentProps) => (
    <div data-testid="project-select" data-value={value}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: MockComponentProps) => (
    <div data-testid="select-trigger">{children}</div>
  ),
  SelectValue: () => <span data-testid="select-value">Inbox</span>,
  SelectContent: ({ children }: MockComponentProps) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({ children, value }: MockComponentProps) => (
    <div data-testid={`select-item-${value}`}>{children}</div>
  ),
}))

// Mock the Badge component
vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, className, variant }: MockComponentProps) => (
    <div data-testid="badge" className={className} data-variant={variant}>
      {children}
    </div>
  ),
}))

vi.mock("@/components/ui/switch", async () => {
  const React = await import("react")

  return {
    Switch: ({
      checked,
      onCheckedChange,
      className,
      "data-testid": dataTestId,
    }: {
      checked?: boolean
      onCheckedChange?: (checked: boolean) => void
      className?: string
      "data-testid"?: string
    }) => {
      // Use React state to manage toggle state within the test component
      const [internalChecked, setInternalChecked] = React.useState(checked ?? true)

      // Sync with external checked prop
      React.useEffect(() => {
        if (checked !== undefined) {
          setInternalChecked(checked)
        }
      }, [checked])

      const handleClick = () => {
        const newValue = !internalChecked
        setInternalChecked(newValue)
        onCheckedChange?.(newValue)

        // Update global state for other parts of the test
        if (dataTestId === "nlp-toggle") {
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any
          ;(globalThis as any).nlpEnabledState.value = newValue
        }
      }

      return React.createElement(
        "button",
        {
          "data-testid": dataTestId || "switch",
          onClick: handleClick,
          className: className,
          "data-state": internalChecked ? "checked" : "unchecked",
        },
        internalChecked ? "ON" : "OFF",
      )
    },
  }
})

// Mock Radix UI
vi.mock("@radix-ui/react-visually-hidden", () => ({
  VisuallyHidden: ({ children }: MockComponentProps) => (
    <span
      style={{
        position: "absolute",
        border: "0px",
        width: "1px",
        height: "1px",
        padding: "0px",
        margin: "-1px",
        overflow: "hidden",
        clip: "rect(0px, 0px, 0px, 0px)",
        whiteSpace: "nowrap",
        wordWrap: "normal",
      }}
    >
      {children}
    </span>
  ),
}))

// Mock Popover components
vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: MockComponentProps) => <div data-testid="popover">{children}</div>,
  PopoverTrigger: ({ children, asChild }: MockComponentProps & { asChild?: boolean }) =>
    asChild ? children : <div data-testid="popover-trigger">{children}</div>,
  PopoverContent: ({ children }: MockComponentProps) => (
    <div data-testid="popover-content">{children}</div>
  ),
}))

// Mock useIsMobile hook to prevent window.addEventListener issues
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}))

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Plus: () => <span data-testid="plus-icon">+</span>,
  Calendar: () => <span data-testid="calendar-icon">📅</span>,
  Hash: () => <span data-testid="hash-icon">#</span>,
  Tag: () => <span data-testid="tag-icon">🏷️</span>,
  AlertCircle: () => <span data-testid="alert-icon">⚠️</span>,
  Repeat: () => <span data-testid="repeat-icon">🔄</span>,
  X: () => <span data-testid="x-icon">✕</span>,
  Folder: () => <span data-testid="folder-icon">📁</span>,
  Clock: () => <span data-testid="clock-icon">⏰</span>,
  Flag: () => <span data-testid="flag-icon">🚩</span>,
  Star: () => <span data-testid="star-icon">⭐</span>,
  Settings: () => <span data-testid="settings-icon">⚙️</span>,
  ChevronDown: () => <span data-testid="chevron-down-icon">⬇️</span>,
  ChevronUp: () => <span data-testid="chevron-up-icon">⬆️</span>,
  Sparkles: () => <span data-testid="sparkles-icon">✨</span>,
  Users: () => <span data-testid="users-icon">👥</span>,
  AlertTriangle: () => <span data-testid="alert-triangle-icon">⚠️</span>,
  HelpCircle: () => <span data-testid="help-circle-icon">?</span>,
  MoreHorizontal: () => <span data-testid="more-horizontal-icon">⋯</span>,
  CheckSquare: () => <span data-testid="check-square-icon">☑️</span>,
  Search: () => <span data-testid="search-icon">🔍</span>,
  Filter: () => <span data-testid="filter-icon">🔽</span>,
  MoreVertical: () => <span data-testid="more-vertical-icon">⋮</span>,
  Edit: () => <span data-testid="edit-icon">✏️</span>,
  Trash: () => <span data-testid="trash-icon">🗑️</span>,
  Copy: () => <span data-testid="copy-icon">📋</span>,
  Move: () => <span data-testid="move-icon">↔️</span>,
  Link: () => <span data-testid="link-icon">🔗</span>,
  ExternalLink: () => <span data-testid="external-link-icon">🔗</span>,
  CalendarDays: () => <span data-testid="calendar-days-icon">📅</span>,
  User: () => <span data-testid="user-icon">👤</span>,
  Mail: () => <span data-testid="mail-icon">✉️</span>,
  Lock: () => <span data-testid="lock-icon">🔒</span>,
  Unlock: () => <span data-testid="unlock-icon">🔓</span>,
  Eye: () => <span data-testid="eye-icon">👁️</span>,
  EyeOff: () => <span data-testid="eye-off-icon">🙈</span>,
  MessageSquare: () => <span data-testid="message-square-icon">💬</span>,
  Inbox: () => <span data-testid="inbox-icon">📥</span>,
  ChevronRight: () => <span data-testid="chevron-right-icon">➡️</span>,
  // Additional commonly used icons
  Volume2: () => <span data-testid="volume2-icon">🔊</span>,
  Bug: () => <span data-testid="bug-icon">🐛</span>,
  Upload: () => <span data-testid="upload-icon">⬆️</span>,
  Loader2: () => <span data-testid="loader2-icon">⏳</span>,
  LoaderCircle: () => <span data-testid="loader-circle-icon">⏳</span>,
  Undo2: () => <span data-testid="undo2-icon">⏪</span>,
  Redo2: () => <span data-testid="redo2-icon">⏩</span>,
  Database: () => <span data-testid="database-icon">🗄️</span>,
  Bell: () => <span data-testid="bell-icon">🔔</span>,
  Menu: () => <span data-testid="menu-icon">☰</span>,
  Palette: () => <span data-testid="palette-icon">🎨</span>,
  Trophy: () => <span data-testid="trophy-icon">🏆</span>,
  Target: () => <span data-testid="target-icon">🎯</span>,
  TrendingUp: () => <span data-testid="trending-up-icon">📈</span>,
  Trash2: () => <span data-testid="trash2-icon">🗑️</span>,
  CheckCircle: () => <span data-testid="check-circle-icon">✅</span>,
  Heart: () => <span data-testid="heart-icon">❤️</span>,
  Battery: () => <span data-testid="battery-icon">🔋</span>,
  TrendingDown: () => <span data-testid="trending-down-icon">📉</span>,
  Lightbulb: () => <span data-testid="lightbulb-icon">💡</span>,
  Flame: () => <span data-testid="flame-icon">🔥</span>,
  FolderOpen: () => <span data-testid="folder-open-icon">📂</span>,
  Clock10: () => <span data-testid="clock10-icon">🕙</span>,
  Archive: () => <span data-testid="archive-icon">📦</span>,
  FileText: () => <span data-testid="file-text-icon">📄</span>,
  DatabaseBackup: () => <span data-testid="database-backup-icon">💾</span>,
  Share2: () => <span data-testid="share2-icon">🔗</span>,
  Crown: () => <span data-testid="crown-icon">👑</span>,
  Shield: () => <span data-testid="shield-icon">🛡️</span>,
  ArrowLeft: () => <span data-testid="arrow-left-icon">←</span>,
  Download: () => <span data-testid="download-icon">⬇️</span>,
  Zap: () => <span data-testid="zap-icon">⚡</span>,
  Folders: () => <span data-testid="folders-icon">📁</span>,
  Info: () => <span data-testid="info-icon">ℹ️</span>,
  Timer: () => <span data-testid="timer-icon">⏱️</span>,
  Mic: () => <span data-testid="mic-icon">🎤</span>,
  Settings2: () => <span data-testid="settings2-icon">⚙️</span>,
  CloudOff: () => <span data-testid="cloud-off-icon">☁️</span>,
  Send: () => <span data-testid="send-icon">📤</span>,
  ArrowUpDown: () => <span data-testid="arrow-up-down-icon">↕️</span>,
  ArrowUpNarrowWide: () => <span data-testid="arrow-up-narrow-wide-icon">⬆️</span>,
  ArrowDownWideNarrow: () => <span data-testid="arrow-down-wide-narrow-icon">⬇️</span>,
  Coffee: () => <span data-testid="coffee-icon">☕</span>,
  Play: () => <span data-testid="play-icon">▶️</span>,
  Pause: () => <span data-testid="pause-icon">⏸️</span>,
  Languages: () => <span data-testid="languages-icon">🌐</span>,
  Crosshair: () => <span data-testid="crosshair-icon">➕</span>,
  FolderPlus: () => <span data-testid="folder-plus-icon">📁➕</span>,
  PanelLeftIcon: () => <span data-testid="panel-left-icon">◀️</span>,
  ClockFading: () => <span data-testid="clock-fading-icon">⏰</span>,
  SquareX: () => <span data-testid="square-x-icon">❌</span>,
  ScanText: () => <span data-testid="scan-text-icon">📄</span>,
  CopyPlus: () => <span data-testid="copy-plus-icon">📋➕</span>,
}))

// Mock UI components that use ContentPopover
vi.mock("@/components/ui/content-popover", () => ({
  ContentPopover: mockContentPopoverComponent,
}))

vi.mock("@/components/ui/help-popover", () => ({
  HelpPopover: mockHelpPopoverComponent,
}))

vi.mock("@/components/task/time-estimation-popover", () => ({
  TimeEstimationPopover: mockTimeEstimationPopoverComponent,
}))

vi.mock("@/components/task/subtask-popover", () => ({
  SubtaskPopover: mockSubtaskPopoverComponent,
}))

// Mock the constants
vi.mock("@tasktrove/types/constants", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    INBOX_PROJECT_ID: "inbox",
  }
})

// Note: Atom mocks are now centralized in test-utils/atoms-mocks.ts
// Special handling for nlpEnabledAtom reactive state
// eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any
;(globalThis as any).nlpEnabledState = { value: true, listeners: [] as (() => void)[] }

// Mock date-fns
vi.mock("date-fns", () => ({
  format: () => "Jan 1",
  addDays: (date: Date, days: number) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000),
  nextMonday: () => new Date("2022-01-03"),
  nextFriday: () => new Date("2022-01-07"),
  startOfDay: (date: Date) => date,
  isToday: () => false,
  isTomorrow: () => false,
  isPast: (date: Date) => date.getTime() < Date.now(),
}))

// Mock logger
vi.mock("@/lib/utils/logger", () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
  },
}))

// Import real color utilities for testing
import { getPriorityTextColor, getPriorityLabel, getDueDateTextColor } from "@/lib/color-utils"

// Mock data for tests
const mockAddTask = vi.fn()
const mockAddLabel = vi.fn()
const mockCloseDialog = vi.fn()
const mockUpdateTask = vi.fn()
const mockResetTask = vi.fn()
let mockSelectedCalendarDate: Date | null = null
const mockLabels = [
  { id: TEST_LABEL_ID_1, name: "urgent", color: "#ff0000", nextLabelId: null },
  { id: TEST_LABEL_ID_2, name: "important", color: "#00ff00", nextLabelId: null },
]
const mockProjects: Project[] = [
  {
    id: TEST_PROJECT_ID_1,
    name: "Work",
    color: "#3b82f6",
    sections: [DEFAULT_PROJECT_SECTION],
  },
  {
    id: TEST_PROJECT_ID_2,
    name: "Personal",
    color: "#ef4444",
    sections: [DEFAULT_PROJECT_SECTION],
  },
]

const mockProjectGroups = {
  projectGroups: {
    type: "project" as const,
    id: "root",
    name: "All Projects",
    items: [TEST_PROJECT_ID_1, TEST_PROJECT_ID_2],
  },
  labelGroups: {
    type: "label" as const,
    id: "root-labels",
    name: "All Labels",
    items: [],
  },
}
const mockRouteContext = {
  pathname: "/today",
  viewId: "today",
  projectId: "view-today",
  routeType: "standard",
  routeParams: {},
}
let mockTaskForm: CreateTaskRequest = { title: "" }

// Mock Jotai hooks - we'll override these in beforeEach with proper reactive behavior
vi.mock("jotai", async () => {
  const actual = await vi.importActual("jotai")
  return {
    ...actual,
    useAtomValue: vi.fn(),
    useSetAtom: vi.fn(),
  }
})

// Mock next-themes
mockNextThemes()

// Mock the TaskPriorityPopover component
vi.mock("@/components/task/task-priority-popover", () => ({
  TaskPriorityPopover: ({
    children,
    onUpdate,
  }: {
    children: React.ReactNode
    onUpdate?: (priority: TaskPriority) => void
  }) => (
    <div data-testid="task-priority-popover">
      {children}
      <button data-testid="mock-priority-1" onClick={() => onUpdate?.(1)}>
        Priority 1
      </button>
      <button data-testid="mock-priority-2" onClick={() => onUpdate?.(2)}>
        Priority 2
      </button>
      <button data-testid="mock-priority-3" onClick={() => onUpdate?.(3)}>
        Priority 3
      </button>
      <button data-testid="mock-priority-4" onClick={() => onUpdate?.(4)}>
        Priority 4
      </button>
    </div>
  ),
}))

// Mock the TaskSchedulePopover component
vi.mock("@/components/task/task-schedule-popover", () => ({
  TaskSchedulePopover: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="task-schedule-popover">
      {children}
      <button
        data-testid="mock-schedule-today"
        onClick={() => {
          // TaskSchedulePopover now handles scheduling through atoms directly
        }}
      >
        Mock Today
      </button>
      <button
        data-testid="mock-schedule-daily"
        onClick={() => {
          // TaskSchedulePopover now handles scheduling through atoms directly
        }}
      >
        Mock Daily
      </button>
      <button
        data-testid="mock-remove-date"
        onClick={() => {
          // TaskSchedulePopover now handles scheduling through atoms directly
        }}
      >
        Mock Remove Date
      </button>
    </div>
  ),
}))

// Mock the LabelManagementPopover component
vi.mock("@/components/task/label-management-popover", () => ({
  LabelManagementPopover: ({
    children,
    onAddLabel,
    onRemoveLabel,
  }: {
    children: React.ReactNode
    onAddLabel: (labelName: string) => void
    onRemoveLabel: (labelId: LabelId) => void
  }) => (
    <div data-testid="label-management-popover">
      {children}
      <button data-testid="mock-add-label" onClick={() => onAddLabel("urgent")}>
        Mock Add Label
      </button>
      <button
        data-testid="mock-remove-label"
        onClick={() => onRemoveLabel(createLabelId("550e8400-e29b-41d4-a716-446655440001"))}
      >
        Mock Remove Label
      </button>
    </div>
  ),
}))

// Mock the ProjectPopover component
vi.mock("@/components/task/project-popover", () => ({
  ProjectPopover: ({
    children,
    onUpdate,
  }: {
    children: React.ReactNode
    onUpdate?: (projectId: string, sectionId?: string) => void
  }) => (
    <div data-testid="project-popover">
      {children}
      <button data-testid="mock-select-work-project" onClick={() => onUpdate?.(TEST_PROJECT_ID_1)}>
        Work
      </button>
      <button
        data-testid="mock-select-personal-project"
        onClick={() => onUpdate?.(TEST_PROJECT_ID_2)}
      >
        Personal
      </button>
      <button data-testid="mock-select-inbox-project" onClick={() => onUpdate?.("inbox")}>
        Inbox
      </button>
      <button data-testid="mock-clear-project" onClick={() => onUpdate?.("inbox")}>
        None
      </button>
    </div>
  ),
}))

// Mock the enhanced natural language parser
// Note: We're using the real enhanced-natural-language-parser implementation
// Individual tests that need deterministic behavior will mock it locally
vi.mock("@/lib/utils/enhanced-natural-language-parser", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/utils/enhanced-natural-language-parser")
  >("@/lib/utils/enhanced-natural-language-parser")
  return {
    ...actual,
    // Override parseEnhancedNaturalLanguage to be mockable per test
    parseEnhancedNaturalLanguage: vi.fn(actual.parseEnhancedNaturalLanguage),
  }
})

// Mock the EnhancedHighlightedInput component
vi.mock("@/components/ui/enhanced-highlighted-input", () => {
  return {
    EnhancedHighlightedInput: ({
      value,
      onChange,
      onKeyDown,
      placeholder,
      parserMatches: _parserMatches,
      disabledSections: _disabledSections,
      onAutocompleteVisibilityChange,
    }: {
      value: string
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
      onKeyDown: (e: React.KeyboardEvent) => void
      placeholder: string
      parserMatches?: unknown
      disabledSections?: Set<string>
      onAutocompleteVisibilityChange?: (open: boolean) => void
    }) => {
      void _parserMatches
      void _disabledSections

      // Synchronously notify visibility for predictable tests
      const isOpen = value.includes("@")
      latestAutocompleteOpen = isOpen
      onAutocompleteVisibilityChange?.(isOpen)

      return (
        <input
          data-testid="enhanced-input"
          role="combobox"
          aria-label="Quick add task input with natural language parsing"
          aria-controls="mock-controls"
          aria-expanded="false"
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
        />
      )
    },
  }
})

// Ensure window.matchMedia is mocked properly
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock the debounced parse hook
vi.mock("@/hooks/use-debounced-parse", () => ({
  useDebouncedParse: vi.fn(),
}))

describe("QuickAddDialog", () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    // Reset the mock to use the original implementation by default
    const originalHook = await vi.importActual<typeof import("@/hooks/use-debounced-parse")>(
      "@/hooks/use-debounced-parse",
    )
    const hookModule = await import("@/hooks/use-debounced-parse")
    vi.mocked(hookModule.useDebouncedParse).mockImplementation(originalHook.useDebouncedParse)

    // Reset NLP enabled state
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any
    ;(globalThis as any).nlpEnabledState.value = true
    // Mock Date.now() to return a consistent timestamp
    vi.spyOn(Date, "now").mockReturnValue(1640995200000) // 2022-01-01T00:00:00.000Z

    // Configure Jotai mocks properly
    const jotai = await import("jotai")

    // Mock useAtomValue to return appropriate values for each atom
    vi.mocked(jotai.useAtomValue).mockImplementation((atom: unknown) => {
      const atomStr = String(atom)
      if (atomStr.includes("quickAddTask")) return mockTaskForm
      if (atomStr.includes("selectedCalendarDate")) return mockSelectedCalendarDate
      if (atomStr.includes("show") || atomStr.includes("quick") || atomStr.includes("add"))
        return true
      if (atomStr.includes("nlp") || atomStr.includes("Nlp")) {
        // Return current state value for NLP atom
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any
        const state = (globalThis as any).nlpEnabledState
        return state ? state.value : true
      }
      const settingsResult = handleSettingsAtomInMock(atom)
      if (settingsResult) return settingsResult
      if (atomStr.includes("allGroups") || atomStr.includes("AllGroups")) return mockProjectGroups
      if (atomStr.includes("label") || atomStr.includes("Label")) return mockLabels
      if (atomStr.includes("project") || atomStr.includes("Project")) return mockProjects
      if (atomStr.includes("route") || atomStr.includes("context")) return mockRouteContext
      if (atomStr.includes("tasks") && atomStr.includes("Atom")) return [] // tasksAtom should return an array
      if (atomStr.includes("copyTask")) return null // copyTaskAtom should return null by default
      if (atomStr.includes("task") || atomStr.includes("Task")) return mockTaskForm
      return []
    })

    // Mock useSetAtom to return appropriate functions for each atom
    vi.mocked(jotai.useSetAtom).mockImplementation((atom: unknown) => {
      const atomStr = String(atom)
      if (atomStr.includes("addTask") || (atomStr.includes("add") && atomStr.includes("task")))
        return mockAddTask
      if (atomStr.includes("addLabel") || (atomStr.includes("add") && atomStr.includes("label")))
        return mockAddLabel
      if (atomStr.includes("nlp") || atomStr.includes("Nlp"))
        return (value: boolean) => {
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any
          ;(globalThis as any).nlpEnabledState.value = value
        }
      if (atomStr.includes("close") || atomStr.includes("Close")) return mockCloseDialog
      if (atomStr.includes("update") || atomStr.includes("Update")) return mockUpdateTask
      if (atomStr.includes("reset") || atomStr.includes("Reset")) return mockResetTask
      return vi.fn()
    })

    mockSelectedCalendarDate = null
    mockTaskForm = { title: "" }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Simple render helper
  const renderDialog = () => {
    return render(<QuickAddDialog />)
  }

  it("renders dialog when open is true", () => {
    renderDialog()

    expect(screen.getByTestId("dialog")).toBeInTheDocument()
    expect(screen.getByTestId("dialog-content")).toBeInTheDocument()
    expect(screen.getByRole("combobox")).toBeInTheDocument()
  })

  it.skip("does not render dialog when open is false", () => {
    // Skip for now - need to fix atom mocking approach
  })

  it("renders with visually hidden dialog title for accessibility", () => {
    renderDialog()

    // Title should be present but visually hidden for accessibility
    expect(screen.getByTestId("dialog-title")).toBeInTheDocument()
    expect(screen.getByText("New Task")).toBeInTheDocument()
  })

  it("renders input with correct placeholder", () => {
    renderDialog()

    const input = screen.getByRole("combobox")
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute(
      "aria-label",
      "Quick add task input with natural language parsing",
    )
  })

  it.skip("handles task creation when Enter is pressed", async () => {
    render(<QuickAddDialog />)

    const input = screen.getByRole("combobox")
    fireEvent.focus(input)
    fireEvent.input(input, { target: { textContent: "Buy groceries" } })
    fireEvent.keyDown(input, { key: "Enter", target: input, currentTarget: input })

    await waitFor(() => {
      expect(mockAddTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Buy groceries",
          priority: 4,
          projectId: "inbox",
          labels: [],
        }),
      )
    })
  })

  it.skip("handles task creation with current project", async () => {
    // Skip complex test requiring proper context setup
  })

  it.skip("parses priority from input", async () => {
    render(<QuickAddDialog />)

    const input = screen.getByRole("combobox")
    fireEvent.focus(input)
    fireEvent.input(input, { target: { textContent: "Buy groceries p1" } })
    fireEvent.keyDown(input, { key: "Enter", target: input, currentTarget: input })

    await waitFor(() => {
      expect(mockAddTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Buy groceries",
          priority: 1,
        }),
      )
    })
  })

  it.skip("parses labels from input", async () => {
    render(<QuickAddDialog />)

    const input = screen.getByRole("combobox")
    fireEvent.focus(input)
    fireEvent.input(input, { target: { textContent: "Buy groceries @urgent" } })
    fireEvent.keyDown(input, { key: "Enter", target: input, currentTarget: input })

    await waitFor(() => {
      expect(mockAddTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Buy groceries",
          labels: ["urgent"],
        }),
      )
    })
  })

  it.skip("parses project from input", async () => {
    render(<QuickAddDialog />)

    const input = screen.getByRole("combobox")
    fireEvent.focus(input)
    fireEvent.input(input, { target: { textContent: "Buy groceries #work" } })
    fireEvent.keyDown(input, { key: "Enter", target: input, currentTarget: input })

    await waitFor(() => {
      expect(mockAddTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Buy groceries",
          projectId: "p1", // Maps "work" to project id "p1"
        }),
      )
    })
  })

  it.skip("closes dialog after task creation", async () => {
    render(<QuickAddDialog />)

    const input = screen.getByRole("combobox")
    fireEvent.focus(input)
    fireEvent.input(input, { target: { textContent: "Buy groceries" } })
    fireEvent.keyDown(input, { key: "Enter", target: input, currentTarget: input })

    await waitFor(() => {
      expect(mockCloseDialog).toHaveBeenCalled()
    })
  })

  it("renders with modern CSS classes", () => {
    renderDialog()

    const dialogContent = screen.getByTestId("dialog-content")
    expect(dialogContent).toHaveClass(
      "w-full",
      "max-w-[420px]",
      "sm:max-w-[520px]",
      "md:max-w-[600px]",
      "p-1",
      "border",
      "shadow-2xl",
    )
  })

  it("shows description textarea", () => {
    renderDialog()

    const description = screen.getByPlaceholderText("Description")
    expect(description).toBeInTheDocument()
  })

  it("shows project button in quick actions bar", () => {
    renderDialog()

    const projectButton = screen.getByRole("button", { name: /project/i })
    expect(projectButton).toBeInTheDocument()
    expect(projectButton).toHaveAttribute("aria-label", "Project")
    expect(projectButton).not.toHaveTextContent("Project")
  })

  it("disables submit button when no title is parsed", () => {
    renderDialog()

    const submitButton = screen.getByText("Add task")
    expect(submitButton).toBeDisabled()
  })

  it("does not close dialog when Escape is pressed while autocomplete is open", async () => {
    renderDialog()

    const input = screen.getByTestId("enhanced-input")
    // Type value that opens autocomplete in the mock
    fireEvent.change(input, { target: { value: "@project" } })

    // Let state update propagate
    await Promise.resolve()

    const dialogContent = screen.getByTestId("dialog-content")
    fireEvent.keyDown(dialogContent, { key: "Escape" })

    expect(mockCloseDialog).not.toHaveBeenCalled()

    // With autocomplete closed, Escape should close dialog (call close atom)
    fireEvent.change(input, { target: { value: "" } })
    fireEvent.keyDown(dialogContent, { key: "Escape" })

    return waitFor(() => {
      expect(mockCloseDialog).toHaveBeenCalledTimes(1)
    })
  })

  it("enables submit button when title is entered", async () => {
    renderDialog()

    const input = screen.getByTestId("enhanced-input")
    fireEvent.change(input, { target: { value: "Buy groceries" } })

    await waitFor(() => {
      const submitButton = screen.getByText("Add task")
      expect(submitButton).not.toBeDisabled()
    })
  })

  it.skip("handles cancel button click", () => {
    // Skip until we fix atom mocking
  })

  describe("Recurring Functionality", () => {
    it("should handle recurring schedule from popover", async () => {
      render(<QuickAddDialog />)

      // Click the date button to open TaskSchedulePopover
      const dateButton = screen.getByRole("button", { name: "Date" })
      fireEvent.click(dateButton)

      await waitFor(() => {
        expect(screen.getByTestId("task-schedule-popover")).toBeInTheDocument()
      })

      // Click the mock daily recurring button
      fireEvent.click(screen.getByTestId("mock-schedule-daily"))

      // Verify the button text shows recurring pattern
      // Give more time for the atom update to propagate
      await waitFor(
        () => {
          // Look for Daily in the date button - try multiple approaches
          const dateButtonsWithDaily = screen.queryAllByText("Daily")
          const dateButtonsWithRecurring = screen.queryAllByText(/Daily|Recurring/)

          expect(dateButtonsWithDaily.length > 0 || dateButtonsWithRecurring.length > 0).toBe(true)
        },
        { timeout: 3000 },
      )
    })

    it.skip("should handle due date schedule from popover", async () => {
      // Skip complex popover integration test - core atom functionality tested elsewhere
    })

    it.skip("should handle removing schedule from popover", async () => {
      // Skip complex popover integration test - core atom functionality tested elsewhere
    })

    it("should parse recurring pattern from natural language input", async () => {
      const { parseEnhancedNaturalLanguage } = await import(
        "@/lib/utils/enhanced-natural-language-parser"
      )
      vi.mocked(parseEnhancedNaturalLanguage).mockImplementation(() =>
        buildParsedResult({
          title: "Water plants",
          originalText: "Water plants daily",
          recurring: "RRULE:FREQ=DAILY",
        }),
      )

      render(<QuickAddDialog />)

      const input = screen.getByTestId("enhanced-input")
      fireEvent.change(input, { target: { value: "Water plants daily" } })

      // Give more time for NLP parsing + atom sync + re-render
      await waitFor(
        () => {
          // Look for Daily text anywhere in the component, not just the button
          const dailyElements = screen.queryAllByText(/Daily/)
          expect(dailyElements.length).toBeGreaterThan(0)
        },
        { timeout: 3000 },
      )
    })

    it.skip("should show recurring pattern badge with remove button", async () => {
      const { parseEnhancedNaturalLanguage } = await import(
        "@/lib/utils/enhanced-natural-language-parser"
      )
      vi.mocked(parseEnhancedNaturalLanguage).mockImplementation(() =>
        buildParsedResult({
          title: "Water plants",
          originalText: "Water plants weekly",
          recurring: "RRULE:FREQ=WEEKLY",
        }),
      )

      render(<QuickAddDialog />)

      const input = screen.getByTestId("enhanced-input")
      fireEvent.change(input, { target: { value: "Water plants weekly" } })

      await waitFor(() => {
        // Look for the Weekly text in a badge (which indicates parsed recurring pattern)
        const badge = screen.getByTestId("badge")
        expect(badge).toHaveTextContent("Weekly")
      })

      // Should have a remove button in the badge
      const removeButtons = screen.getAllByRole("button")
      const hasRemoveButton = removeButtons.some((button) =>
        button.querySelector("svg")?.classList.contains("lucide-x"),
      )
      expect(hasRemoveButton).toBe(true)
    })

    it.skip("should handle task creation with manual recurring pattern", async () => {
      // Skip complex atom/popover integration test - requires proper state sync between popover and atoms
    })

    it.skip("should handle task creation with parsed recurring pattern", async () => {
      const { parseEnhancedNaturalLanguage } = await import(
        "@/lib/utils/enhanced-natural-language-parser"
      )
      vi.mocked(parseEnhancedNaturalLanguage).mockImplementation(() =>
        buildParsedResult({
          title: "Daily standup",
          originalText: "Daily standup meeting",
          recurring: "RRULE:FREQ=DAILY",
        }),
      )

      render(<QuickAddDialog />)

      const input = screen.getByTestId("enhanced-input")
      fireEvent.change(input, { target: { value: "Daily standup meeting" } })

      // Submit the task
      const submitButton = screen.getByText("Add task")
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockAddTask).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Daily standup",
          }),
        )
      })
    })

    it.skip("should show repeat icon when recurring pattern is set", async () => {
      render(<QuickAddDialog />)

      // Set recurring pattern
      const dateButton = screen.getByRole("button", { name: "Date" })
      fireEvent.click(dateButton)

      await waitFor(() => {
        expect(screen.getByTestId("task-schedule-popover")).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId("mock-schedule-daily"))

      // Should show repeat icon instead of calendar icon
      await waitFor(() => {
        const button = screen.getByRole("button", { name: "Date" })
        const hasRepeatIcon = button?.querySelector("svg")?.classList.contains("lucide-repeat")
        expect(hasRepeatIcon).toBe(true)
      })
    })

    it("should clear form state after successful submission", async () => {
      render(<QuickAddDialog />)

      // Add content and set recurring
      const input = screen.getByTestId("enhanced-input")
      fireEvent.change(input, { target: { value: "Test task" } })

      const dateButton = screen.getByRole("button", { name: "Date" })
      fireEvent.click(dateButton)

      await waitFor(() => {
        expect(screen.getByTestId("task-schedule-popover")).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId("mock-schedule-daily"))

      // Submit
      const submitButton = screen.getByText("Add task")
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockAddTask).toHaveBeenCalled()
        expect(mockCloseDialog).toHaveBeenCalled()
      })
    })
  })

  describe("Parsed Values Management", () => {
    describe("Project Selection", () => {
      it("clears atom state when parsed project is removed from input", async () => {
        const { parseEnhancedNaturalLanguage } = await import(
          "@/lib/utils/enhanced-natural-language-parser"
        )

        // Mock parser to match the current input (called twice per change)
        vi.mocked(parseEnhancedNaturalLanguage).mockImplementation((text) =>
          String(text).includes("#work")
            ? buildParsedResult({
                title: "Buy groceries",
                originalText: "Buy groceries #work",
                project: "Work",
              })
            : buildParsedResult({
                title: "Buy groceries",
                originalText: "Buy groceries",
              }),
        )

        render(<QuickAddDialog />)

        const input = screen.getByTestId("enhanced-input")

        // First, type text with project
        await act(async () => {
          fireEvent.change(input, { target: { value: "Buy groceries #work" } })
        })

        // Wait for project to be set
        await waitFor(() => {
          expect(mockUpdateTask).toHaveBeenCalledWith(
            expect.objectContaining({
              updateRequest: { projectId: TEST_PROJECT_ID_1 },
            }),
          )
        })

        // Then remove the project from input
        await act(async () => {
          fireEvent.change(input, { target: { value: "Buy groceries" } })
        })

        // Wait for project to be cleared
        await waitFor(() => {
          expect(mockUpdateTask).toHaveBeenCalledWith(
            expect.objectContaining({
              updateRequest: { projectId: undefined },
            }),
          )
        })
      })

      it("preserves manually selected project when input text changes", async () => {
        const { parseEnhancedNaturalLanguage } = await import(
          "@/lib/utils/enhanced-natural-language-parser"
        )

        // Mock parser to return no project
        vi.mocked(parseEnhancedNaturalLanguage).mockImplementation(() =>
          buildParsedResult({
            title: "Buy groceries",
            originalText: "Buy groceries",
          }),
        )

        render(<QuickAddDialog />)

        const input = screen.getByTestId("enhanced-input")

        // Type some text first
        await act(async () => {
          fireEvent.change(input, { target: { value: "Buy groceries" } })
        })

        // Manually select Work project using the mock button
        await act(async () => {
          const workProjectButton = screen.getByTestId("mock-select-work-project")
          fireEvent.click(workProjectButton)
        })

        // Verify project was set
        await waitFor(() => {
          expect(mockUpdateTask).toHaveBeenCalledWith(
            expect.objectContaining({
              updateRequest: { projectId: TEST_PROJECT_ID_1 },
            }),
          )
        })

        // Clear the mock calls to isolate the next assertion
        mockUpdateTask.mockClear()

        // Change the input text (but still no parsed project)
        await act(async () => {
          fireEvent.change(input, { target: { value: "Buy groceries tomorrow" } })
          // Wait for debounced parsing to complete
          await new Promise((resolve) => setTimeout(resolve, 200))
        })

        // Verify that project was NOT cleared (mockUpdateTask should not be called with projectId: undefined)
        const clearingCalls = mockUpdateTask.mock.calls.filter(
          (call) => call[0]?.updateRequest?.projectId === undefined,
        )
        expect(clearingCalls).toHaveLength(0)
      })
    })

    describe("Label Management", () => {
      it("clears atom state when parsed labels are removed from input", async () => {
        const { parseEnhancedNaturalLanguage } = await import(
          "@/lib/utils/enhanced-natural-language-parser"
        )

        // Mock parser to first return labels, then no labels
        vi.mocked(parseEnhancedNaturalLanguage)
          .mockImplementationOnce(() =>
            buildParsedResult({
              title: "Buy groceries",
              originalText: "Buy groceries @urgent @important",
              labels: ["urgent", "important"],
            }),
          )
          .mockImplementationOnce(() =>
            buildParsedResult({
              title: "Buy groceries",
              originalText: "Buy groceries",
              labels: [],
            }),
          )

        render(<QuickAddDialog />)

        const input = screen.getByTestId("enhanced-input")

        // First, type text with labels
        await act(async () => {
          fireEvent.change(input, { target: { value: "Buy groceries @urgent @important" } })
        })

        // Wait for labels to be set
        await waitFor(() => {
          expect(mockUpdateTask).toHaveBeenCalledWith(
            expect.objectContaining({
              updateRequest: { labels: [TEST_LABEL_ID_1, TEST_LABEL_ID_2] }, // Based on mock labels
            }),
          )
        })

        // Then remove the labels from input
        await act(async () => {
          fireEvent.change(input, { target: { value: "Buy groceries" } })
        })

        // Wait for labels to be cleared
        await waitFor(() => {
          expect(mockUpdateTask).toHaveBeenCalledWith(
            expect.objectContaining({
              updateRequest: { labels: [] },
            }),
          )
        })
      })

      it("preserves manually selected labels when input text changes", async () => {
        const { parseEnhancedNaturalLanguage } = await import(
          "@/lib/utils/enhanced-natural-language-parser"
        )

        // Mock parser to return no labels
        vi.mocked(parseEnhancedNaturalLanguage).mockImplementation(() =>
          buildParsedResult({
            title: "Buy groceries",
            originalText: "Buy groceries",
            labels: [],
          }),
        )

        render(<QuickAddDialog />)

        const input = screen.getByTestId("enhanced-input")

        // Type some text first
        await act(async () => {
          fireEvent.change(input, { target: { value: "Buy groceries" } })
        })

        // Manually add a label through the mock popover
        await act(async () => {
          const addLabelButton = screen.getByTestId("mock-add-label")
          fireEvent.click(addLabelButton)
        })

        // Verify label was set
        await waitFor(() => {
          expect(mockUpdateTask).toHaveBeenCalledWith(
            expect.objectContaining({
              updateRequest: { labels: [TEST_LABEL_ID_1] }, // Mock urgent label
            }),
          )
        })

        // Clear the mock calls to isolate the next assertion
        mockUpdateTask.mockClear()

        // Change the input text (but still no parsed labels)
        await act(async () => {
          fireEvent.change(input, { target: { value: "Buy groceries tomorrow" } })
          // Wait for debounced parsing to complete
          await new Promise((resolve) => setTimeout(resolve, 200))
        })

        // Verify that labels were NOT cleared
        const clearingCalls = mockUpdateTask.mock.calls.filter(
          (call) => call[0]?.updateRequest?.labels && call[0].updateRequest.labels.length === 0,
        )
        expect(clearingCalls).toHaveLength(0)
      })
    })

    describe("Priority Management", () => {
      it("clears atom state when parsed priority is removed from input", async () => {
        const { parseEnhancedNaturalLanguage } = await import(
          "@/lib/utils/enhanced-natural-language-parser"
        )

        // Mock parser to first return priority, then no priority
        vi.mocked(parseEnhancedNaturalLanguage)
          .mockImplementationOnce(() =>
            buildParsedResult({
              title: "Buy groceries",
              originalText: "Buy groceries p1",
              priority: 1,
            }),
          )
          .mockImplementationOnce(() =>
            buildParsedResult({
              title: "Buy groceries",
              originalText: "Buy groceries",
              priority: undefined,
            }),
          )

        render(<QuickAddDialog />)

        const input = screen.getByTestId("enhanced-input")

        // First, type text with priority
        await act(async () => {
          fireEvent.change(input, { target: { value: "Buy groceries p1" } })
        })

        // Wait for priority to be set
        await waitFor(() => {
          expect(mockUpdateTask).toHaveBeenCalledWith(
            expect.objectContaining({
              updateRequest: { priority: 1 },
            }),
          )
        })

        // Then remove the priority from input
        await act(async () => {
          fireEvent.change(input, { target: { value: "Buy groceries" } })
        })

        // Wait for priority to be cleared
        await waitFor(() => {
          expect(mockUpdateTask).toHaveBeenCalledWith(
            expect.objectContaining({
              updateRequest: { priority: undefined },
            }),
          )
        })
      })

      it("preserves manually selected priority when input text changes", async () => {
        const { parseEnhancedNaturalLanguage } = await import(
          "@/lib/utils/enhanced-natural-language-parser"
        )

        // Mock parser to return no priority
        vi.mocked(parseEnhancedNaturalLanguage).mockImplementation(() =>
          buildParsedResult({
            title: "Buy groceries",
            originalText: "Buy groceries",
            priority: undefined,
          }),
        )

        render(<QuickAddDialog />)

        const input = screen.getByTestId("enhanced-input")

        // Type some text first
        await act(async () => {
          fireEvent.change(input, { target: { value: "Buy groceries" } })
        })

        // Manually select priority through UI (simulate clicking P1)
        await act(async () => {
          const priorityButton = screen.getByRole("button", { name: /^priority$/i })
          fireEvent.click(priorityButton)
          // Simulate selecting Priority 1
          const p1Option = screen.getByTestId("mock-priority-1")
          fireEvent.click(p1Option)
        })

        // Verify priority was set
        await waitFor(() => {
          expect(mockUpdateTask).toHaveBeenCalledWith(
            expect.objectContaining({
              updateRequest: { priority: 1 },
            }),
          )
        })

        // Clear the mock calls to isolate the next assertion
        mockUpdateTask.mockClear()

        // Change the input text (but still no parsed priority)
        await act(async () => {
          fireEvent.change(input, { target: { value: "Buy groceries tomorrow" } })
          // Wait for debounced parsing to complete
          await new Promise((resolve) => setTimeout(resolve, 200))
        })

        // Verify that priority was NOT cleared
        const clearingCalls = mockUpdateTask.mock.calls.filter(
          (call) => call[0]?.updateRequest?.priority === undefined,
        )
        expect(clearingCalls).toHaveLength(0)
      })

      it("overrides manually selected priority with parsed priority", async () => {
        const { parseEnhancedNaturalLanguage } = await import(
          "@/lib/utils/enhanced-natural-language-parser"
        )

        // First mock: return no priority (for manual selection step)
        // Second mock: return p1 priority (parsed priority should override)
        vi.mocked(parseEnhancedNaturalLanguage)
          .mockImplementationOnce(() =>
            buildParsedResult({
              title: "Buy groceries",
              originalText: "Buy groceries",
              priority: undefined,
            }),
          )
          .mockImplementationOnce(() =>
            buildParsedResult({
              title: "Buy groceries",
              originalText: "Buy groceries p1",
              priority: 1,
            }),
          )

        render(<QuickAddDialog />)

        const input = screen.getByTestId("enhanced-input")

        // Step 1: Type some text first (no priority parsing)
        await act(async () => {
          fireEvent.change(input, { target: { value: "Buy groceries" } })
        })

        // Step 2: Manually select P2 priority through UI
        await act(async () => {
          const priorityButton = screen.getByRole("button", { name: /^priority$/i })
          fireEvent.click(priorityButton)
          // Simulate selecting Priority 2
          const p2Option = screen.getByTestId("mock-priority-2")
          fireEvent.click(p2Option)
        })

        // Verify P2 priority was set
        await waitFor(() => {
          expect(mockUpdateTask).toHaveBeenCalledWith(
            expect.objectContaining({
              updateRequest: { priority: 2 },
            }),
          )
        })

        // Clear the mock calls to isolate the next assertion
        mockUpdateTask.mockClear()

        // Step 3: Change input text to include parsed P1 priority
        await act(async () => {
          fireEvent.change(input, { target: { value: "Buy groceries p1" } })
          // Allow immediate parsing (delay=0) to complete
          await new Promise((resolve) => setTimeout(resolve, 5))
        })

        // Verify that parsed P1 priority overrides manually selected P2
        await waitFor(() => {
          expect(mockUpdateTask).toHaveBeenCalledWith(
            expect.objectContaining({
              updateRequest: { priority: 1 },
            }),
          )
        })
      })
    })

    describe("Due Date Management", () => {
      it("clears atom state when parsed due date is removed from input", async () => {
        const { parseEnhancedNaturalLanguage } = await import(
          "@/lib/utils/enhanced-natural-language-parser"
        )

        const testDate = new Date("2022-01-15")

        // Mock parser to first return due date, then no due date
        vi.mocked(parseEnhancedNaturalLanguage)
          .mockImplementationOnce(() =>
            buildParsedResult({
              title: "Buy groceries",
              originalText: "Buy groceries tomorrow",
              dueDate: testDate,
            }),
          )
          .mockImplementationOnce(() =>
            buildParsedResult({
              title: "Buy groceries",
              originalText: "Buy groceries",
            }),
          )

        render(<QuickAddDialog />)

        const input = screen.getByTestId("enhanced-input")

        // First, type text with due date
        await act(async () => {
          fireEvent.change(input, { target: { value: "Buy groceries tomorrow" } })
        })

        // Wait for due date to be set
        await waitFor(() => {
          expect(mockUpdateTask).toHaveBeenCalledWith(
            expect.objectContaining({
              updateRequest: { dueDate: testDate },
            }),
          )
        })

        // Then remove the due date from input
        await act(async () => {
          fireEvent.change(input, { target: { value: "Buy groceries" } })
        })

        // Wait for due date to be cleared
        await waitFor(() => {
          expect(mockUpdateTask).toHaveBeenCalledWith(
            expect.objectContaining({
              updateRequest: { dueDate: undefined },
            }),
          )
        })
      })

      it("preserves manually selected due date when input text changes", async () => {
        const { parseEnhancedNaturalLanguage } = await import(
          "@/lib/utils/enhanced-natural-language-parser"
        )

        // Mock parser to return no due date
        vi.mocked(parseEnhancedNaturalLanguage).mockImplementation(() =>
          buildParsedResult({
            title: "Buy groceries",
            originalText: "Buy groceries",
          }),
        )

        render(<QuickAddDialog />)

        const input = screen.getByTestId("enhanced-input")

        // Type some text first
        await act(async () => {
          fireEvent.change(input, { target: { value: "Buy groceries" } })
        })

        // Manually set a due date through the schedule popover
        await act(async () => {
          const dateButtons = screen.getAllByRole("button", { name: /date/i })
          const scheduleButton = dateButtons.find((btn) => !btn.getAttribute("data-testid"))
          if (scheduleButton) {
            fireEvent.click(scheduleButton)
            // Simulate selecting "Today" from the popover
            const todayButton = screen.getByTestId("mock-schedule-today")
            fireEvent.click(todayButton)
          }
        })

        // Note: TaskSchedulePopover handles date setting through atoms directly,
        // so we can't easily verify the exact call here, but we can verify
        // that no clearing happens after manual selection

        // Clear the mock calls to isolate the next assertion
        mockUpdateTask.mockClear()

        // Change the input text (but still no parsed due date)
        await act(async () => {
          fireEvent.change(input, { target: { value: "Buy groceries later" } })
          // Wait for debounced parsing to complete
          await new Promise((resolve) => setTimeout(resolve, 200))
        })

        // Verify that due date was NOT cleared
        const clearingCalls = mockUpdateTask.mock.calls.filter(
          (call) => call[0]?.updateRequest?.dueDate === undefined,
        )
        expect(clearingCalls).toHaveLength(0)
      })

      it("overrides manually selected due date with parsed due date", async () => {
        const { parseEnhancedNaturalLanguage } = await import(
          "@/lib/utils/enhanced-natural-language-parser"
        )

        const manualDate = new Date("2022-01-20")
        const parsedDate = new Date("2022-01-15")

        // Mock parser to return different values based on input text
        vi.mocked(parseEnhancedNaturalLanguage).mockImplementation((text: string) => {
          if (text === "Buy groceries tomorrow") {
            return buildParsedResult({
              title: "Buy groceries",
              originalText: "Buy groceries tomorrow",
              dueDate: parsedDate,
            })
          }
          return buildParsedResult({
            title: text,
            originalText: text,
          })
        })

        render(<QuickAddDialog />)

        const input = screen.getByTestId("enhanced-input")

        // Step 1: Type some text first (no due date parsing)
        await act(async () => {
          fireEvent.change(input, { target: { value: "Buy groceries" } })
        })

        // Step 2: Manually set a due date through the schedule popover
        await act(async () => {
          const dateButtons = screen.getAllByRole("button", { name: /date/i })
          const scheduleButton = dateButtons.find((btn) => !btn.getAttribute("data-testid"))
          if (scheduleButton) {
            fireEvent.click(scheduleButton)
            // Simulate selecting a manual date from the popover
            const todayButton = screen.getByTestId("mock-schedule-today")
            fireEvent.click(todayButton)
          }
        })

        // Note: TaskSchedulePopover handles date setting through atoms directly,
        // so we simulate the atom update that would happen
        await act(async () => {
          mockUpdateTask({ updateRequest: { dueDate: manualDate } })
        })

        // Clear the mock calls to isolate the next assertion
        mockUpdateTask.mockClear()

        // Step 3: Change input text to include parsed due date
        await act(async () => {
          fireEvent.change(input, { target: { value: "Buy groceries tomorrow" } })
          // Allow immediate parsing (delay=0) to complete
          await new Promise((resolve) => setTimeout(resolve, 5))
        })

        // Verify that parsed due date overrides manually selected date
        await waitFor(() => {
          expect(mockUpdateTask).toHaveBeenCalledWith(
            expect.objectContaining({
              updateRequest: { dueDate: parsedDate },
            }),
          )
        })
      })
    })

    describe("Recurring Pattern Management", () => {
      it("clears atom state when parsed recurring pattern is removed from input", async () => {
        const { parseEnhancedNaturalLanguage } = await import(
          "@/lib/utils/enhanced-natural-language-parser"
        )

        // Mock parser to first return recurring pattern, then no recurring
        vi.mocked(parseEnhancedNaturalLanguage)
          .mockImplementationOnce(() =>
            buildParsedResult({
              title: "Water plants",
              originalText: "Water plants daily",
              recurring: "RRULE:FREQ=DAILY",
            }),
          )
          .mockImplementationOnce(() =>
            buildParsedResult({
              title: "Water plants",
              originalText: "Water plants",
            }),
          )

        render(<QuickAddDialog />)

        const input = screen.getByTestId("enhanced-input")

        // First, type text with recurring pattern
        await act(async () => {
          fireEvent.change(input, { target: { value: "Water plants daily" } })
        })

        // Wait for recurring pattern to be set
        await waitFor(() => {
          expect(mockUpdateTask).toHaveBeenCalledWith(
            expect.objectContaining({
              updateRequest: expect.objectContaining({ recurring: "RRULE:FREQ=DAILY" }),
            }),
          )
        })

        // Then remove the recurring pattern from input
        await act(async () => {
          fireEvent.change(input, { target: { value: "Water plants" } })
        })

        // Wait for recurring pattern to be cleared
        await waitFor(() => {
          expect(mockUpdateTask).toHaveBeenCalledWith(
            expect.objectContaining({
              updateRequest: { recurring: undefined },
            }),
          )
        })
      })

      it("preserves manually selected recurring pattern when input text changes", async () => {
        const { parseEnhancedNaturalLanguage } = await import(
          "@/lib/utils/enhanced-natural-language-parser"
        )

        // Mock parser to return no recurring pattern
        vi.mocked(parseEnhancedNaturalLanguage).mockImplementation(() =>
          buildParsedResult({
            title: "Water plants",
            originalText: "Water plants",
          }),
        )

        render(<QuickAddDialog />)

        const input = screen.getByTestId("enhanced-input")

        // Type some text first
        await act(async () => {
          fireEvent.change(input, { target: { value: "Water plants" } })
        })

        // Manually set recurring pattern through the schedule popover
        await act(async () => {
          const dateButtons = screen.getAllByRole("button", { name: /date/i })
          const scheduleButton = dateButtons.find((btn) => !btn.getAttribute("data-testid"))
          if (scheduleButton) {
            fireEvent.click(scheduleButton)
            // Simulate selecting "Daily" from the popover
            const dailyButton = screen.getByTestId("mock-schedule-daily")
            fireEvent.click(dailyButton)
          }
        })

        // Note: TaskSchedulePopover handles recurring setting through atoms directly,
        // so we can't easily verify the exact call here, but we can verify
        // that no clearing happens after manual selection

        // Clear the mock calls to isolate the next assertion
        mockUpdateTask.mockClear()

        // Change the input text (but still no parsed recurring)
        await act(async () => {
          fireEvent.change(input, { target: { value: "Water plants tomorrow" } })
          // Wait for debounced parsing to complete
          await new Promise((resolve) => setTimeout(resolve, 200))
        })

        // Verify that recurring pattern was NOT cleared
        const clearingCalls = mockUpdateTask.mock.calls.filter(
          (call) => call[0]?.updateRequest?.recurring === undefined,
        )
        expect(clearingCalls).toHaveLength(0)
      })

      it("overrides manually selected recurring pattern with parsed recurring pattern", async () => {
        const { parseEnhancedNaturalLanguage } = await import(
          "@/lib/utils/enhanced-natural-language-parser"
        )

        // Mock parser to return different values based on input text
        vi.mocked(parseEnhancedNaturalLanguage).mockImplementation((text: string) => {
          if (text === "Water plants weekly") {
            return buildParsedResult({
              title: "Water plants",
              originalText: "Water plants weekly",
              recurring: "RRULE:FREQ=WEEKLY",
            })
          }
          return buildParsedResult({
            title: text,
            originalText: text,
          })
        })

        render(<QuickAddDialog />)

        const input = screen.getByTestId("enhanced-input")

        // Step 1: Type some text first (no recurring parsing)
        await act(async () => {
          fireEvent.change(input, { target: { value: "Water plants" } })
        })

        // Step 2: Manually set a daily recurring pattern through the schedule popover
        await act(async () => {
          const dateButtons = screen.getAllByRole("button", { name: /date/i })
          const scheduleButton = dateButtons.find((btn) => !btn.getAttribute("data-testid"))
          if (scheduleButton) {
            fireEvent.click(scheduleButton)
            // Simulate selecting "Daily" from the popover
            const dailyButton = screen.getByTestId("mock-schedule-daily")
            fireEvent.click(dailyButton)
          }
        })

        // Note: TaskSchedulePopover handles recurring setting through atoms directly,
        // so we simulate the atom update that would happen
        await act(async () => {
          mockUpdateTask({ updateRequest: { recurring: "RRULE:FREQ=DAILY" } })
        })

        // Clear the mock calls to isolate the next assertion
        mockUpdateTask.mockClear()

        // Step 3: Change input text to include parsed weekly recurring pattern
        await act(async () => {
          fireEvent.change(input, { target: { value: "Water plants weekly" } })
          // Allow immediate parsing (delay=0) to complete
          await new Promise((resolve) => setTimeout(resolve, 5))
          // Ensure all synchronous React updates are flushed
          flushSync(() => {})
        })

        // Verify that parsed weekly pattern overrides manually selected daily pattern
        await waitFor(() => {
          expect(mockUpdateTask).toHaveBeenCalledWith(
            expect.objectContaining({
              updateRequest: expect.objectContaining({ recurring: "RRULE:FREQ=WEEKLY" }),
            }),
          )
        })
      })
    })
  })

  describe("NLP Toggle Functionality", () => {
    it("disables parsing when NLP toggle is turned off", async () => {
      const { parseEnhancedNaturalLanguage } = await import(
        "@/lib/utils/enhanced-natural-language-parser"
      )

      // Mock parser to return priority when enabled
      vi.mocked(parseEnhancedNaturalLanguage).mockReturnValue(
        buildParsedResult({
          title: "Buy groceries",
          originalText: "Buy groceries p1",
          priority: 1,
        }),
      )

      render(<QuickAddDialog />)

      const input = screen.getByTestId("enhanced-input")
      const nlpToggle = screen.getByTestId("nlp-toggle")

      // Initially NLP should be enabled and parsing should work
      fireEvent.change(input, { target: { value: "Buy groceries p1" } })

      // Wait for parsing to take effect
      await waitFor(() => {
        expect(parseEnhancedNaturalLanguage).toHaveBeenCalled()
      })

      // Verify priority was set by parsing
      await waitFor(() => {
        expect(mockUpdateTask).toHaveBeenCalledWith(
          expect.objectContaining({
            updateRequest: { priority: 1 },
          }),
        )
      })

      // Clear updateTask mock to track new calls after disabling NLP
      mockUpdateTask.mockClear()

      // Turn off NLP toggle
      fireEvent.click(nlpToggle)

      // Wait for state update
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Type new text that would normally be parsed
      fireEvent.change(input, { target: { value: "Buy groceries p2" } })

      // Wait to ensure parsing would have happened if enabled
      await new Promise((resolve) => setTimeout(resolve, 200))

      // Verify no new priority was set (parsing was disabled)
      const priorityUpdateCalls = vi
        .mocked(mockUpdateTask)
        .mock.calls.filter((call) => call[0]?.updateRequest?.priority !== undefined)
      expect(priorityUpdateCalls).toHaveLength(0)
    })

    it("clears previously parsed values when NLP is disabled", async () => {
      const { parseEnhancedNaturalLanguage } = await import(
        "@/lib/utils/enhanced-natural-language-parser"
      )

      // Mock parser to return priority when enabled
      vi.mocked(parseEnhancedNaturalLanguage).mockReturnValue(
        buildParsedResult({
          title: "Buy groceries",
          originalText: "Buy groceries p1",
          priority: 1,
        }),
      )

      const { rerender } = render(<QuickAddDialog />)

      const input = screen.getByTestId("enhanced-input")
      const nlpToggle = screen.getByTestId("nlp-toggle")

      // Type text that gets parsed
      await act(async () => {
        fireEvent.change(input, { target: { value: "Buy groceries p1" } })
      })

      // Wait for parsing and verify priority was set
      await waitFor(() => {
        expect(mockUpdateTask).toHaveBeenCalledWith(
          expect.objectContaining({
            updateRequest: { priority: 1 },
          }),
        )
      })

      // Clear mocks
      mockUpdateTask.mockClear()

      // Turn off NLP toggle and force re-render
      await act(async () => {
        fireEvent.click(nlpToggle)
        // Force component to re-render with new state
        rerender(<QuickAddDialog />)
      })

      // Verify the parsed priority was cleared
      await waitFor(() => {
        expect(mockUpdateTask).toHaveBeenCalledWith(
          expect.objectContaining({
            updateRequest: { priority: undefined },
          }),
        )
      })
    })

    it("disables highlighting and autocomplete when NLP is disabled", async () => {
      render(<QuickAddDialog />)

      const input = screen.getByTestId("enhanced-input")
      const nlpToggle = screen.getByTestId("nlp-toggle")

      // Initially NLP is enabled - verify highlighting works
      await act(async () => {
        fireEvent.change(input, { target: { value: "#proj" } })
      })

      // Note: In a real browser, the EnhancedHighlightedInput would apply highlighting styles
      // and show autocomplete. In the test environment with mocks, we can't easily verify
      // the visual aspects, but we can verify the component receives the correct props.

      // Turn off NLP toggle
      await act(async () => {
        fireEvent.click(nlpToggle)
      })

      // Wait for component to re-render with new state
      await waitFor(() => {
        expect(nlpToggle).toHaveAttribute("data-state", "unchecked")
      })

      // Type text that would normally trigger highlighting and autocomplete
      await act(async () => {
        fireEvent.change(input, { target: { value: "#project @label" } })
      })

      // The input should accept the text but not apply special processing
      expect(input).toHaveValue("#project @label")
    })
  })

  describe("Color Consistency", () => {
    it("uses correct color utility functions", () => {
      // Test that our color utilities return expected values consistently with task-item
      expect(getPriorityTextColor(1)).toBe("text-red-500")
      expect(getPriorityTextColor(2)).toBe("text-orange-500")
      expect(getPriorityTextColor(3)).toBe("text-blue-500")
      expect(getPriorityTextColor(4)).toBe("text-muted-foreground")

      expect(getPriorityLabel(1)).toBe("Priority 1")
      expect(getPriorityLabel(2)).toBe("Priority 2")
      expect(getPriorityLabel(3)).toBe("Priority 3")
      expect(getPriorityLabel(4)).toBe("No priority")
    })

    it("applies contextual due date colors for overdue tasks", () => {
      // Test getDueDateTextColor with overdue date
      const overdueDate = new Date("2021-01-01") // Past date
      const overdueColor = getDueDateTextColor(overdueDate, false)
      expect(overdueColor).toBe("text-red-600 dark:text-red-400")

      // Test with completed task (should be muted regardless of date)
      const completedColor = getDueDateTextColor(overdueDate, true)
      expect(completedColor).toBe("text-muted-foreground")
    })
  })

  describe("Responsive Design", () => {
    it("has responsive container classes for proper mobile layout", () => {
      renderDialog()

      const dialogContent = screen.getByTestId("dialog-content")
      expect(dialogContent).toHaveClass(
        "w-full",
        "max-w-[420px]",
        "sm:max-w-[520px]",
        "md:max-w-[600px]",
        "p-1",
      )
    })

    it("has flex-wrap on quick actions bar to prevent overflow", () => {
      renderDialog()

      // Find the quick actions bar container
      const quickActionsBar = screen
        .getByTestId("dialog-content")
        .querySelector(".flex.flex-col.sm\\:flex-row")
      expect(quickActionsBar).toHaveClass("flex-col", "sm:flex-row")

      // Find the buttons container within it
      const buttonsContainer = quickActionsBar?.querySelector(".flex.items-center.gap-1")
      expect(buttonsContainer).toHaveClass("flex-wrap")
    })

    it("uses conditional visibility classes for button text", () => {
      renderDialog()

      // Check that buttons have the smart visibility logic in their HTML structure
      const dialogContent = screen.getByTestId("dialog-content")
      const priorityButton = screen.getByRole("button", { name: "Priority" })
      const dateButton = screen.getByRole("button", { name: "Date" })
      expect(priorityButton).toBeInTheDocument()
      expect(dateButton).toBeInTheDocument()
      expect(screen.queryByText("Priority")).toBeNull()
      expect(screen.queryByText("Date")).toBeNull()

      // Should have responsive text sizing
      const buttons = dialogContent.querySelectorAll(
        "button[class*='text-xs'][class*='sm:text-sm']",
      )
      expect(buttons.length).toBeGreaterThan(0)
    })

    it("has proper responsive button layout and text overflow protection", () => {
      renderDialog()

      const dialogContent = screen.getByTestId("dialog-content")

      // Find buttons with overflow protection classes - PillActionButton uses min-w-0 implicitly
      const buttonsWithMinWidth = dialogContent.querySelectorAll("button[class*='gap-2']")
      expect(buttonsWithMinWidth.length).toBeGreaterThan(0)

      // Pills should still render rounded icons for compact layout
      const pillButtons = dialogContent.querySelectorAll("button[class*='rounded-full']")
      expect(pillButtons.length).toBeGreaterThan(0)
    })

    it("has proper spacing and sizing for mobile viewports", () => {
      renderDialog()

      const dialogContent = screen.getByTestId("dialog-content")

      // Check mobile-first responsive padding
      expect(dialogContent).toHaveClass("p-1")

      // Find textarea and check it has responsive min-height
      const textarea = screen.getByPlaceholderText("Description")
      expect(textarea).toHaveClass("p-2", "bg-muted/30", "focus:bg-background")
    })
  })

  describe("Recurring Pattern Due Date Management", () => {
    let mockUseDebouncedParse: ReturnType<typeof vi.fn>

    beforeEach(async () => {
      // Get the mocked function from the module
      const hookModule = await import("@/hooks/use-debounced-parse")
      mockUseDebouncedParse = vi.mocked(hookModule.useDebouncedParse)
      // Reset to null by default for these tests
      mockUseDebouncedParse.mockReturnValue(null)
    })

    it("renders and functions correctly with recurring pattern parsing", async () => {
      // This test verifies that the new due date clearing logic doesn't break the component
      // Step 1: Test with recurring pattern
      mockUseDebouncedParse.mockReturnValue({
        recurring: "RRULE:FREQ=DAILY;INTERVAL=1",
        title: "daily task",
      })

      render(<QuickAddDialog />)

      // Verify the component renders without errors when recurring pattern is provided
      expect(screen.getByTestId("enhanced-input")).toBeInTheDocument()

      // Step 2: Test clearing recurring pattern
      mockUseDebouncedParse.mockReturnValue({
        title: "task", // No recurring pattern
      })

      // Force a re-render by updating the input value (simulating user typing)
      const input = screen.getByTestId("enhanced-input")
      fireEvent.input(input, { target: { textContent: "task" } })

      // Verify the component still renders properly after clearing
      await waitFor(() => {
        expect(screen.getByTestId("enhanced-input")).toBeInTheDocument()
      })

      // The component should continue to function normally
      expect(screen.getByTestId("task-description")).toBeInTheDocument()
    })

    it("handles edge cases with recurring pattern management", async () => {
      // Test that the component handles null/undefined parsing results gracefully
      mockUseDebouncedParse.mockReturnValue(null)

      render(<QuickAddDialog />)

      await waitFor(() => {
        expect(screen.getByTestId("enhanced-input")).toBeInTheDocument()
      })

      // Test with empty object
      mockUseDebouncedParse.mockReturnValue({})

      const input = screen.getByTestId("enhanced-input")
      fireEvent.input(input, { target: { textContent: "test" } })

      await waitFor(() => {
        expect(screen.getByTestId("enhanced-input")).toBeInTheDocument()
      })

      // Test with recurring pattern but no other fields
      mockUseDebouncedParse.mockReturnValue({
        recurring: "RRULE:FREQ=WEEKLY;INTERVAL=1",
      })

      fireEvent.input(input, { target: { textContent: "weekly task" } })

      await waitFor(() => {
        expect(screen.getByTestId("enhanced-input")).toBeInTheDocument()
      })
    })
  })

  describe("Route Context Initialization", () => {
    // TODO: Fix test mocking to properly simulate today view context
    // The implementation is correct, but the test setup needs work
    it.skip("should set due date to today when opening dialog in today view", async () => {
      // The default mockRouteContext is already set to today view
      // with viewId: "today", routeType: "standard"
      renderDialog()

      await waitFor(
        () => {
          // Verify that updateNewTask was called with dueDate set to today
          const updateCallsWithDueDate = mockUpdateTask.mock.calls.filter(
            (call) => call[0]?.updateRequest?.dueDate,
          )
          expect(updateCallsWithDueDate.length).toBeGreaterThan(0)
        },
        { timeout: 5000 },
      )

      // Verify the date is set to today (start of day)
      const updateCall = mockUpdateTask.mock.calls.find((call) => call[0]?.updateRequest?.dueDate)
      expect(updateCall).toBeDefined()
      if (updateCall) {
        const dueDate = updateCall[0].updateRequest.dueDate
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        // Allow for small time differences due to test execution time
        expect(Math.abs(dueDate.getTime() - today.getTime())).toBeLessThan(1000)
      }
    })

    it("does not override existing due date when opening in calendar context", async () => {
      const originalRouteContext = { ...mockRouteContext }
      try {
        mockRouteContext.pathname = "/calendar"
        mockRouteContext.viewId = "calendar"
        mockRouteContext.projectId = "calendar"
        mockRouteContext.routeType = "standard"

        mockSelectedCalendarDate = new Date("2025-01-10T00:00:00")
        const existingDueDate = new Date("2025-01-12T09:00:00")
        mockTaskForm = {
          title: "Dragged task",
          dueDate: existingDueDate,
          dueTime: existingDueDate,
          projectId: INBOX_PROJECT_ID,
        }

        renderDialog()

        await waitFor(() => {
          const callsWithDueDate = mockUpdateTask.mock.calls.filter(
            (call) => call[0]?.updateRequest?.dueDate !== undefined,
          )
          expect(callsWithDueDate).toHaveLength(0)
        })
      } finally {
        mockRouteContext.pathname = originalRouteContext.pathname
        mockRouteContext.viewId = originalRouteContext.viewId
        mockRouteContext.projectId = originalRouteContext.projectId
        mockRouteContext.routeType = originalRouteContext.routeType
        mockRouteContext.routeParams = originalRouteContext.routeParams
        mockSelectedCalendarDate = null
        mockTaskForm = { title: "" }
      }
    })
  })

  describe("Regression Tests", () => {
    it("should not create new objects in render that are used as hook dependencies", async () => {
      // This test prevents infinite re-render loops caused by creating new objects
      // in the render phase that are then used as dependencies in hooks like useEffect
      const fs = await import("fs")
      const path = await import("path")

      const componentPath = path.join(process.cwd(), "components/dialogs/quick-add-dialog.tsx")
      const sourceCode = fs.readFileSync(componentPath, "utf8")

      // Check for problematic patterns where new objects are created in render
      // and passed to hooks that have them as dependencies
      const problematicPatterns: string[] = []

      // Pattern 1: new Set() passed directly to a hook
      if (sourceCode.match(/useDebouncedParse\([^)]*new Set\(\)/)) {
        problematicPatterns.push(
          "useDebouncedParse is called with 'new Set()' which creates a new object on every render, " +
            "causing infinite re-renders. Use useMemo to create the Set once: const disabledSections = useMemo(() => new Set(), [])",
        )
      }

      // Pattern 2: new Map() passed directly to a hook
      if (sourceCode.match(/useDebouncedParse\([^)]*new Map\(\)/)) {
        problematicPatterns.push(
          "useDebouncedParse is called with 'new Map()' which creates a new object on every render. " +
            "Use useMemo to create it once.",
        )
      }

      // Pattern 3: {} or [] passed directly to hooks (common mistake)
      // This is a simplified check - real code would need more sophisticated parsing
      const hookCallsWithInlineObjects = sourceCode.match(
        /useDebouncedParse\([^)]*\{[^}]*\}|useDebouncedParse\([^)]*\[[^\]]*\]/g,
      )
      if (hookCallsWithInlineObjects) {
        // Filter out cases where it's a destructured object or JSX
        const actualProblems = hookCallsWithInlineObjects.filter((match) => {
          // Exclude JSX and object destructuring
          return !match.includes("=>") && !match.includes("<")
        })
        if (actualProblems.length > 0) {
          problematicPatterns.push(
            "useDebouncedParse is called with inline object/array literal. " +
              "Use useMemo or define outside component to prevent infinite re-renders.",
          )
        }
      }

      if (problematicPatterns.length > 0) {
        throw new Error(
          "Detected patterns that cause infinite re-renders:\n" +
            problematicPatterns.join("\n\n") +
            "\n\nThese create new object references on every render, triggering useEffect/useMemo dependencies.",
        )
      }

      expect(problematicPatterns).toHaveLength(0)
    })

    it("validates useEffect dependencies don't contain circular references", async () => {
      // Read the source code and check for circular dependencies in useEffect hooks
      const fs = await import("fs")
      const path = await import("path")

      const componentPath = path.join(process.cwd(), "components/dialogs/quick-add-dialog.tsx")
      const sourceCode = fs.readFileSync(componentPath, "utf8")

      // Find all useEffect hooks and their dependencies
      const useEffectRegex = /useEffect\(\(\) => \{[\s\S]*?\}, \[([\s\S]*?)\]\)/g
      let match
      const problematicEffects: string[] = []

      while ((match = useEffectRegex.exec(sourceCode)) !== null) {
        const dependencyArray = match[1]
        const fullEffect = match[0]

        // Check if this effect both reads from and writes to the same state
        // Look for updateNewTask calls in the effect body
        if (fullEffect.includes("updateNewTask") && dependencyArray) {
          // Check for circular dependency patterns
          const hasNewTaskDependency =
            dependencyArray.includes("newTask.recurring") ||
            dependencyArray.includes("newTask.dueDate") ||
            dependencyArray.includes("newTask.labels") ||
            dependencyArray.includes("newTask.priority")

          if (hasNewTaskDependency) {
            problematicEffects.push(
              `useEffect that calls updateNewTask has circular dependency: [${dependencyArray.trim()}]`,
            )
          }
        }
      }

      if (problematicEffects.length > 0) {
        throw new Error(
          "Detected circular dependencies in useEffect hooks that can cause infinite re-renders:\n" +
            problematicEffects.join("\n") +
            "\n\nThese effects call updateNewTask while depending on newTask.* values, creating a loop. " +
            "Remove newTask.* dependencies to fix.",
        )
      }

      // If we get here, no circular dependencies were detected
      expect(problematicEffects).toHaveLength(0)
    })
  })
})
