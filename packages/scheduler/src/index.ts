import parser from "cron-parser";

export type CronExpression = {
  type: "cron";
  expression: string;
  timezone?: string;
};

export type JobSchedule = CronExpression;
export type JobHandler = () => Promise<void> | void;

export interface JobConfig {
  id: string;
  schedule: JobSchedule;
  handler: JobHandler;
  runOnInit?: boolean;
  autoStart?: boolean;
}

export interface ScheduledTaskHandle {
  start(): void;
  stop(): void;
  destroy?(): void;
}

export interface ScheduleEngine {
  schedule(
    expression: string,
    handler: () => void,
    options?: CronScheduleOptions,
  ): ScheduledTaskHandle;
}

interface CronScheduleOptions {
  timezone?: string;
}

export type SchedulerLogger = Pick<typeof console, "log" | "warn" | "error">;

export interface SchedulerOptions {
  engine?: ScheduleEngine;
  logger?: SchedulerLogger;
}

interface NormalizedJobConfig extends JobConfig {
  runOnInit: boolean;
  autoStart: boolean;
}

interface RegisteredJob {
  config: NormalizedJobConfig;
  task: ScheduledTaskHandle;
}

class CronTimerEngine implements ScheduleEngine {
  schedule(
    expression: string,
    handler: () => void,
    options?: CronScheduleOptions,
  ): ScheduledTaskHandle {
    return new CronTimerHandle(expression, handler, options);
  }
}

class CronTimerHandle implements ScheduledTaskHandle {
  private timer: NodeJS.Timeout | null = null;
  private stopped = true;

  constructor(
    private readonly expression: string,
    private readonly handler: () => void,
    private readonly options?: CronScheduleOptions,
  ) {}

  start() {
    if (!this.stopped) {
      return;
    }

    this.stopped = false;
    this.scheduleNextTick();
  }

  stop() {
    if (this.stopped) {
      return;
    }

    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  destroy() {
    this.stop();
  }

  private scheduleNextTick() {
    if (this.stopped) {
      return;
    }

    let delay = 0;
    try {
      const interval = parser.parseExpression(this.expression, {
        tz: this.options?.timezone,
      });
      const next = interval.next().getTime();
      delay = Math.max(0, next - Date.now());
    } catch (error) {
      console.error(`Failed to schedule cron '${this.expression}':`, error);
      this.stop();
      return;
    }

    this.timer = setTimeout(() => {
      if (this.stopped) {
        return;
      }
      this.handler();
      this.scheduleNextTick();
    }, delay);
  }
}

const defaultLogger: SchedulerLogger = console;

export class Scheduler {
  private readonly engine: ScheduleEngine;
  private readonly logger: SchedulerLogger;
  private readonly jobs = new Map<string, RegisteredJob>();
  private started = false;

  constructor(options: SchedulerOptions = {}) {
    this.engine = options.engine ?? new CronTimerEngine();
    this.logger = options.logger ?? defaultLogger;
  }

  register(job: JobConfig, options?: { replace?: boolean }): void {
    const normalizedJob = this.normalizeJob(job);

    if (this.jobs.has(normalizedJob.id)) {
      if (!options?.replace) {
        throw new Error(
          `Scheduler job '${normalizedJob.id}' is already registered.`,
        );
      }

      this.unregister(normalizedJob.id);
    }

    const task = this.engine.schedule(
      normalizedJob.schedule.expression,
      () => {
        void this.safeExecute(normalizedJob.id);
      },
      {
        timezone: normalizedJob.schedule.timezone,
      },
    );

    const record: RegisteredJob = {
      config: normalizedJob,
      task,
    };

    this.jobs.set(normalizedJob.id, record);

    if (this.started && normalizedJob.autoStart) {
      task.start();
    }

    if (normalizedJob.runOnInit) {
      void this.safeExecute(normalizedJob.id);
    }
  }

  unregister(id: string): boolean {
    const record = this.jobs.get(id);
    if (!record) {
      return false;
    }

    record.task.stop();
    record.task.destroy?.();
    this.jobs.delete(id);
    return true;
  }

  start(): void {
    if (this.started) {
      return;
    }

    this.started = true;
    for (const { config, task } of this.jobs.values()) {
      if (!config.autoStart) {
        continue;
      }
      task.start();
    }
  }

  stop(): void {
    if (!this.started) {
      return;
    }

    for (const { task } of this.jobs.values()) {
      task.stop();
    }

    this.started = false;
  }

  async runNow(id: string): Promise<void> {
    if (!this.jobs.has(id)) {
      throw new Error(`Scheduler job '${id}' is not registered.`);
    }

    await this.safeExecute(id);
  }

  listJobs() {
    return Array.from(this.jobs.values()).map(({ config }) => ({
      id: config.id,
      schedule: {
        type: config.schedule.type,
        expression: config.schedule.expression,
      },
      autoStart: config.autoStart,
    }));
  }

  hasJob(id: string): boolean {
    return this.jobs.has(id);
  }

  isRunning(): boolean {
    return this.started;
  }

  private normalizeJob(job: JobConfig): NormalizedJobConfig {
    const autoStart = job.autoStart ?? true;
    const runOnInit = job.runOnInit ?? false;

    // JobSchedule is always CronExpression which only supports "cron" type
    // No need to check since the type system ensures this

    return {
      ...job,
      autoStart,
      runOnInit,
      schedule: {
        ...job.schedule,
      },
    };
  }

  private async safeExecute(id: string): Promise<void> {
    const record = this.jobs.get(id);
    if (!record) {
      return;
    }

    try {
      await record.config.handler();
    } catch (error) {
      this.logger.error(`Scheduler job '${id}' failed.`, error);
    }
  }
}
