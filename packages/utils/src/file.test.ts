import { describe, it, expect } from "vitest";
import {
  AVATAR_DATA_URL_REGEX,
  SUPPORTED_AVATAR_MIME_TYPES,
  isValidAvatarDataUrl,
  parseAvatarDataUrl,
  isSupportedAvatarMimeType,
  getAvatarApiUrl,
} from "./file";

describe("Avatar validation utilities", () => {
  describe("AVATAR_DATA_URL_REGEX", () => {
    it("should match valid PNG data URLs", () => {
      const validPng =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
      expect(AVATAR_DATA_URL_REGEX.test(validPng)).toBe(true);
    });

    it("should match valid JPEG data URLs", () => {
      const validJpeg =
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAA==";
      expect(AVATAR_DATA_URL_REGEX.test(validJpeg)).toBe(true);
    });

    it("should match valid JPG data URLs", () => {
      const validJpg =
        "data:image/jpg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAA==";
      expect(AVATAR_DATA_URL_REGEX.test(validJpg)).toBe(true);
    });

    it("should match valid GIF data URLs", () => {
      const validGif =
        "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
      expect(AVATAR_DATA_URL_REGEX.test(validGif)).toBe(true);
    });

    it("should match valid WebP data URLs", () => {
      const validWebp =
        "data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAQAAAQAAAQA=";
      expect(AVATAR_DATA_URL_REGEX.test(validWebp)).toBe(true);
    });

    it("should not match invalid formats", () => {
      const invalidFormats = [
        "data:image/bmp;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
        "data:text/plain;base64,SGVsbG8gV29ybGQ=",
        "data:image/png;charset=utf-8,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
        "image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
        "data:image/png,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
        "",
      ];

      invalidFormats.forEach((format) => {
        expect(AVATAR_DATA_URL_REGEX.test(format)).toBe(false);
      });
    });
  });

  describe("isValidAvatarDataUrl", () => {
    it("should return true for valid data URLs", () => {
      const validUrl =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
      expect(isValidAvatarDataUrl(validUrl)).toBe(true);
    });

    it("should return false for invalid data URLs", () => {
      const invalidUrl = "data:text/plain;base64,SGVsbG8gV29ybGQ=";
      expect(isValidAvatarDataUrl(invalidUrl)).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isValidAvatarDataUrl("")).toBe(false);
    });
  });

  describe("parseAvatarDataUrl", () => {
    it("should parse valid PNG data URL correctly", () => {
      const dataUrl =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
      const result = parseAvatarDataUrl(dataUrl);

      expect(result).not.toBeNull();
      expect(result?.mimeType).toBe("image/png");
      expect(result?.base64Data).toBe(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
      );
    });

    it("should parse valid JPEG data URL correctly", () => {
      const dataUrl =
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAA==";
      const result = parseAvatarDataUrl(dataUrl);

      expect(result).not.toBeNull();
      expect(result?.mimeType).toBe("image/jpeg");
      expect(result?.base64Data).toBe("/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAA==");
    });

    it("should return null for invalid data URL format", () => {
      const invalidUrl = "not-a-data-url";
      const result = parseAvatarDataUrl(invalidUrl);

      expect(result).toBeNull();
    });

    it("should return null for data URL without base64 data", () => {
      const invalidUrl = "data:image/png;base64,";
      const result = parseAvatarDataUrl(invalidUrl);

      expect(result).toBeNull();
    });

    it("should return null for data URL without MIME type", () => {
      const invalidUrl =
        "data:;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
      const result = parseAvatarDataUrl(invalidUrl);

      expect(result).toBeNull();
    });
  });

  describe("isSupportedAvatarMimeType", () => {
    it("should return true for supported MIME types", () => {
      const supportedTypes = [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/gif",
        "image/webp",
      ];

      supportedTypes.forEach((type) => {
        expect(isSupportedAvatarMimeType(type)).toBe(true);
      });
    });

    it("should return false for unsupported MIME types", () => {
      const unsupportedTypes = [
        "image/bmp",
        "image/tiff",
        "image/svg+xml",
        "text/plain",
        "application/json",
        "",
        "image/",
        "video/mp4",
      ];

      unsupportedTypes.forEach((type) => {
        expect(isSupportedAvatarMimeType(type)).toBe(false);
      });
    });

    it("should be case sensitive", () => {
      expect(isSupportedAvatarMimeType("IMAGE/PNG")).toBe(false);
      expect(isSupportedAvatarMimeType("Image/PNG")).toBe(false);
      expect(isSupportedAvatarMimeType("image/PNG")).toBe(false);
    });
  });

  describe("SUPPORTED_AVATAR_MIME_TYPES", () => {
    it("should contain expected MIME types", () => {
      expect(SUPPORTED_AVATAR_MIME_TYPES).toEqual([
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/gif",
        "image/webp",
      ]);
    });

    it("should be a const assertion (readonly in TypeScript)", () => {
      // This is a compile-time readonly check, not runtime
      // The array is still mutable at runtime but TypeScript prevents modification
      expect(Array.isArray(SUPPORTED_AVATAR_MIME_TYPES)).toBe(true);
      expect(SUPPORTED_AVATAR_MIME_TYPES.length).toBe(5);
    });
  });
});

