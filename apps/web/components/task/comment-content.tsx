"use client"

import React, { useState, useRef, useEffect } from "react"
import { MessageSquare, User, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { formatDistanceToNow, format } from "date-fns"
import { useAtomValue, useSetAtom } from "jotai"
import { v4 as uuidv4 } from "uuid"
import { updateTaskAtom, tasksAtom } from "@/lib/atoms"
import { quickAddTaskAtom, updateQuickAddTaskAtom } from "@/lib/atoms/ui/dialogs"
import type { Task, TaskComment, CreateTaskRequest } from "@/lib/types"
import { createCommentId, createTaskId } from "@/lib/types"
import { useLanguage } from "@/components/providers/language-provider"
import { useTranslation } from "@/lib/i18n/client"

interface CommentContentProps {
  taskId?: string // Optional for quick-add mode
  task?: Task // Deprecated - use taskId instead
  onAddComment?: (content: string) => void // Optional callback - if not provided, will update atoms directly
  onViewAll?: () => void
  mode?: "inline" | "popover"
  className?: string
  scrollToBottomKey?: number // When this changes, triggers scroll to bottom
}

function CommentItem({
  comment,
  mode = "inline",
  onDelete,
}: {
  comment: TaskComment
  mode?: "inline" | "popover"
  onDelete?: (commentId: string) => void
}) {
  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          "group flex gap-2 mb-3 last:mb-0 hover:bg-accent/20 rounded-lg p-2 -mx-2 transition-colors",
          mode === "popover" && "bg-muted/20 rounded-lg p-1 mx-0",
        )}
      >
        <div className="size-6 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0 flex items-center justify-center">
          <User className="h-3 w-3 text-gray-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-gray-900 dark:text-gray-100">admin</span>
            <Tooltip>
              <TooltipTrigger className="text-xs text-gray-400 cursor-pointer">
                {formatDistanceToNow(comment.createdAt, {
                  addSuffix: true,
                  includeSeconds: true,
                })}
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{format(comment.createdAt, "PPpp")}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 break-words leading-relaxed">
            {comment.content}
          </p>
        </div>
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(comment.id)}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
            data-testid={`comment-delete-button-${comment.id}`}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </TooltipProvider>
  )
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
  const { language } = useLanguage()
  const { t } = useTranslation(language, "task")

  const allTasks = useAtomValue(tasksAtom)
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
      // Use longer timeout to ensure DOM is fully updated on slower devices
      setTimeout(() => {
        if (commentsContainerRef.current) {
          // Smooth animated scroll to bottom
          commentsContainerRef.current.scrollTo({
            top: commentsContainerRef.current.scrollHeight,
            behavior: "smooth",
          })
        }
        setShouldScrollToBottom(false)
      }, 100)
    }
  }, [displayComments.length, shouldScrollToBottom])

  // Scroll to bottom when popover opens (triggered by scrollToBottomKey change)
  useEffect(() => {
    if (scrollToBottomKey !== undefined && scrollToBottomKey > 0 && commentsContainerRef.current) {
      // Brief timeout to ensure DOM is rendered
      setTimeout(() => {
        if (commentsContainerRef.current) {
          commentsContainerRef.current.scrollTo({
            top: commentsContainerRef.current.scrollHeight,
            behavior: "smooth",
          })
        }
      }, 100)
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
      const newTaskComment: TaskComment = {
        id: createCommentId(uuidv4()),
        content: newComment.trim(),
        createdAt: new Date(),
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddComment()
    }
  }

  const commentsLength = task.comments?.length || 0

  return (
    <div className={cn("space-y-3", mode === "popover" && "p-2", className)}>
      {/* Header - Show title for popover header only */}
      {mode !== "inline" && (
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
              {t("comments.commentCount", "{{count}} 条评论", { count: commentsLength })}
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
