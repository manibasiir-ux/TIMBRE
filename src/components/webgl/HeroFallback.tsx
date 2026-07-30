/**
 * The no-WebGL hero, edge case E1 and FR-10.
 *
 * The specification calls for a pre-rendered 8s VP9 / H.265 loop with an AVIF
 * poster. That footage has to be rendered from the finished sculpture, which
 * does not exist yet, so this is a CSS composition standing in for it: the same
 * palette, the same vignette, the same off-centre glow, holding the layout and
 * the art direction without pretending to be the animation.
 *
 * Replacing it means dropping the encoded files into public/video and swapping
 * this body for a <video> with the AVIF poster. The contract this component has
 * with SceneRoot — fixed, inset-0, behind the content, decorative — does not
 * change, so nothing else has to.
 */
export function HeroFallback() {
  return (
    <div className="fixed inset-0 z-0" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 55% at 52% 46%, rgb(232 255 43 / 0.10) 0%, rgb(20 20 22 / 0.85) 42%, var(--color-ground) 78%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 50%, transparent 30%, var(--color-ground-deep) 100%)",
        }}
      />
      <div className="scanlines" />
    </div>
  );
}
