import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import type { Task, VoiceCommand } from "@/lib/types"
import { TEST_VOICE_COMMAND_ID_1, TEST_TASK_ID_3 } from "@/lib/utils/test-constants"
import { createMockTask } from "@/lib/atoms/tests/test-helpers"

// Mock the pathnameAtom
vi.mock("@/lib/atoms/ui/navigation", () => ({
  pathnameAtom: { read: vi.fn().mockReturnValue("/today") },
}))
vi.mock("jotai", () => ({
  useAtomValue: vi.fn(),
}))

// Mock the imported page components
vi.mock("@/components/layout/main-content", () => ({
  MainContent: ({ onVoiceCommand }: { onVoiceCommand: (command: VoiceCommand) => void }) => (
    <div data-testid="main-content">
      <button
        onClick={() =>
          onVoiceCommand({
            id: TEST_VOICE_COMMAND_ID_1,
            phrase: "voice command",
            action: "test",
            parameters: {},
            confidence: 0.9,
          })
        }
      >
        Voice Command
      </button>
    </div>
  ),
}))

vi.mock("@/components/pages/search-page", () => ({
  SearchPage: ({ onTaskClick }: { onTaskClick: (task: Task) => void }) => (
    <div data-testid="search-page">
      <button onClick={() => onTaskClick(createMockTask({ id: TEST_TASK_ID_3 }))}>
        Search Task Click
      </button>
    </div>
  ),
}))

vi.mock("@/components/debug/sound-suite-tester", () => ({
  SoundSuiteTester: () => <div data-testid="sound-suite-tester">Sound Suite Tester</div>,
}))

// Import after mocking
import { RouteContent } from "./route-content"
import { useAtomValue } from "jotai"

interface RouteContentProps {
  onVoiceCommand: (command: VoiceCommand) => void
  onTaskClick: (task: Task) => void
}

