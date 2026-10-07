// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { frames, host, observers, pending, seen } from "./dom";
import { register } from "../src/core/stage";

describe("register", () => {
  it("two boards on one stage both see it, and both sleep and wake with it", () => {
    const el = host();
    const a = vi.fn(() => true), b = vi.fn(() => true);
    const ra = register(el, a), rb = register(el, b);
    frames(3);
    expect(a.mock.calls.length).toBeGreaterThan(1);
    expect(b.mock.calls.length).toBeGreaterThan(1);

    seen(el, false);
    const na = a.mock.calls.length, nb = b.mock.calls.length;
    frames(3);
    expect(a.mock.calls.length).toBe(na);
    expect(b.mock.calls.length).toBe(nb);

    seen(el, true);
    frames(3);
    expect(a.mock.calls.length).toBeGreaterThan(na);
    expect(b.mock.calls.length).toBeGreaterThan(nb);

    ra.unregister();
    rb.unregister();
    expect(pending()).toBe(0);
  });

  it("watches the stage until its last board leaves", () => {
    const el = host(), other = host();
    const keep = register(other, () => false);
    const ra = register(el, () => false), rb = register(el, () => false);
    const o = [...observers][0];
    expect(o.targets.has(el)).toBe(true);
    ra.unregister();
    expect(o.targets.has(el)).toBe(true);
    rb.unregister();
    expect(o.targets.has(el)).toBe(false);
    keep.unregister();
  });
});
