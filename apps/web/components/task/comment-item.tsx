import React, { useState } from "react"
import { X, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { formatDistanceToNow, format } from "date-fns"
import type { TaskComment } from "@/lib/types"
import { EditableDiv } from "@/components/ui/custom/editable-div"
import { CommentUserDisplay } from "@/components/task/comment-user-display"
import { CommentReactions } from "@/components/task/comment-reactions"
import { AddReactionButton } from "@/components/task/add-reaction-button"

export function CommentItem({
  comment,
  mode = "inline",
  onDelete,
  onUpdate,
}: {
  comment: TaskComment
  mode?: "inline" | "popover"
  onDelete?: (commentId: string) => void
  onUpdate?: (commentId: string, newContent: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)

  const handleSave = (newContent: string) => {
    if (newContent.trim() && newContent !== comment.content) {
      onUpdate?.(comment.id, newContent)
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          "group flex gap-2 mb-3 last:mb-0 hover:bg-accent/20 rounded-lg p-2 -mx-2 transition-colors",
          mode === "popover" && "bg-muted/20 rounded-lg p-1 mx-0",
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <CommentUserDisplay comment={comment} />
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
          {isEditing ? (
            <EditableDiv
              as="p"
              value={comment.content}
              onChange={handleSave}
              onCancel={handleCancel}
              className="text-sm text-gray-600 dark:text-gray-300 break-words leading-relaxed"
              multiline
              autoFocus
              cursorPosition="end"
            />
          ) : (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-300 break-words leading-relaxed">
                {comment.content}
              </p>
              <CommentReactions comment={comment} />
            </>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <AddReactionButton comment={comment} />
          {onUpdate && !isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
              data-testid={`comment-edit-button-${comment.id}`}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
          {onDelete && !isEditing && (
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
      </div>
    </TooltipProvider>
  )
}
