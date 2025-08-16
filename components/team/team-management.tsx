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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import {
  Users,
  UserPlus,
  Crown,
  Shield,
  User,
  Eye,
  Mail,
  BarChart3,
  Settings,
  Trash2,
  CheckCircle,
  Clock,
  Target,
  TrendingUp,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface TeamMember {
  id: string
  name: string
  email: string
  avatar?: string
  role: "owner" | "admin" | "member" | "viewer"
  status: "active" | "inactive" | "pending"
  joinedAt: Date
  lastActive: Date
  tasksAssigned: number
  tasksCompleted: number
  productivity: number
  departments: string[]
}

interface Team {
  id: string
  name: string
  description: string
  members: TeamMember[]
  projects: number
  createdAt: Date
  settings: {
    visibility: "public" | "private"
    joinApproval: boolean
    taskAssignment: "anyone" | "admins" | "owner"
  }
}

interface TeamStats {
  totalTasks: number
  completedTasks: number
  overdueTasks: number
  avgProductivity: number
  activeMembers: number
  projectsInProgress: number
}

interface TeamManagementProps {
  teams: Team[]
  currentTeam: Team | null
  teamStats: TeamStats
  onCreateTeam: (team: Omit<Team, "id" | "createdAt">) => void
  onUpdateTeam: (teamId: string, updates: Partial<Team>) => void
  onDeleteTeam: (teamId: string) => void
  onInviteMember: (teamId: string, email: string, role: string) => void
  onUpdateMemberRole: (teamId: string, memberId: string, role: string) => void
  onRemoveMember: (teamId: string, memberId: string) => void
  onSwitchTeam: (teamId: string) => void
}

export function TeamManagement({
  teams,
  currentTeam,
  teamStats,
  onCreateTeam,
  onUpdateTeam,
  onDeleteTeam,
  onInviteMember,
  onUpdateMemberRole,
  onRemoveMember,
  onSwitchTeam,
}: TeamManagementProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("member")
  const [newTeam, setNewTeam] = useState<Omit<Team, "id" | "createdAt">>({
    name: "",
    description: "",
    members: [],
    projects: 0,
    settings: {
      visibility: "private",
      joinApproval: true,
      taskAssignment: "admins",
    },
  })

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="h-4 w-4 text-yellow-500" />
      case "admin":
        return <Shield className="h-4 w-4 text-red-500" />
      case "member":
        return <User className="h-4 w-4 text-blue-500" />
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
      case "member":
        return "text-blue-700 bg-blue-100 dark:bg-blue-900 dark:text-blue-300"
      case "viewer":
        return "text-gray-700 bg-gray-100 dark:bg-gray-800 dark:text-gray-300"
      default:
        return "text-gray-700 bg-gray-100 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-700 bg-green-100 dark:bg-green-900 dark:text-green-300"
      case "inactive":
        return "text-gray-700 bg-gray-100 dark:bg-gray-800 dark:text-gray-300"
      case "pending":
        return "text-orange-700 bg-orange-100 dark:bg-orange-900 dark:text-orange-300"
      default:
        return "text-gray-700 bg-gray-100 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  const handleCreateTeam = () => {
    if (newTeam.name.trim()) {
      onCreateTeam(newTeam)
      setNewTeam({
        name: "",
        description: "",
        members: [],
        projects: 0,
        settings: {
          visibility: "private",
          joinApproval: true,
          taskAssignment: "admins",
        },
      })
      setShowCreateDialog(false)
      toast({
        title: "Team created",
        description: `"${newTeam.name}" team has been created successfully.`,
      })
    }
  }

  const handleInviteMember = () => {
    if (inviteEmail.trim() && currentTeam) {
      onInviteMember(currentTeam.id, inviteEmail, inviteRole)
      setInviteEmail("")
      setInviteRole("member")
      setShowInviteDialog(false)
      toast({
        title: "Invitation sent",
        description: `Invited ${inviteEmail} to join the team as ${inviteRole}.`,
      })
    }
  }

  const calculateCompletionRate = (member: TeamMember) => {
    if (member.tasksAssigned === 0) return 0
    return Math.round((member.tasksCompleted / member.tasksAssigned) * 100)
  }

  return (
    <div className="space-y-6">
      {/* Team Selector & Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Management
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={currentTeam?.id || ""} onValueChange={onSwitchTeam}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create Team
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Team</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Team Name</label>
                      <Input
                        value={newTeam.name}
                        onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                        placeholder="Enter team name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <Input
                        value={newTeam.description}
                        onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                        placeholder="Team description (optional)"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Visibility</label>
                        <Select
                          value={newTeam.settings.visibility}
                          onValueChange={(value) => {
                            if (value === "public" || value === "private") {
                              setNewTeam({
                                ...newTeam,
                                settings: { ...newTeam.settings, visibility: value },
                              })
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="private">Private</SelectItem>
                            <SelectItem value="public">Public</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Task Assignment</label>
                        <Select
                          value={newTeam.settings.taskAssignment}
                          onValueChange={(value) => {
                            if (value === "anyone" || value === "admins" || value === "owner") {
                              setNewTeam({
                                ...newTeam,
                                settings: { ...newTeam.settings, taskAssignment: value },
                              })
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owner">Owner Only</SelectItem>
                            <SelectItem value="admins">Admins</SelectItem>
                            <SelectItem value="anyone">Anyone</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button onClick={handleCreateTeam} className="w-full">
                      Create Team
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        {currentTeam && (
          <CardContent className="space-y-4">
            {/* Team Stats */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{teamStats.activeMembers}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Active Members</div>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{teamStats.completedTasks}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Completed</div>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {teamStats.totalTasks - teamStats.completedTasks}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">In Progress</div>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{teamStats.overdueTasks}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Overdue</div>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {teamStats.projectsInProgress}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Projects</div>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-indigo-600">
                  {Math.round(teamStats.avgProductivity)}%
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Avg Productivity</div>
              </div>
            </div>

            {/* Team Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Team Progress</span>
                <span>{Math.round((teamStats.completedTasks / teamStats.totalTasks) * 100)}%</span>
              </div>
              <Progress
                value={(teamStats.completedTasks / teamStats.totalTasks) * 100}
                className="h-2"
              />
            </div>
          </CardContent>
        )}
      </Card>

      {currentTeam && (
        <Tabs defaultValue="members" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4">
            {/* Members Header */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Team Members ({currentTeam.members.length})</CardTitle>
                  <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <Mail className="h-4 w-4 mr-2" />
                        Invite Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Invite Team Member</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Email Address</label>
                          <Input
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="colleague@company.com"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Role</label>
                          <Select value={inviteRole} onValueChange={setInviteRole}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="viewer">Viewer</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button onClick={handleInviteMember} className="w-full">
                          Send Invitation
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentTeam.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatar || "/placeholder.svg"} />
                          <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{member.name}</span>
                            {getRoleIcon(member.role)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <span>{member.email}</span>
                            <Badge className={getRoleColor(member.role)} variant="outline">
                              {member.role}
                            </Badge>
                            <Badge className={getStatusColor(member.status)} variant="outline">
                              {member.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <div className="font-medium">{calculateCompletionRate(member)}%</div>
                          <div className="text-gray-500">
                            {member.tasksCompleted}/{member.tasksAssigned} tasks
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Select
                            value={member.role}
                            onValueChange={(role) =>
                              onUpdateMemberRole(currentTeam.id, member.id, role)
                            }
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="viewer">Viewer</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          {member.role !== "owner" && (
                            <Button
                              onClick={() => onRemoveMember(currentTeam.id, member.id)}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Team Analytics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Top Performers */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Top Performers</h4>
                  <div className="space-y-2">
                    {currentTeam.members
                      .filter((m) => m.status === "active")
                      .sort((a, b) => b.productivity - a.productivity)
                      .slice(0, 5)
                      .map((member, index) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-sm font-medium text-gray-500">#{index + 1}</div>
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={member.avatar || "/placeholder.svg"} />
                              <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm">{member.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right text-sm">
                              <div className="font-medium">{member.productivity}%</div>
                              <div className="text-gray-500">{member.tasksCompleted} completed</div>
                            </div>
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Department Breakdown */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Department Distribution</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {["Engineering", "Design", "Marketing", "Sales"].map((dept) => {
                      const count = currentTeam.members.filter((m) =>
                        m.departments.includes(dept),
                      ).length
                      return (
                        <div
                          key={dept}
                          className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                          <div className="text-2xl font-bold text-blue-600">{count}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">{dept}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Activity Timeline */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Recent Activity</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Sarah completed "Design review" 2 hours ago</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <UserPlus className="h-4 w-4 text-blue-500" />
                      <span>John joined the team yesterday</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Target className="h-4 w-4 text-purple-500" />
                      <span>Team reached 85% completion rate this week</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Team Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Settings */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Team Name</label>
                    <Input
                      value={currentTeam.name}
                      onChange={(e) => onUpdateTeam(currentTeam.id, { name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Input
                      value={currentTeam.description}
                      onChange={(e) =>
                        onUpdateTeam(currentTeam.id, { description: e.target.value })
                      }
                    />
                  </div>
                </div>

                {/* Privacy Settings */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Privacy & Access</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium">Team Visibility</span>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Control who can see this team
                        </p>
                      </div>
                      <Select
                        value={currentTeam.settings.visibility}
                        onValueChange={(value: "public" | "private") =>
                          onUpdateTeam(currentTeam.id, {
                            settings: { ...currentTeam.settings, visibility: value },
                          })
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="private">Private</SelectItem>
                          <SelectItem value="public">Public</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium">Task Assignment</span>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Who can assign tasks to team members
                        </p>
                      </div>
                      <Select
                        value={currentTeam.settings.taskAssignment}
                        onValueChange={(value: "anyone" | "admins" | "owner") =>
                          onUpdateTeam(currentTeam.id, {
                            settings: { ...currentTeam.settings, taskAssignment: value },
                          })
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">Owner Only</SelectItem>
                          <SelectItem value="admins">Admins</SelectItem>
                          <SelectItem value="anyone">Anyone</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="space-y-4 pt-6 border-t border-red-200 dark:border-red-800">
                  <h4 className="text-sm font-medium text-red-600">Danger Zone</h4>
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-red-800 dark:text-red-200">
                          Delete Team
                        </span>
                        <p className="text-xs text-red-700 dark:text-red-300">
                          Permanently delete this team and all its data
                        </p>
                      </div>
                      <Button
                        onClick={() => onDeleteTeam(currentTeam.id)}
                        variant="destructive"
                        size="sm"
                      >
                        Delete Team
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Team Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Activity Feed */}
                  <div className="space-y-3">
                    {[
                      {
                        id: "1",
                        type: "task_completed",
                        user: "Sarah Johnson",
                        action: "completed task",
                        target: "Design system documentation",
                        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
                      },
                      {
                        id: "2",
                        type: "member_joined",
                        user: "Mike Chen",
                        action: "joined the team",
                        target: "",
                        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
                      },
                      {
                        id: "3",
                        type: "project_created",
                        user: "Alex Smith",
                        action: "created project",
                        target: "Mobile App Redesign",
                        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                      },
                      {
                        id: "4",
                        type: "task_assigned",
                        user: "Emma Wilson",
                        action: "assigned task to",
                        target: "John Doe",
                        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
                      },
                    ].map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div className="h-2 w-2 bg-blue-500 rounded-full mt-2" />
                        <div className="flex-1">
                          <p className="text-sm">
                            <span className="font-medium">{activity.user}</span> {activity.action}{" "}
                            {activity.target && (
                              <span className="font-medium">"{activity.target}"</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {activity.timestamp.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Load More */}
                  <div className="text-center">
                    <Button variant="outline" size="sm">
                      Load More Activity
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* No Team Selected */}
      {!currentTeam && teams.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No teams yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Create your first team to start collaborating with others
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Create Your First Team
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
