/* @vitest-environment jsdom */

import React from "react";
import { renderHook } from "@testing-library/react";
import i18next from "i18next";
import { describe, expect, beforeEach, it } from "vitest";
import { LanguageProvider, useLanguage } from "./LanguageProvider";
import type { I18nConfig } from "../types";

const config: I18nConfig<"en", "task"> = {
  languages: ["en"],
  namespaces: ["task"],
  fallbackLng: "en",
  defaultNS: "task",
  resourceLoader: async () => ({}),
};

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <LanguageProvider config={config} initialLanguage="en">
    {children}
  </LanguageProvider>
);

describe("LanguageProvider translation helper", () => {
  beforeEach(async () => {
    await i18next.init({
      lng: "en",
      fallbackLng: "en",
      defaultNS: "task",
      ns: ["task"],
      resources: {
        en: {
          task: {
            labels: { createLabel: 'Create "{{name}}"' },
            comments: { title: "Comments ({{count}})" },
          },
        },
      },
    });
  });

  it("interpolates values when options are provided", () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });

    expect(
      result.current.t("labels.createLabel", 'Create "{{name}}"', {
        name: "Work",
      }),
    ).toBe('Create "Work"');
  });

  it("uses defaultValue and count fallback", () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });

    expect(
      result.current.t("comments.missingKey", "Comments ({{count}})", {
        count: 3,
      }),
    ).toBe("Comments (3)");
  });
});
