"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Share2, Users, MessageSquare, Bell, Copy, Mail, X, Crown, Shield, Eye } from "lucide-react"
import { toast } from "sonner"
import type { TaskId } from "@/lib/types"

interface Collaborator {
  id: string
  name: string
  email: string
  avatar?: string
  role: "owner" | "admin" | "editor" | "viewer"
  status: "active" | "pending" | "inactive"
  joinedAt: Date
}

interface TaskComment {
  id: string
  authorId: string
  authorName: string
  authorAvatar?: string
  content: string
  createdAt: Date
  mentions: string[]
  reactions: Array<{ emoji: string; users: string[] }>
}

interface TaskSharingProps {
  taskId: TaskId
  taskTitle: string
  collaborators: Collaborator[]
  comments: TaskComment[]
  onInvite: (email: string, role: string, message?: string) => void
  onRemoveCollaborator: (collaboratorId: string) => void
  onChangeRole: (collaboratorId: string, newRole: string) => void
  onAddComment: (content: string, mentions: string[]) => void
  onReact: (commentId: string, emoji: string) => void
}

export function TaskSharing({
  taskId,
  taskTitle,
  collaborators,
  comments,
  onInvite,
  onRemoveCollaborator,
  onAddComment,
  onReact,
}: TaskSharingProps) {
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("editor")
  const [inviteMessage, setInviteMessage] = useState("")
  const [newComment, setNewComment] = useState("")
  const [showShareDialog, setShowShareDialog] = useState(false)

  const handleInvite = () => {
    if (inviteEmail.trim()) {
      onInvite(inviteEmail, inviteRole, inviteMessage)
      setInviteEmail("")
      setInviteMessage("")
      toast.success(`Invited ${inviteEmail} as ${inviteRole}`)
    }
  }

  const handleAddComment = () => {
    if (newComment.trim()) {
      // Extract mentions from comment (simple @username detection)
      const mentions = newComment.match(/@(\w+)/g)?.map((m) => m.substring(1)) || []
      onAddComment(newComment, mentions)
      setNewComment("")
    }
  }

  const copyShareLink = () => {
    const shareLink = `${window.location.origin}/tasks/${taskId}`
    navigator.clipboard.writeText(shareLink)
    toast.success("Share link copied to clipboard")
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="h-4 w-4 text-yellow-500" />
      case "admin":
        return <Shield className="h-4 w-4 text-red-500" />
      case "editor":
        return <Users className="h-4 w-4 text-blue-500" />
      case "viewer":
        return <Eye className="h-4 w-4 text-gray-500" />
      default:
        return null
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "owner":
        return "text-yellow-700 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300"
      case "admin":
        return "text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-300"
      case "editor":
        return "text-blue-700 bg-blue-100 dark:bg-blue-900 dark:text-blue-300"
      case "viewer":
        return "text-gray-700 bg-gray-100 dark:bg-gray-800 dark:text-gray-300"
      default:
        return "text-gray-700 bg-gray-100 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Collaboration
          </CardTitle>
          <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Users className="h-4 w-4 mr-2" />
                Share Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Share "{taskTitle}"</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="invite" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="invite">Invite People</TabsTrigger>
                  <TabsTrigger value="link">Share Link</TabsTrigger>
                </TabsList>
                <TabsContent value="invite" className="space-y-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        placeholder="Email address"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="col-span-2"
                      />
                      <Select value={inviteRole} onValueChange={setInviteRole}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Textarea
                      placeholder="Add a personal message (optional)"
                      value={inviteMessage}
                      onChange={(e) => setInviteMessage(e.target.value)}
                      rows={3}
                    />
                    <Button onClick={handleInvite} className="w-full">
                      <Mail className="h-4 w-4 mr-2" />
                      Send Invitation
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="link" className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Anyone with this link can view this task
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={`${window.location.origin}/tasks/${taskId}`}
                        readOnly
                        className="flex-1"
                      />
                      <Button onClick={copyShareLink} variant="outline">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Collaborators List */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Collaborators ({collaborators.length})</h4>
          <div className="space-y-2">
            {collaborators.map((collaborator) => (
              <div
                key={collaborator.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={collaborator.avatar || "/placeholder.svg"} />
                    <AvatarFallback>{collaborator.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{collaborator.name}</span>
                      {getRoleIcon(collaborator.role)}
                    </div>
                    <span className="text-xs text-gray-500">{collaborator.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getRoleColor(collaborator.role)} variant="outline">
                    {collaborator.role}
                  </Badge>
                  {collaborator.role !== "owner" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onRemoveCollaborator(collaborator.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comments Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Comments ({comments.length})
          </h4>

          {/* Add Comment */}
          <div className="space-y-2">
            <Textarea
              placeholder="Add a comment... Use @username to mention someone"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
            />
            <div className="flex justify-between">
              <div className="text-xs text-gray-500">
                Tip: Use @username to mention collaborators
              </div>
              <Button onClick={handleAddComment} size="sm" disabled={!newComment.trim()}>
                Comment
              </Button>
            </div>
          </div>

          {/* Comments List */}
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {comments.map((comment) => (
              <div key={comment.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={comment.authorAvatar || "/placeholder.svg"} />
                    <AvatarFallback>{comment.authorName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{comment.authorName}</span>
                      <span className="text-xs text-gray-500">
                        {comment.createdAt.toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{comment.content}</p>
                    {comment.reactions.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {comment.reactions.map((reaction, index) => (
                          <Button
                            key={index}
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => onReact(comment.id, reaction.emoji)}
                          >
                            {reaction.emoji} {reaction.users.length}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Recent Activity
          </h4>
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <p>• John added a comment 2 hours ago</p>
            <p>• Sarah completed a subtask yesterday</p>
            <p>• Mike was added as editor 3 days ago</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
