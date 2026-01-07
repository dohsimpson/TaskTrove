/**
 * Main navigation items configuration
 * Defines the standard views shown in the sidebar
 */

import { Inbox, Calendar, Clock, CheckSquare, ListTodo, Repeat, History } from "lucide-react"
export interface MainNavItem {
  id: string
  label: string
  icon: React.ReactNode
  count?: number
  href: string
  comingSoon?: boolean
  featureName?: string
  proOnly?: boolean
}

export interface MainNavItemsConfig {
  taskCountsData: Record<string, number>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- i18n TFunction has complex typing
  t: any
}

/**
 * Get main navigation items for the sidebar
 */
export function getMainNavItems({ taskCountsData, t }: MainNavItemsConfig): MainNavItem[] {
  return [
    {
      id: "inbox",
      label: t("common:mainNav.inbox", "Inbox"),
      icon: <Inbox className="h-4 w-4" />,
      count: taskCountsData.inbox || 0,
      href: "/inbox",
    },
    {
      id: "today",
      label: t("common:mainNav.today", "Today"),
      icon: <Calendar className="h-4 w-4" />,
      count: taskCountsData.today || 0,
      href: "/today",
    },
    {
      id: "upcoming",
      label: t("common:mainNav.upcoming", "Upcoming"),
      icon: <Clock className="h-4 w-4" />,
      count: taskCountsData.upcoming || 0,
      href: "/upcoming",
    },
    {
      id: "habits",
      label: t("common:mainNav.habits", "Habits"),
      icon: <Repeat className="h-4 w-4" />,
      count: taskCountsData.habits || 0,
      href: "/habits",
    },
    {
      id: "calendar",
      label: t("common:mainNav.calendar", "Calendar"),
      icon: <Calendar className="h-4 w-4" />,
      count: taskCountsData.calendar || 0,
      href: "/calendar",
    },
    {
      id: "recent",
      label: t("common:mainNav.recent", "Recent"),
      icon: <History className="h-4 w-4" />,
      count: taskCountsData.recent || 0,
      href: "/recent",
    },
    {
      id: "all",
      label: t("common:mainNav.allTasks", "All Tasks"),
      icon: <ListTodo className="h-4 w-4" />,
      count: taskCountsData.all || 0,
      href: "/all",
    },
    {
      id: "completed",
      label: t("common:mainNav.completed", "Completed"),
      icon: <CheckSquare className="h-4 w-4" />,
      count: taskCountsData.completed || 0,
      href: "/completed",
    },
  ]
}
