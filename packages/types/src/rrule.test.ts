import { describe, it, expect } from "vitest";
import {
  CreateTaskRequestSchema,
  buildRRule,
  parseRRule,
  CommonRRules,
  RRuleFrequency,
  RRuleWeekday,
} from "./index";

describe("RRULE Validation", () => {
  describe("Valid RRULE patterns", () => {
    it("should accept valid daily RRULE", () => {
      const task = {
        title: "Test task",
        recurring: "RRULE:FREQ=DAILY",
      };
      const result = CreateTaskRequestSchema.safeParse(task);
      expect(result.success).toBe(true);
    });

    it("should accept daily with interval", () => {
      const task = {
        title: "Test task",
        recurring: "RRULE:FREQ=DAILY;INTERVAL=2",
      };
      const result = CreateTaskRequestSchema.safeParse(task);
      expect(result.success).toBe(true);
    });

    it("should accept daily with count", () => {
      const task = {
        title: "Test task",
        recurring: "RRULE:FREQ=DAILY;COUNT=10",
      };
      const result = CreateTaskRequestSchema.safeParse(task);
      expect(result.success).toBe(true);
    });

    it("should accept daily with until date", () => {
      const task = {
        title: "Test task",
        recurring: "RRULE:FREQ=DAILY;UNTIL=20241231",
      };
      const result = CreateTaskRequestSchema.safeParse(task);
      expect(result.success).toBe(true);
    });

    it("should accept weekly with specific days", () => {
      const task = {
        title: "Test task",
        recurring: "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR",
      };
      const result = CreateTaskRequestSchema.safeParse(task);
      expect(result.success).toBe(true);
    });

    it("should accept monthly with specific day", () => {
      const task = {
        title: "Test task",
        recurring: "RRULE:FREQ=MONTHLY;BYMONTHDAY=15",
      };
      const result = CreateTaskRequestSchema.safeParse(task);
      expect(result.success).toBe(true);
    });

    it("should accept complex RRULE", () => {
      const task = {
        title: "Test task",
        recurring: "RRULE:FREQ=MONTHLY;INTERVAL=2;BYDAY=2TU;COUNT=5",
      };
      const result = CreateTaskRequestSchema.safeParse(task);
      expect(result.success).toBe(true);
    });

    it("should accept RRULE with datetime UNTIL", () => {
      const task = {
        title: "Test task",
        recurring: "RRULE:FREQ=DAILY;UNTIL=20241231T235959Z",
      };
      const result = CreateTaskRequestSchema.safeParse(task);
      expect(result.success).toBe(true);
    });
  });

  describe("Invalid RRULE patterns", () => {
    it("should reject RRULE without RRULE: prefix", () => {
      const task = {
        title: "Test task",
        recurring: "FREQ=DAILY",
      };
      const result = CreateTaskRequestSchema.safeParse(task);
      expect(result.success).toBe(false);
      const firstIssue = result.error?.issues[0];
      if (!firstIssue) {
        throw new Error("Expected to find first validation issue");
      }
      expect(firstIssue.message).toContain(
        'must be a valid RRULE starting with "RRULE:"',
      );
    });

    it("should reject RRULE without FREQ", () => {
      const task = {
        title: "Test task",
        recurring: "RRULE:INTERVAL=2",
      };
      const result = CreateTaskRequestSchema.safeParse(task);
      expect(result.success).toBe(false);
      const freqIssue = result.error?.issues[0];
      if (!freqIssue) {
        throw new Error("Expected to find FREQ validation issue");
      }
      expect(freqIssue.message).toContain("RRULE must contain FREQ");
    });

    it("should reject invalid FREQ value", () => {
      const task = {
        title: "Test task",
        recurring: "RRULE:FREQ=HOURLY",
      };
      const result = CreateTaskRequestSchema.safeParse(task);
      expect(result.success).toBe(false);
      const invalidFreqIssue = result.error?.issues[0];
      if (!invalidFreqIssue) {
        throw new Error("Expected to find invalid FREQ validation issue");
      }
      expect(invalidFreqIssue.message).toContain("Invalid FREQ value");
    });

    it("should reject invalid INTERVAL", () => {
      const task = {
        title: "Test task",
        recurring: "RRULE:FREQ=DAILY;INTERVAL=0",
      };
      const result = CreateTaskRequestSchema.safeParse(task);
      expect(result.success).toBe(false);
      const intervalIssue = result.error?.issues[0];
      if (!intervalIssue) {
        throw new Error("Expected to find INTERVAL validation issue");
      }
      expect(intervalIssue.message).toContain("Invalid INTERVAL value");
    });

    it("should reject invalid COUNT", () => {
      const task = {
        title: "Test task",
        recurring: "RRULE:FREQ=DAILY;COUNT=-5",
      };
      const result = CreateTaskRequestSchema.safeParse(task);
      expect(result.success).toBe(false);
      const countIssue = result.error?.issues[0];
      if (!countIssue) {
        throw new Error("Expected to find COUNT validation issue");
      }
      expect(countIssue.message).toContain("Invalid COUNT value");
    });

    it("should reject both COUNT and UNTIL", () => {
      const task = {
        title: "Test task",
        recurring: "RRULE:FREQ=DAILY;COUNT=5;UNTIL=20241231",
      };
      const result = CreateTaskRequestSchema.safeParse(task);
      expect(result.success).toBe(false);
      const countUntilIssue = result.error?.issues[0];
      if (!countUntilIssue) {
        throw new Error("Expected to find COUNT/UNTIL validation issue");
      }
      expect(countUntilIssue.message).toContain(
        "cannot contain both COUNT and UNTIL",
      );
    });

    it("should reject invalid UNTIL format", () => {
      const task = {
        title: "Test task",
        recurring: "RRULE:FREQ=DAILY;UNTIL=2024-12-31",
      };
      const result = CreateTaskRequestSchema.safeParse(task);
      expect(result.success).toBe(false);
      const untilIssue = result.error?.issues[0];
      if (!untilIssue) {
        throw new Error("Expected to find UNTIL validation issue");
      }
      expect(untilIssue.message).toContain("Invalid UNTIL value");
    });

    it("should reject invalid BYDAY", () => {
      const task = {
        title: "Test task",
        recurring: "RRULE:FREQ=WEEKLY;BYDAY=XX",
      };
      const result = CreateTaskRequestSchema.safeParse(task);
      expect(result.success).toBe(false);
      const bydayIssue = result.error?.issues[0];
      if (!bydayIssue) {
        throw new Error("Expected to find BYDAY validation issue");
      }
      expect(bydayIssue.message).toContain("Invalid BYDAY day code");
    });

    it("should reject invalid BYMONTH", () => {
      const task = {
        title: "Test task",
        recurring: "RRULE:FREQ=YEARLY;BYMONTH=13",
      };
      const result = CreateTaskRequestSchema.safeParse(task);
      expect(result.success).toBe(false);
      const bymonthIssue = result.error?.issues[0];
      if (!bymonthIssue) {
        throw new Error("Expected to find BYMONTH validation issue");
      }
      expect(bymonthIssue.message).toContain("Invalid BYMONTH value");
    });

    it("should reject invalid BYMONTHDAY", () => {
      const task = {
        title: "Test task",
        recurring: "RRULE:FREQ=MONTHLY;BYMONTHDAY=32",
      };
      const result = CreateTaskRequestSchema.safeParse(task);
      expect(result.success).toBe(false);
      const bymonthdayIssue = result.error?.issues[0];
      if (!bymonthdayIssue) {
        throw new Error("Expected to find BYMONTHDAY validation issue");
      }
      expect(bymonthdayIssue.message).toContain("Invalid BYMONTHDAY value");
    });

    it("should reject malformed RRULE part", () => {
      const task = {
        title: "Test task",
        recurring: "RRULE:FREQ=DAILY;BADPART",
      };
      const result = CreateTaskRequestSchema.safeParse(task);
      expect(result.success).toBe(false);
      const formatIssue = result.error?.issues[0];
      if (!formatIssue) {
        throw new Error("Expected to find RRULE format validation issue");
      }
      expect(formatIssue.message).toContain("Invalid RRULE format");
    });
  });

  describe("Undefined/null values", () => {
    it("should accept undefined recurring", () => {
      const task = {
        title: "Test task",
        // recurring: undefined
      };
      const result = CreateTaskRequestSchema.safeParse(task);
      expect(result.success).toBe(true);
    });

    it("should accept explicit undefined recurring", () => {
      const task = {
        title: "Test task",
        recurring: undefined,
      };
      const result = CreateTaskRequestSchema.safeParse(task);
      expect(result.success).toBe(true);
    });
  });
});

