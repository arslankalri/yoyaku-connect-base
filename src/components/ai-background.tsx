/**
 * Neutral semantic workspace canvas. Purely presentational and hidden
 * from assistive technology.
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
    <span aria-hidden className="flex h-6 shrink-0 items-center gap-[3px]">
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
