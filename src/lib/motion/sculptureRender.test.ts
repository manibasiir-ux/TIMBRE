import { describe, expect, it, vi } from "vitest";

import {
  onSculptureRenderRequest,
  requestSculptureRender,
} from "./sculptureRender";

describe("sculpture render requests", () => {
  it("does nothing when the canvas is not mounted", () => {
    // The canvas is lazy and client-only, so requests during hydration arrive
    // before anything is listening. Throwing there would break the page for a
    // frame nobody needed.
    expect(() => requestSculptureRender()).not.toThrow();
  });

  it("notifies a subscriber", () => {
    const render = vi.fn();
    const stop = onSculptureRenderRequest(render);

    requestSculptureRender();
    expect(render).toHaveBeenCalledTimes(1);

    stop();
  });

  it("stops notifying after unsubscribe", () => {
    // SceneRoot unmounts on a profile step-down to the fallback. A retained
    // listener would keep invalidating a canvas that no longer exists.
    const render = vi.fn();
    const stop = onSculptureRenderRequest(render);
    stop();

    requestSculptureRender();
    expect(render).not.toHaveBeenCalled();
  });

  it("survives a listener unsubscribing twice", () => {
    const render = vi.fn();
    const stop = onSculptureRenderRequest(render);
    stop();
    expect(() => stop()).not.toThrow();

    requestSculptureRender();
    expect(render).not.toHaveBeenCalled();
  });

  it("notifies every subscriber", () => {
    const first = vi.fn();
    const second = vi.fn();
    const stopFirst = onSculptureRenderRequest(first);
    const stopSecond = onSculptureRenderRequest(second);

    requestSculptureRender();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);

    stopFirst();
    stopSecond();
  });

  it("coalesces a repeated subscription rather than double-rendering", () => {
    // A Set, not an array: React's development double-invoke can subscribe the
    // same callback twice, and rendering twice per request is waste on the one
    // path that exists to avoid waste.
    const render = vi.fn();
    const stopA = onSculptureRenderRequest(render);
    const stopB = onSculptureRenderRequest(render);

    requestSculptureRender();
    expect(render).toHaveBeenCalledTimes(1);

    stopA();
    stopB();
  });
});
