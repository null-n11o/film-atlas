import { expect, it } from "vitest";
import { readAllowed, writeAllowed } from "../../src/lib/spoilers/store";
it.each([
  "{",
  "null",
  "[]",
  '{"version":2,"workIds":["w1"]}',
  '{"version":1,"workIds":[1]}',
])("fails closed for %s", (value) =>
  expect([...readAllowed({ getItem: () => value })]).toEqual([]),
);
it("survives blocked storage and round trips versioned IDs", () => {
  expect([
    ...readAllowed({
      getItem: () => {
        throw Error();
      },
    }),
  ]).toEqual([]);
  expect(
    writeAllowed(
      {
        setItem: () => {
          throw Error();
        },
      },
      new Set(["w1"]),
    ),
  ).toBe(false);
  let value = "";
  expect(
    writeAllowed(
      {
        setItem: (_, v) => {
          value = v;
        },
      },
      new Set(["w1"]),
    ),
  ).toBe(true);
  expect([...readAllowed({ getItem: () => value })]).toEqual(["w1"]);
});
