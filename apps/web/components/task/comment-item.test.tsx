import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render, screen, within } from "@/test-utils"
import { CommentItem } from "./comment-item"
import type { TaskComment } from "@/lib/types"
import { createCommentId, createUserId } from "@/lib/types"
import { DEFAULT_UUID } from "@tasktrove/constants"

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <button data-testid="mock-button" {...props}>
      {children}
    </button>
  ),
}))

vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-provider">{children}</div>
  ),
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip">{children}</div>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-trigger">{children}</div>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}))

vi.mock("@/components/ui/custom/editable-div", () => ({
  EditableDiv: ({ value }: { value: string }) => (
    <div data-testid="editable-div">
      <span>{value}</span>
    </div>
  ),
}))

vi.mock("@/components/ui/custom/linkified-text", () => ({
  LinkifiedText: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <p data-testid="linkified-text" className={className}>
      {children}
    </p>
  ),
}))

vi.mock("@/components/task/comment-user-display", () => ({
  CommentUserDisplay: ({ comment }: { comment: TaskComment }) => (
    <span data-testid="comment-user-display">{comment.userId}</span>
  ),
}))

vi.mock("@/components/task/comment-reactions", () => ({
  CommentReactions: () => <div data-testid="comment-reactions" />,
}))

vi.mock("@/components/task/add-reaction-button", () => ({
  AddReactionButton: () => <button data-testid="add-reaction-button">🙂</button>,
}))

vi.mock("@/lib/utils", () => ({
  cn: (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" "),
}))

vi.mock("date-fns", () => ({
  formatDistanceToNow: () => "1 minute ago",
  format: () => "Jan 1, 2024",
}))

describe("CommentItem", () => {
  const baseComment: TaskComment = {
    id: createCommentId(DEFAULT_UUID),
    content: "Went to bed before midnight 🎉",
    createdAt: new Date("2024-01-01T00:00:00Z"),
    userId: createUserId(DEFAULT_UUID),
  }

  it("keeps the actions row aligned with the timestamp", () => {
    render(
      <CommentItem comment={baseComment} mode="inline" onDelete={vi.fn()} onUpdate={vi.fn()} />,
    )

    const header = screen.getByTestId("comment-header")
    const timestamp = screen.getByText("1 minute ago")
    const actions = screen.getByTestId("comment-actions")

    expect(header).toBeInTheDocument()
    expect(header).toContainElement(timestamp)
    expect(header).toContainElement(actions)
    expect(within(actions).getByTestId("add-reaction-button")).toBeInTheDocument()
  })
})