describe("RouteContent", () => {
  const defaultProps: RouteContentProps = {
    onVoiceCommand: vi.fn(),
    onTaskClick: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders main content for today view", () => {
    vi.mocked(useAtomValue).mockReturnValue("/today")

    render(<RouteContent {...defaultProps} />)

    expect(screen.getByTestId("main-content")).toBeInTheDocument()
  })

  it("renders main content for inbox view", () => {
    vi.mocked(useAtomValue).mockReturnValue("/inbox")

    render(<RouteContent {...defaultProps} />)

    expect(screen.getByTestId("main-content")).toBeInTheDocument()
  })

  it("renders main content for upcoming view", () => {
    vi.mocked(useAtomValue).mockReturnValue("/upcoming")

    render(<RouteContent {...defaultProps} />)

    expect(screen.getByTestId("main-content")).toBeInTheDocument()
  })

  it("renders main content for project view", () => {
    vi.mocked(useAtomValue).mockReturnValue("/projects/work-project")

    render(<RouteContent {...defaultProps} />)

    expect(screen.getByTestId("main-content")).toBeInTheDocument()
  })

  it("renders main content for label view", () => {
    vi.mocked(useAtomValue).mockReturnValue("/labels/urgent")

    render(<RouteContent {...defaultProps} />)

    expect(screen.getByTestId("main-content")).toBeInTheDocument()
  })

  it("renders main content for filter view", () => {
    vi.mocked(useAtomValue).mockReturnValue("/filters/high-priority")

    render(<RouteContent {...defaultProps} />)

    expect(screen.getByTestId("main-content")).toBeInTheDocument()
  })

  it("renders search page for search route", () => {
    vi.mocked(useAtomValue).mockReturnValue("/search")

    render(<RouteContent {...defaultProps} />)

    expect(screen.getByTestId("search-page")).toBeInTheDocument()
    expect(screen.queryByTestId("main-content")).not.toBeInTheDocument()
  })

  it("renders debug page for debug route", () => {
    // Mock NODE_ENV as development via vi.stubEnv
    vi.stubEnv("NODE_ENV", "development")

    vi.mocked(useAtomValue).mockReturnValue("/debug")

    render(<RouteContent {...defaultProps} />)

    expect(screen.getByText("TaskTrove Debug Tools")).toBeInTheDocument()
    expect(
      screen.getByText("Debug tools have been simplified in this version."),
    ).toBeInTheDocument()

    vi.unstubAllEnvs()
  })

  it("renders debug not available message for debug route in production", () => {
    // Mock NODE_ENV as production via vi.stubEnv
    vi.stubEnv("NODE_ENV", "production")

    vi.mocked(useAtomValue).mockReturnValue("/debug")

    render(<RouteContent {...defaultProps} />)

    expect(screen.getByText("Debug Tools Not Available")).toBeInTheDocument()
    expect(
      screen.getByText(/Debug tools are only available in development environment/),
    ).toBeInTheDocument()

    vi.unstubAllEnvs()
  })

  it("defaults to today view for root path", () => {
    vi.mocked(useAtomValue).mockReturnValue("/")

    render(<RouteContent {...defaultProps} />)

    expect(screen.getByTestId("main-content")).toBeInTheDocument()
  })

  it("handles callback functions correctly", () => {
    vi.mocked(useAtomValue).mockReturnValue("/today")

    const mockOnVoiceCommand = vi.fn()
    const mockOnTaskClick = vi.fn()

    render(<RouteContent onVoiceCommand={mockOnVoiceCommand} onTaskClick={mockOnTaskClick} />)

    // Test voice command callback via MainContent
    const voiceCommandButton = screen.getByText("Voice Command")
    voiceCommandButton.click()
    expect(mockOnVoiceCommand).toHaveBeenCalledWith({
      id: TEST_VOICE_COMMAND_ID_1,
      phrase: "voice command",
      action: "test",
      parameters: {},
      confidence: 0.9,
    })
  })

  it("handles search page task click", () => {
    vi.mocked(useAtomValue).mockReturnValue("/search")

    const mockOnTaskClick = vi.fn()
    render(<RouteContent {...defaultProps} onTaskClick={mockOnTaskClick} />)

    const searchTaskButton = screen.getByText("Search Task Click")
    searchTaskButton.click()
    expect(mockOnTaskClick).toHaveBeenCalledWith(expect.objectContaining({ id: TEST_TASK_ID_3 }))
  })

  it("handles complex project paths", () => {
    vi.mocked(useAtomValue).mockReturnValue("/projects/work-project-with-dashes")

    render(<RouteContent {...defaultProps} />)

    expect(screen.getByTestId("main-content")).toBeInTheDocument()
  })

  it("handles complex label paths", () => {
    vi.mocked(useAtomValue).mockReturnValue("/labels/high-priority-urgent")

    render(<RouteContent {...defaultProps} />)

    expect(screen.getByTestId("main-content")).toBeInTheDocument()
  })

  it("handles complex filter paths", () => {
    vi.mocked(useAtomValue).mockReturnValue("/filters/due-this-week")

    render(<RouteContent {...defaultProps} />)

    expect(screen.getByTestId("main-content")).toBeInTheDocument()
  })

  it("handles paths with no trailing slash", () => {
    vi.mocked(useAtomValue).mockReturnValue("/completed")

    render(<RouteContent {...defaultProps} />)

    expect(screen.getByTestId("main-content")).toBeInTheDocument()
  })

  it("handles paths with trailing slash", () => {
    vi.mocked(useAtomValue).mockReturnValue("/all/")

    render(<RouteContent {...defaultProps} />)

    expect(screen.getByTestId("main-content")).toBeInTheDocument()
  })

  it("passes props correctly to child components", () => {
    vi.mocked(useAtomValue).mockReturnValue("/today")

    const mockOnVoiceCommand = vi.fn()
    const mockOnTaskClick = vi.fn()

    render(<RouteContent onVoiceCommand={mockOnVoiceCommand} onTaskClick={mockOnTaskClick} />)

    // MainContent should be rendered with the correct props
    expect(screen.getByTestId("main-content")).toBeInTheDocument()

    // Verify the props are actually used by triggering the callback
    const voiceCommandButton = screen.getByText("Voice Command")
    voiceCommandButton.click()
    expect(mockOnVoiceCommand).toHaveBeenCalled()
  })
})
