"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageSquare, Send } from "lucide-react"
import type { TaskId } from "@tasktrove/types/id"
import { getAvatarApiUrl } from "@tasktrove/utils"

interface Task {
  id: TaskId
  title: string
}

interface QuickCommentDialogProps {
  task: Task
  isOpen: boolean
  onClose: () => void
  onAddComment: (taskId: TaskId, content: string) => void
  currentUser?: {
    name: string
    avatar?: string
  }
}

export function QuickCommentDialog({
  task,
  isOpen,
  onClose,
  onAddComment,
  currentUser = { name: "You" },
}: QuickCommentDialogProps) {
  const [comment, setComment] = useState("")

  const handleSubmit = () => {
    if (comment.trim()) {
      onAddComment(task.id, comment.trim())
      setComment("")
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Add Comment to: {task.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={getAvatarApiUrl(currentUser.avatar) || "/placeholder.svg"} />
              <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <div className="text-sm font-medium">{currentUser.name}</div>
              <Textarea
                placeholder="Add your comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={4}
                className="resize-none"
                autoFocus
              />
              <div className="text-xs text-gray-500">Press Cmd/Ctrl + Enter to submit</div>
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!comment.trim()}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Add Comment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
