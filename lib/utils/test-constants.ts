import {
  createTaskId,
  createProjectId,
  createLabelId,
  createSectionId,
  createVoiceCommandId,
  createSubtaskId,
  createCommentId,
  createGroupId,
} from "@/lib/types"
import type { DataFileSerialization, ProjectGroup } from "@/lib/types"

// Test UUID constants for consistent testing (using proper UUID v4 format)
export const TEST_TASK_ID_1 = createTaskId("12345678-1234-4234-8234-123456789abc")
export const TEST_TASK_ID_2 = createTaskId("12345678-1234-4234-8234-123456789abd")
export const TEST_TASK_ID_3 = createTaskId("12345678-1234-4234-8234-123456789abe")
export const TEST_PROJECT_ID_1 = createProjectId("87654321-4321-4321-8321-210987654321")
export const TEST_PROJECT_ID_2 = createProjectId("87654321-4321-4321-8321-210987654322")
export const TEST_PROJECT_ID_3 = createProjectId("44444444-4444-4444-8444-444444444444")
export const TEST_PROJECT_ID_4 = createProjectId("55555555-5555-4555-8555-555555555555")
export const TEST_LABEL_ID_1 = createLabelId("abcdef01-abcd-4bcd-8bcd-abcdefabcdef")
export const TEST_LABEL_ID_2 = createLabelId("abcdef01-abcd-4bcd-8bcd-abcdefabcde0")
export const TEST_LABEL_ID_3 = createLabelId("abcdef01-abcd-4bcd-8bcd-abcdefabcde1")
export const TEST_SECTION_ID_1 = createSectionId("00000000-0000-4000-8000-000000000001")
export const TEST_SECTION_ID_2 = createSectionId("00000000-0000-4000-8000-000000000002")
export const TEST_SECTION_ID_3 = createSectionId("00000000-0000-4000-8000-000000000003")
export const TEST_VOICE_COMMAND_ID_1 = createVoiceCommandId("fedcba98-7654-4321-8765-fedcba987654")
export const TEST_SUBTASK_ID_1 = createSubtaskId("11111111-1111-4111-8111-111111111111")
export const TEST_SUBTASK_ID_2 = createSubtaskId("22222222-2222-4222-8222-222222222222")
export const TEST_SUBTASK_ID_3 = createSubtaskId("33333333-3333-4333-8333-333333333333")
export const TEST_SUBTASK_ID_4 = createSubtaskId("44444444-4444-4444-8444-444444444444")
export const TEST_COMMENT_ID_1 = createCommentId("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee")
export const TEST_COMMENT_ID_2 = createCommentId("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeef1")
export const TEST_COMMENT_ID_3 = createCommentId("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeef2")
export const TEST_COMMENT_ID_4 = createCommentId("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeef3")
export const TEST_COMMENT_ID_5 = createCommentId("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeef4")

export const TEST_GROUP_ID_1 = createGroupId("33333333-3333-4333-8333-333333333333")
export const TEST_GROUP_ID_2 = createGroupId("11111111-1111-4111-8111-111111111111")
export const TEST_GROUP_ID_3 = createGroupId("22222222-2222-4222-8222-222222222222")

// Test group data structures - properly typed to avoid type assertions
export const TEST_PROJECT_GROUP_WORK: ProjectGroup = {
  type: "project",
  id: TEST_GROUP_ID_2,
  name: "Work Projects",
  slug: "work-projects",
  description: "Projects related to work",
  color: "#3b82f6",
  items: [TEST_PROJECT_ID_3],
}

export const TEST_PROJECT_GROUP_DEVELOPMENT: ProjectGroup = {
  type: "project",
  id: TEST_GROUP_ID_3,
  name: "Development",
  slug: "development",
  items: [TEST_PROJECT_ID_4],
}

export const TEST_PROJECT_GROUP_ALL: ProjectGroup = {
  type: "project",
  id: TEST_GROUP_ID_1,
  name: "All Projects",
  slug: "all-projects",
  items: [TEST_PROJECT_GROUP_WORK, TEST_PROJECT_GROUP_DEVELOPMENT],
}

export const TEST_GROUPS_DATA: DataFileSerialization = {
  projectGroups: TEST_PROJECT_GROUP_ALL,
  labelGroups: {
    type: "label",
    id: createGroupId("77777777-7777-4777-8777-777777777777"),
    name: "All Labels",
    slug: "all-labels",
    items: [],
  },
  tasks: [],
  projects: [],
  labels: [],
  settings: {
    integrations: {
      imports: {
        supportedSources: ["ticktick", "todoist", "asana", "trello"],
      },
      autoBackupEnabled: true,
      backupTime: "09:00",
      maxBackups: 7,
    },
  },
}
