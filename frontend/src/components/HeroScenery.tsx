function Turbine({ x, scale = 1, opacity = 1 }: { x: number; scale?: number; opacity?: number }) {
  return (
    <g transform={`translate(${x} 0) scale(${scale})`} opacity={opacity}>
      <rect x="-1.5" y="40" width="3" height="60" fill="currentColor" />
      <g transform="translate(0 40)">
        <rect x="-1" y="-20" width="2" height="20" fill="currentColor" transform="rotate(0)" />
        <rect x="-1" y="-20" width="2" height="20" fill="currentColor" transform="rotate(120)" />
        <rect x="-1" y="-20" width="2" height="20" fill="currentColor" transform="rotate(240)" />
      </g>
    </g>
  );
}

/**
 * Decorative panoramic turbine-landscape silhouette standing in for a
 * photographic hero image (no bundled photo asset in this repo) — a single
 * SVG lets the scenery recolor cleanly between light/dark via currentColor
 * instead of swapping two large raster files.
 */
export function HeroScenery() {
  return (
    <svg
      viewBox="0 0 1200 220"
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <g className="text-slate-900/15 dark:text-white/10">
        <path d="M0 160 L120 130 L260 150 L420 115 L560 145 L720 110 L880 150 L1040 125 L1200 155 L1200 220 L0 220 Z" fill="currentColor" />
      </g>
      <g className="text-slate-900/25 dark:text-white/15">
        <Turbine x={160} scale={0.9} />
        <Turbine x={340} scale={1.15} />
        <Turbine x={560} scale={0.75} opacity={0.8} />
        <Turbine x={760} scale={1.3} />
        <Turbine x={940} scale={0.95} />
        <Turbine x={1100} scale={0.7} opacity={0.75} />
      </g>
      <g className="text-slate-900/35 dark:text-white/25">
        <path d="M0 200 L150 180 L380 195 L600 175 L850 198 L1050 182 L1200 200 L1200 220 L0 220 Z" fill="currentColor" />
      </g>
    </svg>
  );
}
