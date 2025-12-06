import { describe, it, expect, vi, beforeEach } from "vitest";
import { atom, createStore, type Atom } from "jotai";
import type { PartialUserSettings } from "@tasktrove/types/settings";
import type { ScheduledNotification } from "@tasktrove/types/core";
import { createTaskId } from "@tasktrove/types/id";

const events: string[] = [];
const createDeferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

vi.mock("@tasktrove/atoms/utils/atom-helpers", () => ({
  handleAtomError: vi.fn(),
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  namedAtom: <AtomType extends Atom<unknown>>(
    name: string,
    value: AtomType,
  ) => {
    value.debugLabel = name;
    return value;
  },
}));

const updateSettingsDeferred = createDeferred<unknown>();
const showNotificationDeferred = createDeferred<{ success: boolean }>();

vi.mock("@tasktrove/atoms/mutations/settings", () => ({
  updateSettingsMutationAtom: atom({
    mutateAsync: vi.fn(async () => {
      events.push("mutate:updateSettings");
      return updateSettingsDeferred.promise;
    }),
  }),
}));

vi.mock("@tasktrove/atoms/utils/atom-helpers", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@tasktrove/atoms/utils/atom-helpers")
    >();
  return {
    ...actual,
    showServiceWorkerNotification: vi.fn(async () => {
      events.push("notify:show");
      return showNotificationDeferred.promise;
    }),
  };
});

vi.mock("@tasktrove/atoms/ui/audio", () => ({
  playSoundAtom: atom(null, (_get, _set, payload: { soundType: string }) => {
    events.push(`sound:${payload.soundType}`);
  }),
}));

vi.mock("@tasktrove/atoms/data/base/atoms", () => ({
  settingsAtom: atom({ general: { soundEnabled: true } }),
  tasksAtom: atom([]),
  projectsAtom: atom([]),
  labelsAtom: atom([]),
}));

vi.mock("@tasktrove/atoms/data/base/query", () => ({
  settingsQueryAtom: atom({}),
}));

vi.mock("@tasktrove/types/settings", () => ({}));
vi.mock("@tasktrove/constants", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tasktrove/constants")>();
  return {
    ...actual,
    DEFAULT_AVATAR_DIR: actual.DEFAULT_AVATAR_DIR,
  };
});

import { updateSettingsAtom } from "../core/settings";
import { showTaskDueNotificationAtom } from "../core/notifications";

describe("settings/notifications sound timing", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    events.length = 0;
    store = createStore();
    updateSettingsDeferred.resolve({});
    showNotificationDeferred.resolve({ success: true });
  });

  it("plays sound before settings mutation", async () => {
    const testSettings: PartialUserSettings = {
      general: { soundEnabled: true },
    };
    const pending = store.set(updateSettingsAtom, testSettings);
    expect(events).toEqual(["sound:confirm", "mutate:updateSettings"]);
    updateSettingsDeferred.resolve({});
    await pending;
  });

  it("plays chime before service worker notification", async () => {
    const notification: ScheduledNotification = {
      taskId: createTaskId("10000000-0000-4000-8000-000000000001"),
      taskTitle: "Task",
      notifyAt: new Date(),
      type: "due",
    };
    const pending = store.set(showTaskDueNotificationAtom, notification);
    expect(events).toEqual(["sound:chime", "notify:show"]);
    showNotificationDeferred.resolve({ success: true });
    await pending;
  });
});
