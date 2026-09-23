import { expect, it } from "vitest";
import { canView } from "../../src/lib/spoilers/policy";
it("requires every work permission", () => {
  expect(canView(["w1", "w2"], new Set(["w1"]))).toBe(false);
  expect(canView(["w1", "w2"], new Set(["w1", "w2"]))).toBe(true);
  expect(canView([], new Set())).toBe(true);
});
