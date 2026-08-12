export function AvatarSvg({ seed, name }: { seed: number; name: string }) {
  const strokes = ["#1a1a1a", "#222", "#111"];
  const stroke = strokes[seed % strokes.length];
  // simple unique-ish line faces
  const variants = [
    // round glasses
    <>
      <circle cx="50" cy="48" r="28" fill="none" stroke={stroke} strokeWidth="2.5" />
      <circle cx="40" cy="45" r="7" fill="none" stroke={stroke} strokeWidth="2" />
      <circle cx="60" cy="45" r="7" fill="none" stroke={stroke} strokeWidth="2" />
      <path d="M47 45h6" stroke={stroke} strokeWidth="2" />
      <path d="M38 62c4 6 20 6 24 0" fill="none" stroke={stroke} strokeWidth="2" />
      <path d="M35 28c5-10 25-10 30 0" fill="none" stroke={stroke} strokeWidth="2.5" />
    </>,
    // short hair
    <>
      <circle cx="50" cy="50" r="28" fill="none" stroke={stroke} strokeWidth="2.5" />
      <path d="M28 48c2-22 42-22 44 0" fill="none" stroke={stroke} strokeWidth="2.5" />
      <circle cx="40" cy="48" r="2.5" fill={stroke} />
      <circle cx="60" cy="48" r="2.5" fill={stroke} />
      <path d="M42 62c3 5 13 5 16 0" fill="none" stroke={stroke} strokeWidth="2" />
    </>,
    // curly
    <>
      <circle cx="50" cy="52" r="26" fill="none" stroke={stroke} strokeWidth="2.5" />
      <path d="M30 42c0-8 4-16 10-18M40 24c6-4 14-4 20 0M60 24c6 2 10 10 10 18" fill="none" stroke={stroke} strokeWidth="2.5" />
      <circle cx="41" cy="50" r="2.5" fill={stroke} />
      <circle cx="59" cy="50" r="2.5" fill={stroke} />
      <path d="M44 64h12" stroke={stroke} strokeWidth="2" />
    </>,
    // beard hint
    <>
      <circle cx="50" cy="46" r="26" fill="none" stroke={stroke} strokeWidth="2.5" />
      <circle cx="40" cy="44" r="2.5" fill={stroke} />
      <circle cx="60" cy="44" r="2.5" fill={stroke} />
      <path d="M36 58c6 14 22 14 28 0" fill="none" stroke={stroke} strokeWidth="2" />
      <path d="M42 58c3 6 13 6 16 0" fill="none" stroke={stroke} strokeWidth="2" />
      <path d="M32 34c8-14 28-14 36 0" fill="none" stroke={stroke} strokeWidth="2.5" />
    </>,
    // ponytail
    <>
      <circle cx="50" cy="50" r="26" fill="none" stroke={stroke} strokeWidth="2.5" />
      <path d="M68 40c10 2 12 18 4 24" fill="none" stroke={stroke} strokeWidth="2.5" />
      <circle cx="41" cy="48" r="2.5" fill={stroke} />
      <circle cx="59" cy="48" r="2.5" fill={stroke} />
      <path d="M43 63c3 4 11 4 14 0" fill="none" stroke={stroke} strokeWidth="2" />
      <path d="M30 42c4-16 36-16 40 0" fill="none" stroke={stroke} strokeWidth="2.5" />
    </>,
    // cap
    <>
      <circle cx="50" cy="52" r="26" fill="none" stroke={stroke} strokeWidth="2.5" />
      <path d="M28 44h44c-2-14-14-22-22-22S30 30 28 44z" fill="none" stroke={stroke} strokeWidth="2.5" />
      <path d="M26 44h48" stroke={stroke} strokeWidth="2.5" />
      <circle cx="41" cy="54" r="2.5" fill={stroke} />
      <circle cx="59" cy="54" r="2.5" fill={stroke} />
      <path d="M44 66c2 3 10 3 12 0" fill="none" stroke={stroke} strokeWidth="2" />
    </>,
  ];
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" role="img" aria-label={name}>
      <circle cx="50" cy="50" r="48" fill="#f3f3f3" stroke="#d4d4d4" strokeWidth="2" />
      {variants[seed % variants.length]}
    </svg>
  );
}