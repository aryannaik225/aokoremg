/**
 * Full-bleed photographic backdrop behind the hero content. Lives absolutely
 * positioned behind the content column (edge to edge, no border/radius) and
 * fades into the page background on two edges: vertically into its own
 * bottom edge (so the chart panel below appears to float on the faded-out
 * tail rather than a visible banner edge) and horizontally from the left
 * (so the hero text/controls sit on a readable solid-to-faded wash rather
 * than directly on the photo, matching the reference layout).
 */
export function HeroBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[420px] overflow-hidden sm:h-[520px]">
      <img src="/windmill_banner_new.png" alt="" className="h-full w-full object-cover" />
      <div className="hero-overlay-left absolute inset-0" />
      <div className="hero-overlay absolute inset-0" />
    </div>
  );
}
