"use client"

import React, { useState, useRef, useEffect } from "react"
import { MessageSquare, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useAtomValue, useSetAtom } from "jotai"
import { v4 as uuidv4 } from "uuid"
import { updateTaskAtom, tasksAtom, userAtom } from "@tasktrove/atoms"
import { quickAddTaskAtom, updateQuickAddTaskAtom } from "@tasktrove/atoms"
import type { Task, CreateTaskRequest } from "@/lib/types"
import { createCommentId, createTaskId } from "@/lib/types"
import { useTranslation } from "@tasktrove/i18n"
import { CommentItem } from "./comment-item"

interface CommentContentProps {
  taskId?: string // Optional for quick-add mode
  task?: Task // Deprecated - use taskId instead
  onAddComment?: (content: string) => void // Optional callback - if not provided, will update atoms directly
  onViewAll?: () => void
  mode?: "inline" | "popover"
  className?: string
  scrollToBottomKey?: number // When this changes, triggers scroll to bottom
}

export function CommentContent({
  taskId,
  task: legacyTask,
  onAddComment,
  mode = "inline",
  className,
  scrollToBottomKey,
}: CommentContentProps) {
  // Translation setup
  const { t } = useTranslation("task")

  const allTasks = useAtomValue(tasksAtom)
  const currentUser = useAtomValue(userAtom)
  const updateTask = useSetAtom(updateTaskAtom)
  const updateQuickAddTask = useSetAtom(updateQuickAddTaskAtom)
  const newTask = useAtomValue(quickAddTaskAtom)
  const isNewTask = !taskId && !legacyTask

  // Get the task data - either from quick-add atom, legacy prop, or find by ID
  const task: Task | CreateTaskRequest | undefined = (() => {
    if (legacyTask) return legacyTask // Legacy prop support
    if (isNewTask) return newTask // Quick-add mode
    return allTasks.find((t: Task) => t.id === taskId) // Existing task mode
  })()

  const [newComment, setNewComment] = useState("")
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false)
  const commentsContainerRef = useRef<HTMLDivElement>(null)

  // Get comments for display in chronological order (oldest first)
  const displayComments = task?.comments?.slice() || [] // Show all comments for both modes

  // Scroll to bottom when a new comment is added
  useEffect(() => {
    if (shouldScrollToBottom && commentsContainerRef.current) {
      // Use requestAnimationFrame for smoother scrolling
      const scrollWithAnimation = () => {
        if (commentsContainerRef.current) {
          commentsContainerRef.current.scrollTo({
            top: commentsContainerRef.current.scrollHeight,
            behavior: "smooth",
          })
        }
        setShouldScrollToBottom(false)
      }

      // Use requestAnimationFrame to ensure the next paint cycle
      requestAnimationFrame(scrollWithAnimation)
    }
  }, [displayComments.length, shouldScrollToBottom])

  // Scroll to bottom when popover opens (triggered by scrollToBottomKey change)
  useEffect(() => {
    if (scrollToBottomKey !== undefined && scrollToBottomKey > 0 && commentsContainerRef.current) {
      // Use requestAnimationFrame for immediate popover opening scroll
      const scrollWithAnimation = () => {
        if (commentsContainerRef.current) {
          commentsContainerRef.current.scrollTo({
            top: commentsContainerRef.current.scrollHeight,
            behavior: "smooth",
          })
        }
      }

      // Use requestAnimationFrame to ensure immediate smooth animation
      requestAnimationFrame(scrollWithAnimation)
    }
  }, [scrollToBottomKey])

  if (!task) {
    console.warn("Task not found", taskId)
    return null
  }

  const handleAddComment = () => {
    if (!newComment.trim()) return

    // If callback provided, use it (for existing components)
    if (onAddComment) {
      onAddComment(newComment.trim())
    } else {
      // Otherwise, handle the update directly
      const newTaskComment = {
        id: createCommentId(uuidv4()),
        content: newComment.trim(),
        createdAt: new Date(),
        userId: currentUser.id,
      }

      const updatedComments = [...(task.comments || []), newTaskComment]

      // Update appropriate atom based on context
      if (isNewTask) {
        updateQuickAddTask({ updateRequest: { comments: updatedComments } })
      } else if (legacyTask) {
        updateTask({ updateRequest: { id: legacyTask.id, comments: updatedComments } })
      } else if (taskId) {
        updateTask({ updateRequest: { id: createTaskId(taskId), comments: updatedComments } })
      }
    }

    setNewComment("")
    setShouldScrollToBottom(true)
  }

  const handleDeleteComment = (commentId: string) => {
    const updatedComments = (task.comments || []).filter((comment) => comment.id !== commentId)

    // Update appropriate atom based on context
    if (isNewTask) {
      updateQuickAddTask({ updateRequest: { comments: updatedComments } })
    } else if (legacyTask) {
      updateTask({ updateRequest: { id: legacyTask.id, comments: updatedComments } })
    } else if (taskId) {
      updateTask({ updateRequest: { id: createTaskId(taskId), comments: updatedComments } })
    }
  }

  const handleUpdateComment = (commentId: string, newContent: string) => {
    const updatedComments = (task.comments || []).map((comment) =>
      comment.id === commentId ? { ...comment, content: newContent } : comment,
    )

    // Update appropriate atom based on context
    if (isNewTask) {
      updateQuickAddTask({ updateRequest: { comments: updatedComments } })
    } else if (legacyTask) {
      updateTask({ updateRequest: { id: legacyTask.id, comments: updatedComments } })
    } else if (taskId) {
      updateTask({ updateRequest: { id: createTaskId(taskId), comments: updatedComments } })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddComment()
    }
  }

  const commentsLength = task.comments?.length || 0

  return (
    <div className={cn("space-y-3", mode === "popover" && "p-3", className)}>
      {/* Header - only show in popover mode */}
      {mode === "popover" && (
        <div className="flex items-center justify-between border-b pb-2 mb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="font-medium text-sm">{t("comments.title", "Comments")}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => {
              /* Close handled by ContentPopover */
            }}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Header - Show title for inline mode only */}
      {mode !== "popover" && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">
              {commentsLength > 0
                ? t("comments.title", "Comments ({{count}})", { count: commentsLength })
                : t("comments.addComment", "Add Comment")}
            </span>
          </div>
          {commentsLength > 0 && (
            <span className="text-xs text-muted-foreground">
              {t("comments.commentCount", "{{count}} comments", { count: commentsLength })}
            </span>
          )}
        </div>
      )}

      {/* Existing Comments */}
      {displayComments.length > 0 && (
        <div
          ref={commentsContainerRef}
          className={cn(
            "space-y-3 max-h-64 overflow-y-auto",
            mode === "inline" && "pl-4 border-l-2 border-gray-200 dark:border-gray-700",
          )}
        >
          {displayComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              mode={mode}
              onDelete={handleDeleteComment}
              onUpdate={handleUpdateComment}
            />
          ))}
        </div>
      )}

      {/* Add Comment Section - Always visible input with button */}
      <div className="flex gap-2">
        <Input
          placeholder={
            commentsLength > 0
              ? t("comments.addAnotherComment", "Add another comment...")
              : t("comments.addComments", "Add comments...")
          }
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={handleKeyDown}
          className="text-sm flex-1"
          data-testid="comment-input"
        />
        <Button
          onClick={handleAddComment}
          disabled={!newComment.trim()}
          size="sm"
          className="h-9 px-3"
          data-testid="comment-submit-button"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