describe("RRULE Builder", () => {
  describe("buildRRule function", () => {
    it("should build simple daily RRULE", () => {
      const result = buildRRule({ freq: RRuleFrequency.DAILY });
      expect(result).toBe("RRULE:FREQ=DAILY");
    });

    it("should build RRULE with interval", () => {
      const result = buildRRule({ freq: RRuleFrequency.DAILY, interval: 2 });
      expect(result).toBe("RRULE:FREQ=DAILY;INTERVAL=2");
    });

    it("should build RRULE with count", () => {
      const result = buildRRule({ freq: RRuleFrequency.WEEKLY, count: 10 });
      expect(result).toBe("RRULE:FREQ=WEEKLY;COUNT=10");
    });

    it("should build RRULE with until", () => {
      const result = buildRRule({
        freq: RRuleFrequency.MONTHLY,
        until: "20241231",
      });
      expect(result).toBe("RRULE:FREQ=MONTHLY;UNTIL=20241231");
    });

    it("should build RRULE with byday", () => {
      const result = buildRRule({
        freq: RRuleFrequency.WEEKLY,
        byday: [RRuleWeekday.MO, RRuleWeekday.WE, RRuleWeekday.FR],
      });
      expect(result).toBe("RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR");
    });

    it("should build complex RRULE", () => {
      const result = buildRRule({
        freq: RRuleFrequency.MONTHLY,
        interval: 2,
        count: 5,
        byday: [RRuleWeekday.TU],
        bymonthday: [15],
      });
      expect(result).toBe(
        "RRULE:FREQ=MONTHLY;INTERVAL=2;COUNT=5;BYDAY=TU;BYMONTHDAY=15",
      );
    });

    it("should not include interval=1", () => {
      const result = buildRRule({ freq: RRuleFrequency.DAILY, interval: 1 });
      expect(result).toBe("RRULE:FREQ=DAILY");
    });
  });

  describe("parseRRule function", () => {
    it("should parse simple daily RRULE", () => {
      const result = parseRRule("RRULE:FREQ=DAILY");
      expect(result).toEqual({ freq: "DAILY" });
    });

    it("should parse RRULE with interval", () => {
      const result = parseRRule("RRULE:FREQ=DAILY;INTERVAL=2");
      expect(result).toEqual({ freq: "DAILY", interval: 2 });
    });

    it("should parse RRULE with count", () => {
      const result = parseRRule("RRULE:FREQ=WEEKLY;COUNT=10");
      expect(result).toEqual({ freq: "WEEKLY", count: 10 });
    });

    it("should parse RRULE with byday", () => {
      const result = parseRRule("RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR");
      expect(result).toEqual({
        freq: "WEEKLY",
        byday: ["MO", "WE", "FR"],
      });
    });

    it("should parse complex RRULE", () => {
      const result = parseRRule(
        "RRULE:FREQ=MONTHLY;INTERVAL=2;COUNT=5;BYDAY=TU;BYMONTHDAY=15",
      );
      expect(result).toEqual({
        freq: "MONTHLY",
        interval: 2,
        count: 5,
        byday: ["TU"],
        bymonthday: [15],
      });
    });

    it("should return null for invalid RRULE", () => {
      const result = parseRRule("INVALID");
      expect(result).toBeNull();
    });

    it("should return null for RRULE without FREQ", () => {
      const result = parseRRule("RRULE:INTERVAL=2");
      expect(result).toBeNull();
    });

    it("should filter invalid weekdays", () => {
      const result = parseRRule("RRULE:FREQ=WEEKLY;BYDAY=MO,XX,FR");
      expect(result).toEqual({
        freq: "WEEKLY",
        byday: ["MO", "FR"],
      });
    });
  });

  describe("CommonRRules helpers", () => {
    it("should generate daily RRULE", () => {
      expect(CommonRRules.daily()).toBe("RRULE:FREQ=DAILY");
    });

    it("should generate weekly RRULE", () => {
      expect(CommonRRules.weekly()).toBe("RRULE:FREQ=WEEKLY");
    });

    it("should generate every N days RRULE", () => {
      expect(CommonRRules.everyNDays(3)).toBe("RRULE:FREQ=DAILY;INTERVAL=3");
    });

    it("should generate weekday RRULE", () => {
      expect(CommonRRules.everyWeekday()).toBe(
        "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
      );
    });

    it("should generate weekend RRULE", () => {
      expect(CommonRRules.everyWeekend()).toBe("RRULE:FREQ=WEEKLY;BYDAY=SA,SU");
    });

    it("should generate specific weekday RRULE", () => {
      expect(CommonRRules.everyMonday()).toBe("RRULE:FREQ=WEEKLY;BYDAY=MO");
      expect(CommonRRules.everyFriday()).toBe("RRULE:FREQ=WEEKLY;BYDAY=FR");
    });

    it("should generate count-limited RRULE", () => {
      expect(CommonRRules.nTimes("DAILY", 5)).toBe("RRULE:FREQ=DAILY;COUNT=5");
    });

    it("should generate until-limited RRULE", () => {
      expect(CommonRRules.untilDate("WEEKLY", "20241231")).toBe(
        "RRULE:FREQ=WEEKLY;UNTIL=20241231",
      );
    });
  });
});