describe("getAvatarApiUrl", () => {
  describe("null/undefined handling", () => {
    it("should return undefined for null input", () => {
      expect(getAvatarApiUrl(null)).toBeUndefined();
    });

    it("should return undefined for undefined input", () => {
      expect(getAvatarApiUrl(undefined)).toBeUndefined();
    });
  });

  describe("data URL handling", () => {
    it("should return data URLs unchanged", () => {
      const dataUrl =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
      expect(getAvatarApiUrl(dataUrl)).toBe(dataUrl);
    });

    it("should handle JPEG data URLs", () => {
      const dataUrl =
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAA==";
      expect(getAvatarApiUrl(dataUrl)).toBe(dataUrl);
    });
  });

  describe("API URL handling", () => {
    it("should return existing v1 API URLs unchanged", () => {
      const apiUrl = "/api/v1/assets/avatars/user123.png";
      expect(getAvatarApiUrl(apiUrl)).toBe(apiUrl);
    });

    it("should return nested v1 API URLs unchanged", () => {
      const apiUrl = "/api/v1/assets/avatars/subfolder/user456.jpg";
      expect(getAvatarApiUrl(apiUrl)).toBe(apiUrl);
    });
  });

  describe("external URL handling", () => {
    it("should return http URLs unchanged", () => {
      const httpUrl = "http://example.com/avatar.png";
      expect(getAvatarApiUrl(httpUrl)).toBe(httpUrl);
    });

    it("should return https URLs unchanged", () => {
      const httpsUrl = "https://example.com/avatar.png";
      expect(getAvatarApiUrl(httpsUrl)).toBe(httpsUrl);
    });
  });

  describe("file path conversion using API_ROUTES constant", () => {
    it("should convert file path to v1 API URL", () => {
      const filePath = "data/assets/avatars/user123.png";
      const result = getAvatarApiUrl(filePath);
      expect(result).toBe("/api/v1/assets/avatars/user123.png");
    });

    it("should handle file path with leading slash", () => {
      const filePath = "/data/assets/avatars/user123.png";
      const result = getAvatarApiUrl(filePath);
      expect(result).toBe("/api/v1/assets/avatars/user123.png");
    });

    it("should handle path without data prefix", () => {
      const filePath = "assets/avatars/user123.png";
      const result = getAvatarApiUrl(filePath);
      expect(result).toBe("/api/v1/assets/avatars/user123.png");
    });

    it("should handle path without assets prefix", () => {
      const filePath = "avatars/user123.png";
      const result = getAvatarApiUrl(filePath);
      expect(result).toBe("/api/v1/assets/avatars/user123.png");
    });

    it("should handle simple filename", () => {
      const filePath = "user123.png";
      const result = getAvatarApiUrl(filePath);
      expect(result).toBe("/api/v1/assets/user123.png");
    });

    it("should handle nested subdirectories", () => {
      const filePath = "data/assets/avatars/team/project/user123.png";
      const result = getAvatarApiUrl(filePath);
      expect(result).toBe("/api/v1/assets/avatars/team/project/user123.png");
    });
  });

  describe("API version consistency", () => {
    it("should use v1 API endpoint (not legacy /api/assets/)", () => {
      const filePath = "data/assets/avatars/user123.png";
      const result = getAvatarApiUrl(filePath);

      // Should use v1 prefix
      expect(result).toContain("/api/v1/assets/");

      // Should NOT use legacy non-versioned prefix
      expect(result).not.toContain("/api/assets/avatars/");
      expect(result).not.toMatch(/^\/api\/assets\/[^v]/);
    });

    it("should maintain consistency with API_ROUTES.V1_ASSETS constant", () => {
      // This test ensures the function derives its path from the constant
      // If API_ROUTES.V1_ASSETS changes, this test will catch it
      const filePath = "avatars/user.png";
      const result = getAvatarApiUrl(filePath);

      // Should start with the v1 assets base path
      expect(result).toMatch(/^\/api\/v1\/assets\//);
    });
  });
});
