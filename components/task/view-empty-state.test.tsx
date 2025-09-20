import { render, screen } from "@/test-utils"
import { describe, it, expect, vi } from "vitest"
import { ViewEmptyState } from "./view-empty-state"
import { createProjectId, createLabelId } from "@/lib/types"

describe("ViewEmptyState", () => {
  it("should render inbox empty state", () => {
    render(<ViewEmptyState viewId="inbox" />)

    expect(screen.getByText("Your Inbox is empty")).toBeInTheDocument()
    expect(screen.getByText(/This is your default collection point/)).toBeInTheDocument()
  })

  it("should render today empty state", () => {
    render(<ViewEmptyState viewId="today" />)

    expect(screen.getByText("Nothing scheduled for today")).toBeInTheDocument()
    expect(screen.getByText(/Tasks with today's due date/)).toBeInTheDocument()
  })

  it("should render upcoming empty state", () => {
    render(<ViewEmptyState viewId="upcoming" />)

    expect(screen.getByText("No upcoming tasks")).toBeInTheDocument()
    expect(screen.getByText(/Tasks with future due dates/)).toBeInTheDocument()
  })

  it("should render completed empty state", () => {
    render(<ViewEmptyState viewId="completed" />)

    expect(screen.getByText("No completed tasks yet")).toBeInTheDocument()
    expect(screen.getByText(/Tasks you've finished will appear here/)).toBeInTheDocument()
  })

  it("should render all tasks empty state", () => {
    render(<ViewEmptyState viewId="all" />)

    expect(screen.getByText("No tasks found")).toBeInTheDocument()
    expect(
      screen.getByText(/This view shows all your tasks across all projects/),
    ).toBeInTheDocument()
  })

  it("should render project empty state with project name", () => {
    const projectId = createProjectId("123e4567-e89b-12d3-a456-426614174000")
    render(<ViewEmptyState viewId={projectId} projectName="My Project" />)

    expect(screen.getByText("No tasks in My Project")).toBeInTheDocument()
    expect(screen.getByText(/This project is empty/)).toBeInTheDocument()
  })

  it("should render label empty state with label name", () => {
    const labelId = createLabelId("123e4567-e89b-12d3-a456-426614174001")
    render(<ViewEmptyState viewId={labelId} labelName="Important" />)

    expect(screen.getByText("No tasks with Important label")).toBeInTheDocument()
    expect(screen.getByText(/Tasks tagged with this label/)).toBeInTheDocument()
  })

  it("should render action button when provided", () => {
    const mockAction = { label: "Add Task", onClick: vi.fn() }
    render(<ViewEmptyState viewId="inbox" action={mockAction} />)

    const button = screen.getByRole("button", { name: "Add Task" })
    expect(button).toBeInTheDocument()

    button.click()
    expect(mockAction.onClick).toHaveBeenCalledTimes(1)
  })

  it("should render fallback for unknown view", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions
    render(<ViewEmptyState viewId={"unknown-view" as any} />)

    expect(screen.getByText("No tasks found")).toBeInTheDocument()
    expect(screen.getByText("Create your first task to get started.")).toBeInTheDocument()
  })
})
