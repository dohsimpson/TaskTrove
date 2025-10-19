import "@repo/vitest-config/base";

export default {
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
};
