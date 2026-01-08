import { beforeEach, describe, expect, it, vi } from "vitest";
import { atom, createStore } from "jotai";
import { QueryClient } from "@tanstack/react-query";
import { updateTasksMutationAtom } from "../mutations/tasks";
import { queryClientAtom } from "../data/base/query";
import { PROJECTS_QUERY_KEY, TASKS_QUERY_KEY } from "@tasktrove/constants";
import {
  createGroupId,
  createProjectId,
  createTaskId,
} from "@tasktrove/types/id";
import type { Project, Task } from "@tasktrove/types/core";

const hoisted = vi.hoisted(() => ({
  updateProjectsMutation: {
    mutateAsync: vi.fn(),
    mutate: vi.fn(),
  },
}));

vi.mock("@tasktrove/atoms/mutations/projects", () => ({
  updateProjectsMutationAtom: atom(hoisted.updateProjectsMutation),
}));

describe("updateTasksMutationAtom project moves", () => {
  let store: ReturnType<typeof createStore>;
  let queryClient: QueryClient;

  beforeEach(() => {
    store = createStore();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    store.set(queryClientAtom, queryClient);
    hoisted.updateProjectsMutation.mutateAsync.mockReset();
  });

  it("moves task between project sections when projectId changes without sectionId", async () => {
    const taskId = createTaskId("11111111-1111-4111-8111-111111111111");
    const projectAId = createProjectId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    const projectBId = createProjectId("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
    const sectionAId = createGroupId("aaaaaaaa-0000-4000-8000-000000000000");
    const sectionBId = createGroupId("bbbbbbbb-0000-4000-8000-000000000000");

    const task: Task = {
      id: taskId,
      title: "Move me",
      completed: false,
      priority: 2,
      projectId: projectAId,
      labels: [],
      subtasks: [],
      comments: [],
      createdAt: new Date(),
      recurringMode: "dueDate",
    };

    const projectA: Project = {
      id: projectAId,
      name: "Project A",
      color: "#111111",
      sections: [
        {
          id: sectionAId,
          name: "Default",
          type: "section",
          items: [taskId],
          isDefault: true,
        },
      ],
    };

    const projectB: Project = {
      id: projectBId,
      name: "Project B",
      color: "#222222",
      sections: [
        {
          id: sectionBId,
          name: "Default",
          type: "section",
          items: [],
          isDefault: true,
        },
      ],
    };

    queryClient.setQueryData(TASKS_QUERY_KEY, [task]);
    queryClient.setQueryData(PROJECTS_QUERY_KEY, [projectA, projectB]);

    const mutation = store.get(updateTasksMutationAtom);

    await mutation.mutateAsync([
      {
        id: taskId,
        projectId: projectBId,
      },
    ]);

    expect(hoisted.updateProjectsMutation.mutateAsync).toHaveBeenCalledTimes(1);
    const [updates] =
      hoisted.updateProjectsMutation.mutateAsync.mock.calls[0] ?? [];
    const updateA = updates?.find(
      (update: Project) => update.id === projectAId,
    );
    const updateB = updates?.find(
      (update: Project) => update.id === projectBId,
    );

    expect(updateA?.sections[0]?.items).not.toContain(taskId);
    expect(updateB?.sections[0]?.items).toContain(taskId);
  });
});
