"use client"

import { useState, useEffect } from "react"
import { toast } from "@/hooks/use-toast"
import { log } from "../lib/utils/logger"

export function useTeamManager() {
  log.warn(
    { module: "hooks" },
    "DEPRECATED: useTeamManager hook is deprecated and will be removed in a future version. This feature should be implemented using atoms from @/lib/atoms.",
  )

  const [teams, setTeams] = useState<any[]>([])
  const [currentTeam, setCurrentTeam] = useState<any | null>(null)

  useEffect(() => {
    const sampleTeams = [
      {
        id: "1",
        name: "Development Team",
        description: "Main development team for product features",
        members: [
          {
            id: "1",
            name: "John Doe",
            email: "john@company.com",
            role: "owner",
            status: "active",
            joinedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            lastActive: new Date(),
            tasksAssigned: 12,
            tasksCompleted: 8,
            productivity: 85,
            departments: ["Engineering"],
          },
          {
            id: "2",
            name: "Sarah Johnson",
            email: "sarah@company.com",
            role: "admin",
            status: "active",
            joinedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
            lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000),
            tasksAssigned: 15,
            tasksCompleted: 12,
            productivity: 92,
            departments: ["Design", "Engineering"],
          },
        ],
        projects: 3,
        createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
        settings: {
          visibility: "private",
          joinApproval: true,
          taskAssignment: "admins",
        },
      },
    ]

    setTeams(sampleTeams)
    setCurrentTeam(sampleTeams[0])
  }, [])

  const createTeam = (teamData: any) => {
    const newTeam = {
      ...teamData,
      id: Date.now().toString(),
      createdAt: new Date(),
    }
    setTeams((prev) => [...prev, newTeam])
    toast({
      title: "Team created",
      description: `"${newTeam.name}" team has been created successfully.`,
    })
  }

  const updateTeam = (teamId: string, updates: any) => {
    setTeams((prev) => prev.map((team) => (team.id === teamId ? { ...team, ...updates } : team)))
    if (currentTeam?.id === teamId) {
      setCurrentTeam((prev: any) => (prev ? { ...prev, ...updates } : null))
    }
  }

  const deleteTeam = (teamId: string) => {
    setTeams((prev) => prev.filter((team) => team.id !== teamId))
    if (currentTeam?.id === teamId) {
      setCurrentTeam(teams.find((t) => t.id !== teamId) || null)
    }
  }

  const inviteMember = (teamId: string, email: string, role: string) => {
    const newMember = {
      id: Date.now().toString(),
      name: email.split("@")[0],
      email,
      role,
      status: "pending",
      joinedAt: new Date(),
      lastActive: new Date(),
      tasksAssigned: 0,
      tasksCompleted: 0,
      productivity: 0,
      departments: [],
    }

    setTeams((prev) =>
      prev.map((team) =>
        team.id === teamId ? { ...team, members: [...team.members, newMember] } : team,
      ),
    )
  }

  const updateMemberRole = (teamId: string, memberId: string, role: string) => {
    setTeams((prev) =>
      prev.map((team) =>
        team.id === teamId
          ? {
              ...team,
              members: team.members.map((member: any) =>
                member.id === memberId ? { ...member, role } : member,
              ),
            }
          : team,
      ),
    )
  }

  const removeMember = (teamId: string, memberId: string) => {
    setTeams((prev) =>
      prev.map((team) =>
        team.id === teamId
          ? { ...team, members: team.members.filter((member: any) => member.id !== memberId) }
          : team,
      ),
    )
  }

  const switchTeam = (teamId: string) => {
    setCurrentTeam(teams.find((t) => t.id === teamId) || null)
  }

  const getTeamStats = () => {
    if (!currentTeam)
      return {
        totalTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
        avgProductivity: 0,
        activeMembers: 0,
        projectsInProgress: 0,
      }

    return {
      totalTasks: 25,
      completedTasks: 18,
      overdueTasks: 3,
      avgProductivity: 78,
      activeMembers: currentTeam.members.filter((m: any) => m.status === "active").length,
      projectsInProgress: 3,
    }
  }

  return {
    teams,
    currentTeam,
    createTeam,
    updateTeam,
    deleteTeam,
    inviteMember,
    updateMemberRole,
    removeMember,
    switchTeam,
    getTeamStats,
  }
}
