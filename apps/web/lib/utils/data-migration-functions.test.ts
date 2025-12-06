/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { v080Migration, v0100Migration, v0110Migration } from "@/lib/utils/data-migration-functions"
import type { Json } from "@tasktrove/types/constants"
import {
  DEFAULT_EMPTY_DATA_FILE,
  DEFAULT_USER_SETTINGS,
  DEFAULT_USER,
  DEFAULT_GENERAL_SETTINGS,
} from "@tasktrove/types/defaults"
import { DEFAULT_UUID } from "@tasktrove/constants"
import {
  TEST_TASK_ID_1,
  TEST_TASK_ID_2,
  TEST_PROJECT_ID_1,
  TEST_LABEL_ID_1,
} from "@tasktrove/types/test-constants"

describe("Data Migration Functions", () => {
  function createJsonData(data: Record<string, unknown>): Json {
    return JSON.parse(JSON.stringify(data))
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("v0.8.0 Migration Function", () => {
    it("should add userId to all task comments", () => {
      const taskId1 = TEST_TASK_ID_1
      const taskId2 = TEST_TASK_ID_2

      const v070Data = createJsonData({
        tasks: [
          {
            id: taskId1,
            title: "Task with comments",
            projectId: TEST_PROJECT_ID_1,
            completed: false,
            priority: 1,
            labels: [],
            subtasks: [],
            comments: [
              {
                id: "comment-1",
                content: "First comment",
                createdAt: new Date().toISOString(),
              },
              {
                id: "comment-2",
                content: "Second comment",
                createdAt: new Date().toISOString(),
              },
            ],
            createdAt: new Date().toISOString(),
            recurringMode: "dueDate",
          },
          {
            id: taskId2,
            title: "Task without comments",
            projectId: TEST_PROJECT_ID_1,
            completed: false,
            priority: 2,
            labels: [],
            subtasks: [],
            comments: [],
            createdAt: new Date().toISOString(),
            recurringMode: "dueDate",
          },
        ],
        projects: [],
        labels: [],
        projectGroups: {
          type: "project",
          id: DEFAULT_UUID,
          name: "All Projects",
          slug: "all-projects",
          items: [],
        },
        labelGroups: {
          type: "label",
          id: DEFAULT_UUID,
          name: "All Labels",
          slug: "all-labels",
          items: [],
        },
        settings: DEFAULT_USER_SETTINGS,
        user: {
          username: "admin",
          password: "",
        },
        version: "v0.7.0",
      })

      const result = v080Migration(v070Data)

      const tasks = (result as any).tasks
      expect(tasks).toHaveLength(2)

      const task1 = tasks[0]
      expect(task1.comments).toHaveLength(2)
      expect(task1.comments[0]).toHaveProperty("userId", DEFAULT_UUID)
      expect(task1.comments[1]).toHaveProperty("userId", DEFAULT_UUID)

      const user = (result as any).user
      expect(user).toHaveProperty("id", DEFAULT_UUID)
      expect(user).toHaveProperty("username", "admin")
    })

    it("should preserve existing userId in comments", () => {
      const existingUserId = "existing-user-id"
      const v070Data = createJsonData({
        tasks: [
          {
            id: TEST_TASK_ID_1,
            title: "Task with existing userId in comments",
            projectId: TEST_PROJECT_ID_1,
            completed: false,
            priority: 1,
            labels: [],
            subtasks: [],
            comments: [
              {
                id: "comment-1",
                userId: existingUserId,
                content: "Comment with existing userId",
                createdAt: new Date().toISOString(),
              },
            ],
            createdAt: new Date().toISOString(),
            recurringMode: "dueDate",
          },
        ],
        projects: [],
        labels: [],
        projectGroups: {
          type: "project",
          id: DEFAULT_UUID,
          name: "All Projects",
          slug: "all-projects",
          items: [],
        },
        labelGroups: {
          type: "label",
          id: DEFAULT_UUID,
          name: "All Labels",
          slug: "all-labels",
          items: [],
        },
        settings: DEFAULT_USER_SETTINGS,
        user: DEFAULT_USER,
        version: "v0.7.0",
      })

      const result = v080Migration(v070Data)

      const tasks = (result as any).tasks
      expect(tasks[0].comments[0]).toHaveProperty("userId", existingUserId)
    })

    it("should add id to user object when missing", () => {
      const v070Data = createJsonData({
        tasks: [],
        projects: [],
        labels: [],
        projectGroups: {
          type: "project",
          id: DEFAULT_UUID,
          name: "All Projects",
          slug: "all-projects",
          items: [],
        },
        labelGroups: {
          type: "label",
          id: DEFAULT_UUID,
          name: "All Labels",
          slug: "all-labels",
          items: [],
        },
        settings: DEFAULT_USER_SETTINGS,
        user: {
          username: "testuser",
          password: "hashedpassword",
        },
        version: "v0.7.0",
      })

      const result = v080Migration(v070Data)

      const user = (result as any).user
      expect(user).toHaveProperty("id", DEFAULT_UUID)
      expect(user).toHaveProperty("username", "testuser")
      expect(user).toHaveProperty("password", "hashedpassword")
    })

    it("should handle tasks without comments gracefully", () => {
      const v070Data = createJsonData({
        tasks: [
          {
            id: TEST_TASK_ID_1,
            title: "Task without comments array",
            projectId: TEST_PROJECT_ID_1,
            completed: false,
            priority: 1,
            labels: [],
            subtasks: [],
            createdAt: new Date().toISOString(),
            recurringMode: "dueDate",
          },
        ],
        projects: [],
        labels: [],
        projectGroups: {
          type: "project",
          id: DEFAULT_UUID,
          name: "All Projects",
          slug: "all-projects",
          items: [],
        },
        labelGroups: {
          type: "label",
          id: DEFAULT_UUID,
          name: "All Labels",
          slug: "all-labels",
          items: [],
        },
        settings: DEFAULT_USER_SETTINGS,
        user: DEFAULT_USER,
        version: "v0.7.0",
      })

      const result = v080Migration(v070Data)

      const tasks = (result as any).tasks
      expect(tasks).toHaveLength(1)
      expect(tasks[0]).not.toHaveProperty("comments")
    })
  })

  describe("v0.11.0 Migration Function", () => {
    it("should add uiSettings with default weekStartsOn when missing", () => {
      const data = createJsonData({
        ...DEFAULT_EMPTY_DATA_FILE,
        version: "v0.10.0",
      })
      delete (data as any).settings.uiSettings

      const migrated = v0110Migration(data) as any
      expect(migrated).toHaveProperty("settings.uiSettings")
      expect(migrated.settings.uiSettings.weekStartsOn).toBeUndefined()
      expect(migrated.settings.uiSettings).not.toHaveProperty("weekStartsOn")
    })

    it("should preserve existing weekStartsOn", () => {
      const data = createJsonData({
        ...DEFAULT_EMPTY_DATA_FILE,
        version: "v0.10.0",
        settings: {
          ...DEFAULT_USER_SETTINGS,
          uiSettings: { weekStartsOn: 1 },
        },
      })

      const migrated = v0110Migration(data) as any
      expect(migrated).toHaveProperty("settings.uiSettings.weekStartsOn", 1)
    })
  })

  describe("v0.10.0 Migration Function", () => {
    it("should add markdownEnabled flag to general settings when missing", () => {
      const v080DataWithoutMarkdownEnabled = createJsonData({
        tasks: [],
        projects: [],
        labels: [],
        projectGroups: {
          type: "project",
          id: DEFAULT_UUID,
          name: "All Projects",
          slug: "all-projects",
          items: [],
        },
        labelGroups: {
          type: "label",
          id: DEFAULT_UUID,
          name: "All Labels",
          slug: "all-labels",
          items: [],
        },
        settings: {
          data: {
            autoBackup: {
              enabled: false,
              backupTime: "20:00",
              maxBackups: 10,
            },
          },
          notifications: {
            enabled: true,
            requireInteraction: true,
          },
          general: {
            startView: "all",
            soundEnabled: true,
            linkifyEnabled: true,
            popoverHoverOpen: false,
          },
        },
        user: DEFAULT_USER,
        version: "v0.8.0",
      })

      const result = v0100Migration(v080DataWithoutMarkdownEnabled)

      const settings = (result as any).settings
      expect(settings.general).toHaveProperty(
        "markdownEnabled",
        DEFAULT_GENERAL_SETTINGS.markdownEnabled,
      )
    })

    it("should restore default settings when settings are missing", () => {
      const v080DataWithoutSettings = createJsonData({
        tasks: [],
        projects: [],
        labels: [],
        projectGroups: {
          type: "project",
          id: DEFAULT_UUID,
          name: "All Projects",
          slug: "all-projects",
          items: [],
        },
        labelGroups: {
          type: "label",
          id: DEFAULT_UUID,
          name: "All Labels",
          slug: "all-labels",
          items: [],
        },
        user: DEFAULT_USER,
        version: "v0.8.0",
      })

      const result = v0100Migration(v080DataWithoutSettings)

      const settings = (result as any).settings
      expect(settings).toEqual(DEFAULT_USER_SETTINGS)
    })

    it("should preserve other general settings when adding markdownEnabled", () => {
      const v080DataWithOtherSettings = createJsonData({
        tasks: [],
        projects: [],
        labels: [],
        projectGroups: {
          type: "project",
          id: DEFAULT_UUID,
          name: "All Projects",
          slug: "all-projects",
          items: [],
        },
        labelGroups: {
          type: "label",
          id: DEFAULT_UUID,
          name: "All Labels",
          slug: "all-labels",
          items: [],
        },
        settings: {
          data: {
            autoBackup: {
              enabled: true,
              backupTime: "09:00",
              maxBackups: 7,
            },
          },
          notifications: {
            enabled: false,
            requireInteraction: false,
          },
          general: {
            startView: "lastViewed",
            soundEnabled: false,
            linkifyEnabled: false,
            popoverHoverOpen: true,
          },
        },
        user: DEFAULT_USER,
        version: "v0.8.0",
      })

      const result = v0100Migration(v080DataWithOtherSettings)

      const settings = (result as any).settings
      expect(settings.general.startView).toBe("lastViewed")
      expect(settings.general.markdownEnabled).toBe(DEFAULT_GENERAL_SETTINGS.markdownEnabled)
    })

    it("should preserve existing trackingId when rebasing", () => {
      const trackingId = "12345678-1234-4234-8234-123456789abc"
      const v080DataWithTrackingId = createJsonData({
        tasks: [
          {
            id: TEST_TASK_ID_1,
            title: "Task 1",
            projectId: TEST_PROJECT_ID_1,
            completed: false,
            priority: 1,
            labels: [],
            subtasks: [],
            comments: [],
            createdAt: new Date().toISOString(),
            recurringMode: "dueDate",
            trackingId,
            recurring: true,
          },
          {
            id: TEST_TASK_ID_2,
            title: "Task 2",
            projectId: TEST_PROJECT_ID_1,
            completed: false,
            priority: 1,
            labels: [],
            subtasks: [],
            comments: [],
            createdAt: new Date().toISOString(),
            recurringMode: "dueDate",
            trackingId,
            recurring: true,
          },
        ],
        projects: [],
        labels: [],
        projectGroups: {
          type: "project",
          id: DEFAULT_UUID,
          name: "All Projects",
          slug: "all-projects",
          items: [],
        },
        labelGroups: {
          type: "label",
          id: DEFAULT_UUID,
          name: "All Labels",
          slug: "all-labels",
          items: [],
        },
        settings: DEFAULT_USER_SETTINGS,
        user: DEFAULT_USER,
        version: "v0.8.0",
      })

      const result = v0100Migration(v080DataWithTrackingId)

      const tasks = (result as any).tasks
      expect(tasks[0].trackingId).toBe(trackingId)
      expect(tasks[1].trackingId).toBe(trackingId)
    })

    it("should clean up dangling tasks without throwing", () => {
      const v080DataWithDanglingTasks = createJsonData({
        tasks: [
          {
            id: TEST_TASK_ID_1,
            projectId: TEST_PROJECT_ID_1,
          },
          {
            id: TEST_TASK_ID_2,
            projectId: TEST_PROJECT_ID_1,
          },
        ],
        projects: [
          {
            id: TEST_PROJECT_ID_1,
            name: "Project 1",
            sections: [],
          },
        ],
        labels: [
          {
            id: TEST_LABEL_ID_1,
            name: "Label 1",
          },
        ],
        projectGroups: {
          type: "project",
          id: DEFAULT_UUID,
          name: "All Projects",
          slug: "all-projects",
          items: [],
        },
        labelGroups: {
          type: "label",
          id: DEFAULT_UUID,
          name: "All Labels",
          slug: "all-labels",
          items: [],
        },
        settings: DEFAULT_USER_SETTINGS,
        user: DEFAULT_USER,
        version: "v0.8.0",
      })

      expect(() => v0100Migration(v080DataWithDanglingTasks)).not.toThrow()
    })
  })
})
