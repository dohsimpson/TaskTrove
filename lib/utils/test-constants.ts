import {
  createTaskId,
  createProjectId,
  createLabelId,
  createSectionId,
  createVoiceCommandId,
  createSubtaskId,
  createCommentId,
} from "@/lib/types"

// Test UUID constants for consistent testing (using proper UUID v4 format)
export const TEST_TASK_ID_1 = createTaskId("12345678-1234-4234-8234-123456789abc")
export const TEST_TASK_ID_2 = createTaskId("12345678-1234-4234-8234-123456789abd")
export const TEST_TASK_ID_3 = createTaskId("12345678-1234-4234-8234-123456789abe")
export const TEST_PROJECT_ID_1 = createProjectId("87654321-4321-4321-8321-210987654321")
export const TEST_PROJECT_ID_2 = createProjectId("87654321-4321-4321-8321-210987654322")
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
