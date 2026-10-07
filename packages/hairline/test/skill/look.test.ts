import { describe, expect, it } from "vitest";
import { moved, stops, tourLine } from "../../../../skills/hairline-create/look.mjs";

/** moved: the pixels inked in one picture and not the other, over the rest picture's ink. */
it("is nothing when the two pictures are the same", () => {
  expect(moved([1, 1, 0, 0], [1, 1, 0, 0])).toBe(0);
});

it("counts ink that left and ink that arrived", () => {
  expect(moved([1, 1, 0, 0], [1, 0, 1, 0])).toBe(1);
  expect(moved([1, 1, 1, 1], [1, 1, 1, 0])).toBe(0.25);
});

it("is nothing for a rest picture with no ink, not a division by zero", () => {
  expect(moved([0, 0], [0, 1])).toBe(0);
});

it("is nothing when only a stroke's colour changed: the ink is where it was", () => {
  const sameInk = [0, 1, 1, 0];
  expect(moved(sameInk, sameInk.slice())).toBe(0);
});

const frame = (stop: number | null, read: string, svg: string) => ({ stop, read, svg });

describe("stops", () => {
  it("groups the frames by the stop they follow, and reads whether the drawing held still before the next", () => {
    const got = stops([
      frame(0, "cell 2·6", "a"), frame(null, "cell 2·6", "b"), frame(null, "cell 2·6", "b"),
      frame(1, "cell 4·6", "c"), frame(null, "cell 4·6", "d"), frame(null, "cell 4·6", "e"),
      frame(2, "rest", "f"), frame(null, "rest", "f"),
    ]);
    expect(got).toEqual([
      { index: 0, read: "cell 2·6", held: true },
      { index: 1, read: "cell 4·6", held: false },
      { index: 2, read: "rest", held: true },
    ]);
  });

  it("a stop with a single frame counts as held", () => {
    expect(stops([frame(0, "x", "a")])).toEqual([{ index: 0, read: "x", held: true }]);
  });
});

describe("tourLine", () => {
  const tour = [[128, 150], [272, 150], [200, 206], null];
  it("passes when every point answers and holds, and names each stop's read-out", () => {
    const r = tourLine([
      { index: 0, read: "cell 2·6", held: true }, { index: 1, read: "cell 4·6", held: true },
      { index: 2, read: "cell 3·7", held: true }, { index: 3, read: "rest", held: true },
    ], tour);
    expect(r.ok).toBe(true);
    expect(r.line).toBe('14 tour: ok. Every stop answers and holds still. stop 0 "cell 2·6", stop 1 "cell 4·6", stop 2 "cell 3·7", stop 3 "rest".');
  });
  it("fails when no stop was reached", () => {
    const r = tourLine([], tour);
    expect(r.ok).toBe(false);
    expect(r.line).toMatch(/^14 tour: fail\. No stop was reached/);
  });
  it("fails when a point leaves the read-out at rest", () => {
    const r = tourLine([{ index: 0, read: "rest", held: true }, { index: 1, read: "cell 4·6", held: true }], tour);
    expect(r.ok).toBe(false);
    expect(r.line).toBe('14 tour: fail. Stop 0 leaves the read-out at "rest": the figure does not answer there.');
  });
  it("fails when the drawing never holds still at a stop", () => {
    const r = tourLine([{ index: 0, read: "cell 2·6", held: false }], tour);
    expect(r.ok).toBe(false);
    expect(r.line).toBe("14 tour: fail. The drawing never held still at stop 0 before the next stop began: it does not settle within the dwell.");
  });
  it("a null stop may read rest", () => {
    expect(tourLine([{ index: 3, read: "rest", held: true }], tour).ok).toBe(true);
  });
});
