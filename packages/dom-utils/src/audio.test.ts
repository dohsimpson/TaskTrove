/**
 * Basic tests for audio functionality
 * Note: These tests run in happy-dom environment which simulates DOM APIs
 */

import { describe, it, expect } from "vitest";
import { SOUND_DESCRIPTIONS, playSound } from "./audio";

describe("Audio Utilities", () => {
  it("should have sound descriptions for all sound types", () => {
    expect(SOUND_DESCRIPTIONS).toBeDefined();
    expect(typeof SOUND_DESCRIPTIONS.bell).toBe("string");
    expect(typeof SOUND_DESCRIPTIONS.pop).toBe("string");
    expect(typeof SOUND_DESCRIPTIONS.success).toBe("string");
  });

  it("should export playSound function", () => {
    expect(typeof playSound).toBe("function");
  });

  it("should handle missing AudioContext gracefully", async () => {
    // In test environment without proper AudioContext, should not throw
    await expect(playSound("bell")).resolves.not.toThrow();
  });
});
