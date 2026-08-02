/**
 * A way to ask the canvas for one more frame from outside it.
 *
 * Under reduced motion the canvas runs `frameloop="demand"`: the pose is fixed,
 * so a loop would redraw an identical image sixty times a second. But the pose
 * is not the *only* thing that changes. The manifesto still recedes the
 * sculpture behind its copy, and a route change still resets it — both discrete
 * events, a handful per visit, and neither of them produces a frame on its own.
 *
 * The obvious answer is to call react-three-fiber's `invalidate` from those
 * places, and it is the wrong one: importing `@react-three/fiber` into a module
 * that the manifesto imports pulls three.js into the initial chunk, and NFR-05
 * caps that at 210 KB with three.js explicitly excluded. So the request travels
 * as a plain callback and only SceneRoot, which is already inside the lazy
 * chunk, knows what to do with it.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

/** Subscribes a renderer. Returns the unsubscribe. */
export function onSculptureRenderRequest(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Asks for one frame.
 *
 * Safe to call when nothing is listening, which is the normal case: the canvas
 * is lazily mounted and client-only, so early calls during hydration have no
 * subscriber yet. SceneRoot renders once when it subscribes for exactly that
 * reason, so a request that arrives before it existed is not lost.
 */
export function requestSculptureRender(): void {
  for (const listener of listeners) listener();
}
