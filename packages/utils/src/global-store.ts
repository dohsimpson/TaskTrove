const GLOBAL_STORE_KEY = "__tasktroveGlobalStore__";

type GlobalStore = Record<string, unknown>;

type GlobalWithStore = typeof globalThis & {
  [GLOBAL_STORE_KEY]?: GlobalStore;
};

function getGlobalStore(): GlobalStore {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const globalObj = globalThis as GlobalWithStore;

  if (!globalObj[GLOBAL_STORE_KEY]) {
    globalObj[GLOBAL_STORE_KEY] = {};
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return globalObj[GLOBAL_STORE_KEY]!;
}

/**
 * Returns a singleton value stored on the global object, initializing it if needed.
 */
export function getGlobalSingleton<T>(key: string, initializer: () => T): T {
  const store = getGlobalStore();

  if (!(key in store)) {
    store[key] = initializer();
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return store[key] as T;
}

/**
 * Removes a singleton from the global store, primarily for test cleanup.
 */
export function resetGlobalSingleton(key: string) {
  const store = getGlobalStore();
  if (key in store) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete store[key];
  }
}

/**
 * Checks whether a singleton has already been initialized.
 */
export function hasGlobalSingleton(key: string): boolean {
  const store = getGlobalStore();
  return key in store;
}
