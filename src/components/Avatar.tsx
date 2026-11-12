const COLOURS = [
  ["#e0e8ff", "#1b4fe0"],
  ["#dff5ea", "#15803d"],
  ["#fdeadf", "#c2410c"],
  ["#efe5ff", "#6d28d9"],
  ["#fff1d6", "#a16207"],
  ["#dff3f7", "#0e7490"],
];

export default function Avatar({ name, size = 32 }: { name: string | null | undefined; size?: number }) {
  const n = (name || "?").trim();
  let h = 0;
  for (const ch of n) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const [bg, fg] = COLOURS[h % COLOURS.length];
  const initials = n.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  return (
    <span className="avatar" style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.4 }}>
      {initials}
    </span>
  );
}