describe("RRULE Integration with TaskSchema", () => {
  it("should validate RRULE from buildRRule function", () => {
    const rrule = buildRRule({
      freq: RRuleFrequency.WEEKLY,
      byday: [RRuleWeekday.MO, RRuleWeekday.WE, RRuleWeekday.FR],
      count: 10,
    });

    const task = {
      title: "Test task",
      recurring: rrule,
    };

    const result = CreateTaskRequestSchema.safeParse(task);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.recurring).toBe(
        "RRULE:FREQ=WEEKLY;COUNT=10;BYDAY=MO,WE,FR",
      );
    }
  });

  it("should validate all CommonRRules patterns", () => {
    const patterns = [
      CommonRRules.daily(),
      CommonRRules.weekly(),
      CommonRRules.monthly(),
      CommonRRules.yearly(),
      CommonRRules.everyNDays(2),
      CommonRRules.everyNWeeks(3),
      CommonRRules.everyWeekday(),
      CommonRRules.everyWeekend(),
      CommonRRules.everyMonday(),
      CommonRRules.everyTuesday(),
      CommonRRules.everyWednesday(),
      CommonRRules.everyThursday(),
      CommonRRules.everyFriday(),
      CommonRRules.everySaturday(),
      CommonRRules.everySunday(),
      CommonRRules.nTimes("DAILY", 5),
      CommonRRules.untilDate("WEEKLY", "20241231"),
    ];

    patterns.forEach((pattern, index) => {
      const task = {
        title: `Test task ${index}`,
        recurring: pattern,
      };

      const result = CreateTaskRequestSchema.safeParse(task);
      expect(
        result.success,
        `Pattern ${index} should be valid: ${pattern}`,
      ).toBe(true);
    });
  });

  it("should round-trip parse and build", () => {
    const original = "RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE,FR;COUNT=10";
    const parsed = parseRRule(original);
    expect(parsed).not.toBeNull();

    if (parsed) {
      const rebuilt = buildRRule(parsed);
      const reparsed = parseRRule(rebuilt);
      expect(reparsed).toEqual(parsed);
    }
  });
});
