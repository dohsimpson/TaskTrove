/**
 * Team Types
 *
 * Multi-user team collaboration types and team management.
 */

import type { UserId, TeamId } from "./id";

/**
 * Team member information
 */
export interface TeamMember {
  /** Unique identifier for the member */
  id: UserId;
  /** Member's display name */
  name: string;
  /** Member's email address */
  email: string;
  /** Member's role in the team */
  role: "owner" | "admin" | "member" | "viewer";
  /** Member's current status */
  status: "active" | "inactive" | "pending";
  /** When the member joined the team */
  joinedAt: Date;
  /** Last time the member was active */
  lastActive: Date;
  /** Number of tasks assigned to the member */
  tasksAssigned: number;
  /** Number of tasks completed by the member */
  tasksCompleted: number;
  /** Productivity score (0-100) */
  productivity: number;
  /** Departments the member belongs to */
  departments: string[];
}

/**
 * Team settings configuration
 */
export interface TeamSettings {
  /** Team visibility level */
  visibility: "public" | "private";
  /** Whether join requests require approval */
  joinApproval: boolean;
  /** Who can assign tasks */
  taskAssignment: "all" | "admins" | "owners";
}

/**
 * Team interface
 */
export interface Team {
  /** Unique identifier for the team */
  id: TeamId;
  /** Team name */
  name: string;
  /** Team description */
  description?: string;
  /** Team members */
  members: TeamMember[];
  /** Number of projects in the team */
  projects: number;
  /** When the team was created */
  createdAt: Date;
  /** Team settings */
  settings: TeamSettings;
}

/**
 * Team statistics
 */
export interface TeamStats {
  /** Total tasks across all team members */
  totalTasks: number;
  /** Completed tasks across all team members */
  completedTasks: number;
  /** Overdue tasks across all team members */
  overdueTasks: number;
  /** Average productivity across all team members */
  avgProductivity: number;
  /** Number of active team members */
  activeMembers: number;
  /** Number of projects in progress */
  projectsInProgress: number;
}
