/**
 * Help content for different pages in TaskTrove
 */
import React from "react"
import { HelpSection, HelpDescription, HelpList, HelpTip } from "@/components/ui/help-content"

export interface HelpContent {
  title: string
  content: React.ReactNode
}

export function getHelpContent(routeName: string, title: string): HelpContent | null {
  // Normalize route name - remove leading slash and convert to lowercase
  const normalizedRoute = routeName.replace(/^\//, "").toLowerCase()

  switch (normalizedRoute) {
    case "today":
      return {
        title: "Today View",
        content: (
          <HelpSection>
            <HelpDescription>
              Focus on what matters most - tasks scheduled for today.
            </HelpDescription>
            <HelpList
              items={[
                "Tasks with due dates of today appear here automatically",
                "Click anywhere on a task to edit it inline",
                "Use the checkbox to mark tasks as complete",
                "Add new tasks using the + button or Cmd+K",
              ]}
            />
            <HelpTip variant="tip">
              <strong>Pro tip:</strong> Use this view for daily planning and focus sessions.
            </HelpTip>
          </HelpSection>
        ),
      }

    case "inbox":
      return {
        title: "Inbox",
        content: (
          <HelpSection>
            <HelpDescription>
              Your central capture point for all new tasks and ideas.
            </HelpDescription>
            <HelpList
              items={[
                "All new tasks start here until you organize them",
                "Quickly capture tasks without worrying about categories",
                "Add projects, labels, and due dates to organize",
                "Process your inbox regularly to maintain clarity",
              ]}
            />
            <HelpTip>
              <strong>Best practice:</strong> Review and organize your inbox daily to keep it
              manageable.
            </HelpTip>
          </HelpSection>
        ),
      }

    case "upcoming":
      return {
        title: "Upcoming Tasks",
        content: (
          <HelpSection>
            <HelpDescription>
              Plan ahead with a clear view of all future commitments.
            </HelpDescription>
            <HelpList
              variant="steps"
              items={[
                "Tasks are automatically grouped by due date",
                "Click on dates to reschedule tasks easily",
                "Set priorities to identify what matters most",
                "Perfect for weekly and monthly planning sessions",
              ]}
            />
            <HelpTip variant="tip">
              <strong>Planning tip:</strong> Review this view weekly to balance your workload.
            </HelpTip>
          </HelpSection>
        ),
      }

    case "completed":
      return {
        title: "Completed Tasks",
        content: (
          <HelpSection>
            <HelpDescription>
              Celebrate your achievements and track your productivity.
            </HelpDescription>
            <HelpList
              items={[
                "All completed tasks are automatically archived here",
                "Uncheck tasks to restore them to active status",
                "Review accomplishments for motivation and insights",
                "Search through your completion history",
              ]}
            />
            <HelpTip variant="info">
              <strong>Motivation boost:</strong> Regular review of completed tasks helps maintain
              momentum.
            </HelpTip>
          </HelpSection>
        ),
      }

    case "projects":
      return {
        title: "Projects",
        content: (
          <HelpSection>
            <HelpDescription>
              Group related tasks into projects for better organization and focus.
            </HelpDescription>
            <HelpList
              items={[
                "Create projects to group related tasks together",
                "Assign custom colors for visual organization",
                "Switch between list, board, and calendar views",
                "Track progress across different work areas",
              ]}
            />
            <HelpTip>
              <strong>Organization tip:</strong> Use projects for areas of responsibility, not just
              individual tasks.
            </HelpTip>
          </HelpSection>
        ),
      }

    case "labels":
      return {
        title: "Labels",
        content: (
          <HelpSection>
            <HelpDescription>
              Create flexible categorization systems with custom labels.
            </HelpDescription>
            <HelpList
              variant="tips"
              items={[
                "Add multiple labels to tasks for cross-cutting organization",
                "Create custom labels with colors for visual recognition",
                "Filter and search by labels to find tasks instantly",
                "Combine with projects for powerful organization systems",
              ]}
            />
            <HelpTip variant="tip">
              <strong>Power user tip:</strong> Use labels for contexts like @calls, @computer, or
              @errands.
            </HelpTip>
          </HelpSection>
        ),
      }

    case "filters":
      return {
        title: "Filters",
        content: (
          <div className="space-y-2">
            <p>Create custom views with advanced filtering options.</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Combine multiple criteria to create custom views</li>
              <li>Save frequently used filters for quick access</li>
              <li>Filter by priority, labels, projects, and dates</li>
              <li>Use filters to create focused work sessions</li>
            </ul>
          </div>
        ),
      }

    case "analytics":
      return {
        title: "Analytics",
        content: (
          <HelpSection>
            <HelpDescription>
              Gain insights into your productivity patterns and optimize your workflow.
            </HelpDescription>
            <HelpList
              variant="steps"
              items={[
                "Monitor completion trends and streaks over time",
                "Analyze productivity patterns by project and label",
                "Identify workflow bottlenecks and improvement areas",
                "Use data-driven insights to optimize your system",
              ]}
            />
            <HelpTip>
              <strong>Insight:</strong> Regular analytics review helps identify your most productive
              times and methods.
            </HelpTip>
          </HelpSection>
        ),
      }

    case "search":
      return {
        title: "Search",
        content: (
          <div className="space-y-2">
            <p>Find tasks quickly with powerful search capabilities.</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Search by task title, description, or comments</li>
              <li>Use filters to narrow down search results</li>
              <li>Search within specific projects or labels</li>
              <li>Find both active and completed tasks</li>
            </ul>
          </div>
        ),
      }

    default:
      // Handle project pages and label pages
      if (title.startsWith("#")) {
        return {
          title: "Label View",
          content: (
            <HelpSection>
              <HelpDescription>Focus on all tasks tagged with this specific label.</HelpDescription>
              <HelpList
                items={[
                  "View all tasks associated with this label",
                  "Add or remove this label from tasks as needed",
                  "Combine with other filters for refined views",
                  "Perfect for context-based or category-based work",
                ]}
              />
              <HelpTip>
                <strong>Label workflow:</strong> Use labels to create custom views that cut across
                projects.
              </HelpTip>
            </HelpSection>
          ),
        }
      }

      // Check if it's a project page (title doesn't match common routes)
      const commonRoutes = [
        "today",
        "inbox",
        "upcoming",
        "completed",
        "projects",
        "labels",
        "filters",
        "analytics",
        "search",
      ]
      if (!commonRoutes.includes(normalizedRoute) && title !== "TaskTrove") {
        return {
          title: "Project View",
          content: (
            <HelpSection>
              <HelpDescription>
                Focus on tasks within this specific project workspace.
              </HelpDescription>
              <HelpList
                variant="steps"
                items={[
                  "View and manage all tasks within this project",
                  "Add new tasks directly to the project scope",
                  "Track overall project progress and milestones",
                  "Switch between list, kanban, and calendar views",
                ]}
              />
              <HelpTip variant="info">
                <strong>Project focus:</strong> Use this dedicated view to maintain context and
                avoid distractions.
              </HelpTip>
            </HelpSection>
          ),
        }
      }

      return null
  }
}
