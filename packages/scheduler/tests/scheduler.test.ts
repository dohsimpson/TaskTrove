import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ScheduleEngine,
  ScheduledTaskHandle,
  CronExpression,
} from "../src";
import { Scheduler } from "../src";

const cron = (expression: string): CronExpression => ({
  type: "cron",
  expression,
});

class FakeScheduledTask implements ScheduledTaskHandle {
  public starts = 0;
  public stops = 0;
  private readonly handler: () => void;

  constructor(handler: () => void) {
    this.handler = handler;
  }

  start() {
    this.starts += 1;
  }

  stop() {
    this.stops += 1;
  }

  fire() {
    this.handler();
  }
}

class FakeEngine implements ScheduleEngine {
  public tasks: FakeScheduledTask[] = [];

  schedule(_: string, handler: () => void): ScheduledTaskHandle {
    const task = new FakeScheduledTask(handler);
    this.tasks.push(task);
    return task;
  }
}

describe("Scheduler", () => {
  let engine: FakeEngine;
  const logger = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(() => {
    engine = new FakeEngine();
    logger.log.mockReset();
    logger.warn.mockReset();
    logger.error.mockReset();
  });

  it("registers a job and allows running it immediately", async () => {
    const scheduler = new Scheduler({ engine, logger });
    const handler = vi.fn();

    scheduler.register({ id: "backup", schedule: cron("* * * * *"), handler });
    await scheduler.runNow("backup");

    expect(handler).toHaveBeenCalledTimes(1);
    expect(engine.tasks).toHaveLength(1);
  });

  it("starts and stops all jobs", () => {
    const scheduler = new Scheduler({ engine, logger });
    scheduler.register({
      id: "one",
      schedule: cron("* * * * *"),
      handler: vi.fn(),
    });
    scheduler.register({
      id: "two",
      schedule: cron("* * * * *"),
      handler: vi.fn(),
    });

    scheduler.start();
    expect(engine.tasks[0]?.starts).toBe(1);
    expect(engine.tasks[1]?.starts).toBe(1);

    scheduler.stop();
    expect(engine.tasks[0]?.stops).toBe(1);
    expect(engine.tasks[1]?.stops).toBe(1);
  });

  it("auto-starts newly registered jobs when already running", () => {
    const scheduler = new Scheduler({ engine, logger });
    scheduler.start();

    scheduler.register({
      id: "runtime",
      schedule: cron("* * * * *"),
      handler: vi.fn(),
    });
    expect(engine.tasks[0]?.starts).toBe(1);
  });

  it("prevents duplicate job ids unless replace is true", () => {
    const scheduler = new Scheduler({ engine, logger });
    scheduler.register({
      id: "dup",
      schedule: cron("* * * * *"),
      handler: vi.fn(),
    });

    expect(() =>
      scheduler.register({
        id: "dup",
        schedule: cron("* * * * *"),
        handler: vi.fn(),
      }),
    ).toThrowError(/already registered/);

    scheduler.register(
      { id: "dup", schedule: cron("* * * * *"), handler: vi.fn() },
      { replace: true },
    );
    expect(engine.tasks).toHaveLength(2);
    expect(engine.tasks[0]?.stops).toBe(1);
  });

  it("unregisters jobs and stops them", () => {
    const scheduler = new Scheduler({ engine, logger });
    scheduler.register({
      id: "temp",
      schedule: cron("* * * * *"),
      handler: vi.fn(),
    });

    const removed = scheduler.unregister("temp");
    expect(removed).toBe(true);
    expect(engine.tasks[0]?.stops).toBe(1);
    expect(scheduler.unregister("missing")).toBe(false);
  });

  it("runs registered handlers when cron fires", async () => {
    const scheduler = new Scheduler({ engine, logger });
    const handler = vi.fn();
    scheduler.register({ id: "tick", schedule: cron("* * * * *"), handler });

    scheduler.start();
    engine.tasks[0]?.fire();

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("supports runOnInit option", () => {
    const scheduler = new Scheduler({ engine, logger });
    const handler = vi.fn();
    scheduler.register({
      id: "init",
      schedule: cron("* * * * *"),
      handler,
      runOnInit: true,
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("lists jobs with metadata", () => {
    const scheduler = new Scheduler({ engine, logger });
    scheduler.register({
      id: "list",
      schedule: cron("0 0 * * *"),
      handler: vi.fn(),
    });

    expect(scheduler.listJobs()).toEqual([
      {
        id: "list",
        schedule: { type: "cron", expression: "0 0 * * *" },
      },
    ]);
  });
});
