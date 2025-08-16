"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { MessageSquare, User, Plus, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import type { Task, TaskComment } from "@/lib/types"

interface CommentContentProps {
  task: Task
  onAddComment: (content: string) => void
  onViewAll?: () => void
  mode?: "inline" | "popover"
  className?: string
  onAddingChange?: (isAdding: boolean) => void
}

function CommentItem({
  comment,
  mode = "inline",
}: {
  comment: TaskComment
  mode?: "inline" | "popover"
}) {
  return (
    <div
      className={cn(
        "flex gap-2 mb-3 last:mb-0",
        mode === "popover" && "bg-muted/20 rounded-lg p-3",
      )}
    >
      <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0 flex items-center justify-center">
        <User className="h-3 w-3 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-gray-900 dark:text-gray-100">admin</span>
          {comment.createdAt && (
            <span className="text-xs text-gray-400">
              {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 break-words leading-relaxed">
          {comment.content}
        </p>
      </div>
    </div>
  )
}

export function CommentContent({
  task,
  onAddComment,
  onViewAll,
  mode = "inline",
  className,
  onAddingChange,
}: CommentContentProps) {
  const [isAddingComment, setIsAddingComment] = useState(false)
  const [newComment, setNewComment] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Get recent comments for display
  const displayComments =
    mode === "inline"
      ? task.comments.slice(-3).reverse() // Show last 3 in reverse order for inline
      : task.comments.slice().reverse() // Show all in reverse order for popover

  const hasMoreComments = mode === "inline" && task.comments.length > 3

  const handleAddComment = () => {
    if (newComment.trim()) {
      onAddComment(newComment.trim())
      setNewComment("")
      setIsAddingComment(false)
      onAddingChange?.(false)
    }
  }

  const handleStartAdding = () => {
    setIsAddingComment(true)
    onAddingChange?.(true)
  }

  const handleCancelAdding = useCallback(() => {
    setNewComment("")
    setIsAddingComment(false)
    onAddingChange?.(false)
  }, [onAddingChange])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleAddComment()
    }
    if (e.key === "Escape") {
      handleCancelAdding()
    }
  }

  // Auto-focus textarea when adding
  useEffect(() => {
    if (isAddingComment && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)
    }
  }, [isAddingComment])

  // Handle clicks outside to close the comment adding interface
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        textareaRef.current &&
        event.target instanceof Node &&
        !textareaRef.current.closest(".comment-add-container")?.contains(event.target)
      ) {
        if (isAddingComment) {
          handleCancelAdding()
        }
      }
    }

    if (isAddingComment) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isAddingComment, handleCancelAdding])

  return (
    <div className={cn("space-y-3", mode === "popover" && "p-4", className)}>
      {/* Header - Show title for popover header only */}
      {mode !== "inline" && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">
              {task.comments.length > 0 ? `Comments (${task.comments.length})` : "Add Comment"}
            </span>
          </div>
          {task.comments.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {task.comments.length} comment{task.comments.length !== 1 ? "s" : ""}
              </span>
              {hasMoreComments && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onViewAll}
                  className="h-5 px-2 text-xs text-blue-600 hover:text-blue-700"
                >
                  View all
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Existing Comments */}
      {displayComments.length > 0 && (
        <div
          className={cn(
            "space-y-3",
            mode === "inline" && "pl-4 border-l-2 border-gray-200 dark:border-gray-700",
            mode === "popover" && "max-h-64 overflow-y-auto",
          )}
        >
          {displayComments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} mode={mode} />
          ))}
        </div>
      )}

      {/* Add Comment Button/Interface */}
      {!isAddingComment && (
        <button
          onClick={handleStartAdding}
          className="flex items-center gap-3 p-3 w-full rounded-lg cursor-pointer hover:bg-accent/50 transition-all duration-200 bg-muted/20 text-left"
        >
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground font-medium">Add comment</span>
          <Plus className="h-3 w-3 text-muted-foreground ml-auto" />
        </button>
      )}

      {/* Add Comment Interface */}
      {isAddingComment && (
        <div className="comment-add-container space-y-3 p-3 rounded-lg border bg-muted/10">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <User className="h-3 w-3 text-gray-500" />
            </div>
            <span className="text-xs text-gray-500">admin</span>
          </div>

          <Textarea
            ref={textareaRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add your comment..."
            className="min-h-[80px] text-sm resize-none border-gray-200 dark:border-gray-700"
            rows={3}
          />

          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-400">⌘ + Enter to submit</div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelAdding}
                className="h-7 px-2 text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                size="sm"
                className="h-7 px-2 text-xs"
              >
                <Send className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
