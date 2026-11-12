import { Armchair, Bike, BookOpen, CookingPot, Laptop, Package, Shirt, type LucideIcon } from "lucide-react";

// Shows the uploaded photo, or a category illustration when there isn't one.
const ART: Record<string, { Icon: LucideIcon; from: string; to: string; fg: string }> = {
  furniture: { Icon: Armchair, from: "#f3ece2", to: "#e6d8c4", fg: "#8a6a43" },
  books: { Icon: BookOpen, from: "#e6edff", to: "#cfdcff", fg: "#2f56c9" },
  electronics: { Icon: Laptop, from: "#e8eaf2", to: "#d3d8e6", fg: "#3d4766" },
  kitchen: { Icon: CookingPot, from: "#fde9df", to: "#f8d3c1", fg: "#b4532a" },
  bike: { Icon: Bike, from: "#e1f4ea", to: "#c6e9d6", fg: "#22794b" },
  clothes: { Icon: Shirt, from: "#f1e7fb", to: "#e0cff5", fg: "#7442b8" },
  other: { Icon: Package, from: "#f1f2f5", to: "#e2e5eb", fg: "#5f6b8a" },
};

export default function ItemImage({
  category,
  photoUrl,
  alt,
  iconSize = 56,
}: {
  category: string;
  photoUrl: string | null;
  alt: string;
  iconSize?: number;
}) {
  if (photoUrl) return <img className="item-img" src={photoUrl} alt={alt} />;
  const a = ART[category] ?? ART.other;
  return (
    <div className="item-art" style={{ background: `linear-gradient(135deg, ${a.from}, ${a.to})` }} aria-label={alt}>
      <a.Icon size={iconSize} strokeWidth={1.4} color={a.fg} />
    </div>
  );
}
