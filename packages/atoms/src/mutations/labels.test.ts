import { describe, it, expect, vi } from "vitest";
import { createLabelId } from "@tasktrove/types/id";
import { DEFAULT_LABEL_COLORS } from "@tasktrove/constants";
import { type Label } from "@tasktrove/types/core";
import { buildLabelCreatePayload } from "./labels";

vi.mock("uuid", () => ({
  v4: () => "11111111-2222-4333-8444-555555555555",
}));

describe("buildLabelCreatePayload", () => {
  it("applies defaults and avoids slug collisions", () => {
    const existingLabels: Label[] = [
      {
        id: createLabelId("99999999-9999-4999-8999-999999999999"),
        name: "Work",
        color: "#ef4444",
      },
    ];

    void existingLabels;
    const payload = buildLabelCreatePayload({ name: "Work" });

    expect(payload.id).toEqual(
      createLabelId("11111111-2222-4333-8444-555555555555"),
    );
    expect(payload.name).toBe("Work");
    expect(payload.color).toBe(DEFAULT_LABEL_COLORS[0]);
  });

  it("respects provided color without overriding", () => {
    const payload = buildLabelCreatePayload({
      name: "New Label",
      color: "#123456",
    });

    expect(payload.color).toBe("#123456");
  });

  it("builds payload with generated id and provided name", () => {
    const payload = buildLabelCreatePayload({ name: "High Priority!" });
    expect(payload.name).toBe("High Priority!");
  });
});
