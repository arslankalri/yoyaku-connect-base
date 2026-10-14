/**
 * Decorative layered background: soft radial gradients, a fine grid and slow
 * floating gradient blobs. Purely presentational and hidden from assistive
 * tech; all motion stops under prefers-reduced-motion (see styles.css).
 */
export function AIBackground() {
  return <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-background" />;
}

/** Small animated presence dot with a pulsing ring. */
export function OnlineDot({ className = "" }: { className?: string }) {
  return (
    <span className={`relative inline-flex size-2 shrink-0 ${className}`}>
      <span className="animate-ai-ring absolute inset-0 rounded-full bg-success" />
      <span className="relative size-2 rounded-full bg-success" />
    </span>
  );
}

/** Compact neural/waveform motif used next to the NAGI identity. */
export function Waveform({ active = false, bars = 5 }: { active?: boolean; bars?: number }) {
  return (
    <span aria-hidden className="flex items-end gap-[3px]">
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={`w-[3px] rounded-full bg-ai-cyan/80 ${active ? "animate-ai-wave" : ""}`}
          style={{ height: `${8 + ((i * 5) % 12)}px`, animationDelay: `${i * 110}ms` }}
        />
      ))}
    </span>
  );
}
