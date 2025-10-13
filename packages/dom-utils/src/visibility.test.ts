import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  registerVisibilityHandler,
  registerRefreshHandler,
  getCurrentDateString,
} from "./visibility";

describe("visibility utilities", () => {
  describe("getCurrentDateString", () => {
    it("returns date in YYYY-MM-DD format", () => {
      const dateString = getCurrentDateString();
      expect(dateString).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("returns current date", () => {
      // Use fake timers to ensure consistent date
      vi.useFakeTimers();
      const testDate = new Date("2025-01-15T12:00:00Z");
      vi.setSystemTime(testDate);

      const expected = testDate.toISOString().split("T")[0];
      const result = getCurrentDateString();
      expect(result).toBe(expected);

      vi.useRealTimers();
    });
  });

  describe("registerVisibilityHandler", () => {
    let mockCallback: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockCallback = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("registers visibility change listener", () => {
      const addEventListenerSpy = vi.spyOn(document, "addEventListener");

      registerVisibilityHandler(mockCallback);

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "visibilitychange",
        expect.any(Function),
      );
    });

    it("calls callback with false when document becomes hidden", () => {
      registerVisibilityHandler(mockCallback);

      // Simulate document becoming hidden
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => true,
      });

      const event = new Event("visibilitychange");
      document.dispatchEvent(event);

      expect(mockCallback).toHaveBeenCalledWith(false);
    });

    it("calls callback with true when document becomes visible", () => {
      registerVisibilityHandler(mockCallback);

      // Simulate document becoming visible
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => false,
      });

      const event = new Event("visibilitychange");
      document.dispatchEvent(event);

      expect(mockCallback).toHaveBeenCalledWith(true);
    });

    it("returns cleanup function that removes listener", () => {
      const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

      const cleanup = registerVisibilityHandler(mockCallback);
      cleanup();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "visibilitychange",
        expect.any(Function),
      );
    });

    it("stops calling callback after cleanup", () => {
      const cleanup = registerVisibilityHandler(mockCallback);
      cleanup();

      // Simulate visibility change after cleanup
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => false,
      });

      const event = new Event("visibilitychange");
      document.dispatchEvent(event);

      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe("registerRefreshHandler", () => {
    let mockOnRefresh: ReturnType<typeof vi.fn>;
    let cleanup: (() => void) | null = null;

    beforeEach(() => {
      mockOnRefresh = vi.fn();
      cleanup = null;
      // Reset document.hidden to false
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => false,
      });
    });

    afterEach(() => {
      if (cleanup) {
        cleanup();
        cleanup = null;
      }
      vi.restoreAllMocks();
    });

    it("calls onRefresh when day changes via visibilitychange", () => {
      // Use fake timers to simulate day change
      vi.useFakeTimers();
      const baseDate = new Date("2025-01-01T10:00:00Z");
      vi.setSystemTime(baseDate);

      cleanup = registerRefreshHandler({ checkDayChange: true }, mockOnRefresh);

      // Advance time to next day
      vi.setSystemTime(new Date("2025-01-02T10:00:00Z"));

      // Simulate page becoming visible
      const event = new Event("visibilitychange");
      document.dispatchEvent(event);

      expect(mockOnRefresh).toHaveBeenCalledOnce();

      vi.useRealTimers();
    });

    it("does not call onRefresh when day has not changed", () => {
      cleanup = registerRefreshHandler({ checkDayChange: true }, mockOnRefresh);

      // Simulate page becoming visible
      const event = new Event("visibilitychange");
      document.dispatchEvent(event);

      expect(mockOnRefresh).not.toHaveBeenCalled();
    });

    it("calls onRefresh when custom check returns true", () => {
      const customCheck = vi.fn(() => true);

      cleanup = registerRefreshHandler({ customCheck }, mockOnRefresh);

      // Simulate page becoming visible
      const event = new Event("visibilitychange");
      document.dispatchEvent(event);

      expect(customCheck).toHaveBeenCalled();
      expect(mockOnRefresh).toHaveBeenCalledOnce();
    });

    it("does not call onRefresh when custom check returns false", () => {
      const customCheck = vi.fn(() => false);

      cleanup = registerRefreshHandler({ customCheck }, mockOnRefresh);

      // Simulate page becoming visible
      const event = new Event("visibilitychange");
      document.dispatchEvent(event);

      expect(customCheck).toHaveBeenCalled();
      expect(mockOnRefresh).not.toHaveBeenCalled();
    });

    it("calls onRefresh when any condition is met", () => {
      const customCheck = vi.fn(() => true);

      cleanup = registerRefreshHandler(
        { checkDayChange: true, customCheck },
        mockOnRefresh,
      );

      // Simulate page becoming visible
      const event = new Event("visibilitychange");
      document.dispatchEvent(event);

      expect(mockOnRefresh).toHaveBeenCalledOnce();
    });

    it("does not check conditions when page is hidden (visibilitychange)", () => {
      const customCheck = vi.fn(() => true);

      cleanup = registerRefreshHandler({ customCheck }, mockOnRefresh);

      // Simulate page becoming hidden
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => true,
      });

      const event = new Event("visibilitychange");
      document.dispatchEvent(event);

      expect(customCheck).not.toHaveBeenCalled();
      expect(mockOnRefresh).not.toHaveBeenCalled();
    });

    it("calls onRefresh on window focus event", () => {
      const customCheck = vi.fn(() => true);

      cleanup = registerRefreshHandler({ customCheck }, mockOnRefresh);

      // Simulate window gaining focus
      const event = new Event("focus");
      window.dispatchEvent(event);

      expect(customCheck).toHaveBeenCalled();
      expect(mockOnRefresh).toHaveBeenCalledOnce();
    });

    it("calls onRefresh on pageshow event", () => {
      const customCheck = vi.fn(() => true);

      cleanup = registerRefreshHandler({ customCheck }, mockOnRefresh);

      // Simulate page show (e.g., back from bfcache)
      const event = new PageTransitionEvent("pageshow", { persisted: true });
      window.dispatchEvent(event);

      expect(customCheck).toHaveBeenCalled();
      expect(mockOnRefresh).toHaveBeenCalledOnce();
    });

    it("returns cleanup function that removes all listeners", () => {
      const removeDocEventListenerSpy = vi.spyOn(
        document,
        "removeEventListener",
      );
      const removeWinEventListenerSpy = vi.spyOn(window, "removeEventListener");

      cleanup = registerRefreshHandler({ checkDayChange: true }, mockOnRefresh);
      cleanup();

      expect(removeDocEventListenerSpy).toHaveBeenCalledWith(
        "visibilitychange",
        expect.any(Function),
      );
      expect(removeWinEventListenerSpy).toHaveBeenCalledWith(
        "focus",
        expect.any(Function),
      );
      expect(removeWinEventListenerSpy).toHaveBeenCalledWith(
        "pageshow",
        expect.any(Function),
      );

      cleanup = null; // Already cleaned up
    });

    it("stops calling onRefresh after cleanup", () => {
      const customCheck = vi.fn(() => true);

      cleanup = registerRefreshHandler({ customCheck }, mockOnRefresh);
      cleanup();
      cleanup = null; // Already cleaned up

      // Try all three event types
      const visibilityEvent = new Event("visibilitychange");
      document.dispatchEvent(visibilityEvent);

      const focusEvent = new Event("focus");
      window.dispatchEvent(focusEvent);

      const pageshowEvent = new PageTransitionEvent("pageshow", {
        persisted: true,
      });
      window.dispatchEvent(pageshowEvent);

      expect(mockOnRefresh).not.toHaveBeenCalled();
    });
  });
});
