import { describe, expect, it } from "vitest";

import { createDuckHandle } from "./duckHandle";
import { caseVoice, previewVoice, railVoice } from "./voices";

/** Counts calls, so the arithmetic can be asserted rather than reasoned about. */
function fakeEngine() {
  const calls = { duck: 0, release: 0 };
  return {
    calls,
    engine: {
      duck: () => {
        calls.duck += 1;
      },
      releaseDuck: () => {
        calls.release += 1;
      },
    },
  };
}

describe("createDuckHandle", () => {
  it("takes one duck", () => {
    const { calls, engine } = fakeEngine();
    createDuckHandle(engine as never).take();
    expect(calls).toEqual({ duck: 1, release: 0 });
  });

  it("does not stack a second take", () => {
    // The case study bug: one duck per inventory item, none released, so the
    // bed stayed 12 dB down for the session.
    const { calls, engine } = fakeEngine();
    const duck = createDuckHandle(engine as never);
    duck.take();
    duck.take();
    duck.take();
    expect(calls).toEqual({ duck: 1, release: 0 });
  });

  it("releases exactly what it took", () => {
    const { calls, engine } = fakeEngine();
    const duck = createDuckHandle(engine as never);
    duck.take();
    duck.release();
    duck.release();
    expect(calls).toEqual({ duck: 1, release: 1 });
  });

  it("releases nothing it never took", () => {
    // An unmount cleanup runs whether or not anything was ever played, and an
    // unmatched release steals a duck another component is holding.
    const { calls, engine } = fakeEngine();
    createDuckHandle(engine as never).release();
    expect(calls).toEqual({ duck: 0, release: 0 });
  });

  it("can be taken again after releasing", () => {
    const { calls, engine } = fakeEngine();
    const duck = createDuckHandle(engine as never);
    duck.take();
    duck.release();
    duck.take();
    expect(calls).toEqual({ duck: 2, release: 1 });
    expect(duck.held).toBe(true);
  });

  it("reports what it holds", () => {
    const { engine } = fakeEngine();
    const duck = createDuckHandle(engine as never);
    expect(duck.held).toBe(false);
    duck.take();
    expect(duck.held).toBe(true);
    duck.release();
    expect(duck.held).toBe(false);
  });
});

describe("voice names", () => {
  const id = "stem-kestrel";

  it("never collides with the bare id the desk owns", () => {
    for (const name of [railVoice(id), previewVoice(id), caseVoice(id)]) {
      expect(name).not.toBe(id);
    }
  });

  it("gives each borrower its own name", () => {
    const names = new Set([railVoice(id), previewVoice(id), caseVoice(id)]);
    expect(names.size).toBe(3);
  });

  it("keeps different stems apart under the same borrower", () => {
    expect(previewVoice("a")).not.toBe(previewVoice("b"));
  });
});
