import React from "react";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  Line,
  Path,
  Pattern,
  Polygon,
  Rect,
} from "react-native-svg";

// ─── Color utilities ──────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, string> = {
  white: "#F2F2F0",
  "off white": "#F5F0DC",
  cream: "#F5EDD8",
  ivory: "#FFFFF0",
  black: "#1C1C1C",
  grey: "#909090",
  gray: "#909090",
  "light grey": "#C8C8C8",
  "light gray": "#C8C8C8",
  "dark grey": "#505050",
  "dark gray": "#505050",
  charcoal: "#3C3C3C",
  silver: "#C0C0C0",
  red: "#CC2222",
  "dark red": "#8B0000",
  maroon: "#800020",
  burgundy: "#7C2040",
  crimson: "#DC143C",
  blue: "#2255CC",
  navy: "#1A2A5C",
  "navy blue": "#1A2A5C",
  "light blue": "#6EA8D8",
  "sky blue": "#87CEEB",
  cobalt: "#0047AB",
  "royal blue": "#4169E1",
  denim: "#1560BD",
  "light denim": "#6A8EAE",
  "dark denim": "#1A3A5C",
  "baby blue": "#89CFF0",
  green: "#2D7D3A",
  "dark green": "#1A4A22",
  olive: "#6B7C3A",
  "olive green": "#6B7C3A",
  "forest green": "#228B22",
  sage: "#8FAF7A",
  mint: "#A8D8A8",
  khaki: "#C3B091",
  beige: "#D4C4A0",
  tan: "#C8A882",
  sand: "#C8B89A",
  camel: "#C19A6B",
  brown: "#8B5E3C",
  chocolate: "#7B3F00",
  pink: "#E87090",
  "light pink": "#FFB6C1",
  "hot pink": "#FF69B4",
  blush: "#DE8B9F",
  rose: "#C06080",
  mauve: "#A08090",
  purple: "#7B3FBE",
  lavender: "#B89FD8",
  violet: "#9040C0",
  plum: "#8E4585",
  yellow: "#E8C53A",
  mustard: "#DFAF2C",
  gold: "#CCA820",
  orange: "#E87832",
  rust: "#B7410E",
  coral: "#FF6B5B",
  salmon: "#FA8072",
  peach: "#FFCBA4",
  teal: "#2A8A8A",
  cyan: "#00BCD4",
  turquoise: "#40C0B0",
  indigo: "#4B0082",
  stone: "#B0A090",
  champagne: "#F7E7CE",
  camo: "#4A5C2A",
  "camo green": "#4A5C2A",
};

function parseColor(colorStr: string): string {
  const n = colorStr.toLowerCase().trim();
  if (n.includes("camo")) return COLOR_MAP["camo"];
  if (COLOR_MAP[n]) return COLOR_MAP[n];
  for (const [key, hex] of Object.entries(COLOR_MAP)) {
    if (n.includes(key)) return hex;
  }
  return "#888888";
}

function darken(hex: string, amount = 0.25): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const f = 1 - amount;
  return `#${Math.round(r * f).toString(16).padStart(2, "0")}${Math.round(g * f).toString(16).padStart(2, "0")}${Math.round(b * f).toString(16).padStart(2, "0")}`;
}

function lighten(hex: string, amount = 0.3): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `#${Math.round(r + (255 - r) * amount).toString(16).padStart(2, "0")}${Math.round(g + (255 - g) * amount).toString(16).padStart(2, "0")}${Math.round(b + (255 - b) * amount).toString(16).padStart(2, "0")}`;
}

// ─── Camo pattern ─────────────────────────────────────────────────────────────

const CamoPattern = ({ id }: { id: string }) => (
  <Defs>
    <Pattern id={id} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
      <Rect width="40" height="40" fill="#4A5C2A" />
      <Path d="M0,6 L16,0 L22,14 L8,20 Z" fill="#2A3A18" />
      <Path d="M22,22 L40,16 L40,32 L24,38 Z" fill="#3A5020" />
      <Path d="M0,26 L14,22 L16,36 L0,40 Z" fill="#2A3A18" />
      <Circle cx="32" cy="8" r="6" fill="#1E2E12" />
      <Circle cx="10" cy="32" r="5" fill="#5A7030" />
    </Pattern>
  </Defs>
);

// ─── Shape components ─────────────────────────────────────────────────────────

function TShirtIcon({ fill, dark }: { fill: string; dark: string }) {
  return (
    <>
      {/* Body + sleeves — Apple-emoji style: diagonal sleeves, round neckline */}
      <Path
        d="M 33,16 Q 50,30 67,16 L 80,14 L 98,30 L 92,50 L 76,46 L 76,92 L 24,92 L 24,46 L 8,50 L 2,30 L 20,14 Z"
        fill={fill}
      />
      {/* Round neckline opening */}
      <Path
        d="M 33,16 Q 50,30 67,16 Q 50,24 33,16 Z"
        fill={dark}
        opacity={0.4}
      />
    </>
  );
}

function PoloIcon({ fill, dark }: { fill: string; dark: string }) {
  return (
    <>
      <Path
        d="M 33,16 L 45,16 L 50,32 L 55,16 L 67,16 L 80,14 L 98,30 L 92,50 L 76,46 L 76,92 L 24,92 L 24,46 L 8,50 L 2,30 L 20,14 Z"
        fill={fill}
      />
      {/* Left collar piece */}
      <Polygon points="33,10 45,16 50,32 38,24" fill={dark} opacity={0.4} />
      {/* Right collar piece */}
      <Polygon points="67,10 55,16 50,32 62,24" fill={dark} opacity={0.4} />
    </>
  );
}

function HoodieIcon({ fill, dark }: { fill: string; dark: string }) {
  return (
    <>
      {/* Hood */}
      <Path
        d="M 22,24 Q 20,4 50,2 Q 80,4 78,24 L 70,22 Q 50,14 30,22 Z"
        fill={fill}
      />
      {/* Body + sleeves */}
      <Path
        d="M 33,16 Q 50,30 67,16 L 80,14 L 98,30 L 92,50 L 76,46 L 76,92 L 24,92 L 24,46 L 8,50 L 2,30 L 20,14 Z"
        fill={fill}
      />
      {/* Hood opening / neckline */}
      <Path
        d="M 33,16 Q 50,30 67,16 Q 50,24 33,16 Z"
        fill={dark}
        opacity={0.3}
      />
      {/* Kangaroo pocket */}
      <Rect x="32" y="68" width="36" height="16" rx="4" fill={dark} opacity={0.25} />
    </>
  );
}

function TankTopIcon({ fill, dark }: { fill: string; dark: string }) {
  return (
    <>
      {/* Straps */}
      <Rect x="33" y="0" width="10" height="24" rx="5" fill={fill} />
      <Rect x="57" y="0" width="10" height="24" rx="5" fill={fill} />
      {/* Body */}
      <Path
        d="M 38,20 Q 50,30 62,20 L 70,90 L 30,90 Z"
        fill={fill}
      />
      {/* Neckline */}
      <Path
        d="M 38,20 Q 50,30 62,20 Q 50,26 38,20 Z"
        fill={dark}
        opacity={0.3}
      />
    </>
  );
}

function PantsIcon({ fill, dark }: { fill: string; dark: string }) {
  return (
    <>
      {/* Waistband */}
      <Rect x="12" y="4" width="76" height="14" rx="3" fill={dark} opacity={0.5} />
      {/* Left leg */}
      <Path d="M 12,14 L 48,14 L 46,94 L 18,94 Z" fill={fill} />
      {/* Right leg */}
      <Path d="M 52,14 L 88,14 L 82,94 L 54,94 Z" fill={fill} />
      {/* Crotch seam */}
      <Path d="M 48,14 Q 50,42 52,14" stroke={dark} strokeWidth="2" fill="none" opacity={0.5} />
    </>
  );
}

function ShortsIcon({ fill, dark }: { fill: string; dark: string }) {
  return (
    <>
      {/* Waistband */}
      <Rect x="12" y="4" width="76" height="12" rx="3" fill={dark} opacity={0.5} />
      {/* Left leg */}
      <Path d="M 12,14 L 48,14 L 46,66 L 18,66 Z" fill={fill} />
      {/* Right leg */}
      <Path d="M 52,14 L 88,14 L 82,66 L 54,66 Z" fill={fill} />
      {/* Crotch seam */}
      <Path d="M 48,14 Q 50,38 52,14" stroke={dark} strokeWidth="2" fill="none" opacity={0.5} />
    </>
  );
}

function JacketIcon({ fill, dark, light }: { fill: string; dark: string; light: string }) {
  return (
    <>
      {/* Body + sleeves */}
      <Path
        d="M 30,22 L 20,22 L 0,12 L 0,44 L 20,46 L 20,90 L 80,90 L 80,46 L 100,44 L 100,12 L 80,22 L 70,22 L 50,50 L 30,22 Z"
        fill={fill}
      />
      {/* Left lapel */}
      <Polygon points="20,22 30,22 50,50 20,52" fill={dark} opacity={0.35} />
      {/* Right lapel */}
      <Polygon points="80,22 70,22 50,50 80,52" fill={dark} opacity={0.35} />
      {/* Center front line */}
      <Line x1="50" y1="50" x2="50" y2="90" stroke={dark} strokeWidth="1.5" opacity={0.5} />
      {/* Pocket left */}
      <Rect x="22" y="66" width="20" height="14" rx="3" stroke={dark} strokeWidth="1.5" fill="none" opacity={0.5} />
      {/* Pocket right */}
      <Rect x="58" y="66" width="20" height="14" rx="3" stroke={dark} strokeWidth="1.5" fill="none" opacity={0.5} />
    </>
  );
}

function SneakerIcon({ fill, dark, light }: { fill: string; dark: string; light: string }) {
  return (
    <>
      <Rect x="5" y="44" width="91" height="10" rx="4" fill="#E6E6E6" />
      <Rect x="5" y="54" width="91" height="5" rx="3" fill={darken(fill, 0.55)} />
      <Path d="M 5,44 L 5,24 Q 8,12 22,12 Q 50,8 70,12 Q 88,14 96,34 L 96,44 Z" fill={fill} />
      <Path d="M 5,44 L 5,24 Q 8,12 22,12 L 18,20 Q 12,24 10,32 L 10,44 Z" fill={dark} opacity={0.25} />
      <Rect x="24" y="12" width="14" height="30" rx="3" fill={light} opacity={0.92} />
      <Line x1="24" y1="18" x2="65" y2="14" stroke="#FFFFFF" strokeWidth="2.5" opacity={0.95} />
      <Line x1="24" y1="25" x2="67" y2="21" stroke="#FFFFFF" strokeWidth="2.5" opacity={0.95} />
      <Line x1="24" y1="32" x2="67" y2="28" stroke="#FFFFFF" strokeWidth="2.5" opacity={0.95} />
      <Line x1="24" y1="40" x2="38" y2="40" stroke="#FFFFFF" strokeWidth="2" opacity={0.9} />
      <Path d="M 82,16 Q 97,28 96,44 L 80,44 Q 82,30 78,20 Z" fill={light} opacity={0.22} />
      <Path d="M 22,40 Q 56,34 92,42" stroke={dark} strokeWidth="1.5" fill="none" opacity={0.3} />
    </>
  );
}

function SandalIcon({ fill }: { fill: string }) {
  const strap    = darken(fill, 0.45);
  const soleEdge = darken(fill, 0.28);
  return (
    <>
      <Ellipse cx="50" cy="51" rx="44" ry="12" fill={soleEdge} />
      <Ellipse cx="50" cy="45" rx="44" ry="12" fill={fill} />
      <Path d="M 62,42 Q 78,34 90,26" stroke={strap} strokeWidth="10" fill="none" strokeLinecap="round" />
      <Path d="M 62,42 Q 38,36 16,36" stroke={strap} strokeWidth="10" fill="none" strokeLinecap="round" />
      <Path d="M 62,42 Q 38,52 16,54" stroke={strap} strokeWidth="10" fill="none" strokeLinecap="round" />
    </>
  );
}

function LoaferIcon({ fill, dark, light }: { fill: string; dark: string; light: string }) {
  return (
    <>
      <Path d="M 5,28 L 5,58 L 22,58 L 22,34 Z" fill={darken(fill, 0.54)} />
      <Rect x="5" y="54" width="92" height="5" rx="2" fill={darken(fill, 0.5)} />
      <Path d="M 5,50 L 5,28 Q 8,14 24,14 Q 52,10 76,18 Q 92,28 97,42 L 97,50 Z" fill={fill} />
      <Rect x="5" y="50" width="92" height="4" rx="0" fill={darken(fill, 0.3)} opacity={0.45} />
      <Path d="M 82,22 Q 97,34 97,48 L 82,48 Q 82,36 78,26 Z" fill={light} opacity={0.18} />
      <Path d="M 28,16 Q 54,4 80,14 L 78,32 Q 54,18 30,30 Z" fill={darken(fill, 0.3)} />
      <Path d="M 28,16 Q 54,4 80,14" stroke={light} strokeWidth="1.5" fill="none" opacity={0.38} strokeDasharray="3,2" />
      <Path d="M 30,30 Q 54,18 78,32" stroke={light} strokeWidth="1.5" fill="none" opacity={0.38} strokeDasharray="3,2" />
      <Rect x="46" y="5" width="16" height="12" rx="2" fill={darken(fill, 0.58)} />
      <Path d="M 22,40 Q 58,34 90,42" stroke={dark} strokeWidth="1.5" fill="none" opacity={0.28} />
    </>
  );
}

function CoatIcon({ fill, dark }: { fill: string; dark: string }) {
  return (
    <>
      {/* Body + long sleeves */}
      <Path
        d="M 30,22 L 18,22 L 0,10 L 0,46 L 18,48 L 18,96 L 82,96 L 82,48 L 100,46 L 100,10 L 82,22 L 70,22 L 50,54 L 30,22 Z"
        fill={fill}
      />
      {/* Lapels */}
      <Polygon points="18,22 30,22 50,54 18,58" fill={dark} opacity={0.35} />
      <Polygon points="82,22 70,22 50,54 82,58" fill={dark} opacity={0.35} />
      {/* Buttons */}
      <Circle cx="50" cy="66" r="3" fill={dark} opacity={0.6} />
      <Circle cx="50" cy="78" r="3" fill={dark} opacity={0.6} />
      <Circle cx="50" cy="90" r="3" fill={dark} opacity={0.6} />
    </>
  );
}

function BootIcon({ fill, dark }: { fill: string; dark: string }) {
  return (
    <>
      {/* Shaft */}
      <Rect x="28" y="5" width="44" height="54" rx="6" fill={fill} />
      {/* Foot */}
      <Path d="M 26,54 L 26,74 Q 26,82 36,84 L 84,84 Q 92,82 92,74 L 92,62 L 72,58 L 72,54 Z" fill={fill} />
      {/* Sole */}
      <Path d="M 24,74 L 94,74 Q 96,82 90,86 L 26,86 Q 20,82 24,74 Z" fill={darken(fill, 0.4)} />
      {/* Boot top fold */}
      <Rect x="28" y="5" width="44" height="8" rx="4" fill={dark} opacity={0.2} />
      {/* Lace guides */}
      <Line x1="38" y1="20" x2="62" y2="20" stroke={dark} strokeWidth="2" opacity={0.4} />
      <Line x1="38" y1="30" x2="62" y2="30" stroke={dark} strokeWidth="2" opacity={0.4} />
      <Line x1="38" y1="40" x2="62" y2="40" stroke={dark} strokeWidth="2" opacity={0.4} />
    </>
  );
}

function HatIcon({ fill, dark }: { fill: string; dark: string }) {
  return (
    <>
      {/* Crown */}
      <Path d="M 12,48 Q 12,14 50,12 Q 88,14 88,48 Z" fill={fill} />
      {/* Band */}
      <Rect x="12" y="44" width="76" height="10" rx="2" fill={dark} opacity={0.4} />
      {/* Brim */}
      <Ellipse cx="50" cy="56" rx="44" ry="8" fill={darken(fill, 0.15)} />
    </>
  );
}

function BeltIcon({ fill, dark }: { fill: string; dark: string }) {
  return (
    <>
      {/* Strap */}
      <Rect x="2" y="40" width="96" height="20" rx="6" fill={fill} />
      {/* Buckle frame */}
      <Rect x="36" y="34" width="28" height="32" rx="4" fill="#888888" />
      {/* Buckle inner */}
      <Rect x="40" y="38" width="20" height="24" rx="3" fill="#666666" />
      {/* Prong */}
      <Line x1="50" y1="36" x2="50" y2="66" stroke="#AAAAAA" strokeWidth="3" strokeLinecap="round" />
    </>
  );
}

function BagIcon({ fill, dark }: { fill: string; dark: string }) {
  return (
    <>
      {/* Handle */}
      <Path
        d="M 30,34 Q 28,14 50,12 Q 72,14 70,34"
        stroke={darken(fill, 0.3)}
        strokeWidth="7"
        fill="none"
        strokeLinecap="round"
      />
      {/* Body */}
      <Rect x="12" y="32" width="76" height="58" rx="10" fill={fill} />
      {/* Zipper line */}
      <Line x1="18" y1="50" x2="82" y2="50" stroke={dark} strokeWidth="2" opacity={0.5} />
      {/* Zipper pull */}
      <Rect x="46" y="46" width="8" height="8" rx="2" fill={dark} opacity={0.6} />
    </>
  );
}

function WatchIcon({ fill, dark, light }: { fill: string; dark: string; light: string }) {
  return (
    <>
      {/* Strap top */}
      <Rect x="36" y="2" width="28" height="30" rx="8" fill={darken(fill, 0.2)} />
      {/* Strap bottom */}
      <Rect x="36" y="68" width="28" height="30" rx="8" fill={darken(fill, 0.2)} />
      {/* Strap buckle */}
      <Rect x="42" y="88" width="16" height="8" rx="3" fill="#888" />
      {/* Watch case */}
      <Circle cx="50" cy="50" r="26" fill={fill} />
      {/* Watch face */}
      <Circle cx="50" cy="50" r="20" fill={light} />
      {/* Hour/minute hands */}
      <Line x1="50" y1="50" x2="50" y2="36" stroke={dark} strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="50" y1="50" x2="60" y2="50" stroke={dark} strokeWidth="2" strokeLinecap="round" />
      <Circle cx="50" cy="50" r="2.5" fill={dark} />
    </>
  );
}

function SunglassesIcon({ fill, dark }: { fill: string; dark: string }) {
  return (
    <>
      {/* Left arm */}
      <Line x1="4" y1="36" x2="0" y2="44" stroke={fill} strokeWidth="5" strokeLinecap="round" />
      {/* Right arm */}
      <Line x1="96" y1="36" x2="100" y2="44" stroke={fill} strokeWidth="5" strokeLinecap="round" />
      {/* Left lens */}
      <Rect x="4" y="28" width="40" height="28" rx="10" fill={fill} opacity={0.85} />
      {/* Right lens */}
      <Rect x="56" y="28" width="40" height="28" rx="10" fill={fill} opacity={0.85} />
      {/* Lens sheen */}
      <Path d="M 8,32 Q 14,30 22,32" stroke="white" strokeWidth="2" opacity={0.3} fill="none" />
      <Path d="M 60,32 Q 66,30 74,32" stroke="white" strokeWidth="2" opacity={0.3} fill="none" />
      {/* Bridge */}
      <Path d="M 44,40 Q 50,36 56,40" stroke={fill} strokeWidth="4" fill="none" />
    </>
  );
}

function ScarfIcon({ fill, dark }: { fill: string; dark: string }) {
  return (
    <>
      {/* Main body */}
      <Path d="M 5,28 Q 50,18 95,28 L 90,72 Q 50,62 10,72 Z" fill={fill} />
      {/* Stripe details */}
      <Path d="M 5,38 Q 50,28 95,38" stroke={dark} strokeWidth="3" fill="none" opacity={0.35} />
      <Path d="M 5,50 Q 50,40 95,50" stroke={dark} strokeWidth="3" fill="none" opacity={0.35} />
      <Path d="M 6,62 Q 50,52 94,62" stroke={dark} strokeWidth="3" fill="none" opacity={0.35} />
      {/* Fringe left */}
      <Line x1="10" y1="72" x2="6" y2="88" stroke={fill} strokeWidth="3" />
      <Line x1="18" y1="74" x2="14" y2="90" stroke={fill} strokeWidth="3" />
      <Line x1="26" y1="74" x2="22" y2="90" stroke={fill} strokeWidth="3" />
      {/* Fringe right */}
      <Line x1="90" y1="72" x2="94" y2="88" stroke={fill} strokeWidth="3" />
      <Line x1="82" y1="74" x2="86" y2="90" stroke={fill} strokeWidth="3" />
      <Line x1="74" y1="74" x2="78" y2="90" stroke={fill} strokeWidth="3" />
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  category: string;
  subcategory: string;
  colour: string;
  size?: number;
};

function getShapeType(category: string, subcategory: string) {
  const sub = (subcategory || "").toLowerCase();
  const cat = (category || "").toLowerCase();
  if (sub === "tank top") return "tank";
  if (sub === "shorts") return "shorts";
  if (sub === "hoodie") return "hoodie";
  if (sub === "polo") return "polo";
  if (["jacket", "windbreaker", "blazer"].includes(sub)) return "jacket";
  if (["coat", "puffer"].includes(sub)) return "coat";
  if (sub === "boots") return "boot";
  if (sub === "sneakers") return "sneaker";
  if (sub === "sandals") return "sandal";
  if (["loafers", "dress shoes"].includes(sub)) return "loafer";
  if (sub === "hat") return "hat";
  if (sub === "belt") return "belt";
  if (sub === "bag") return "bag";
  if (sub === "watch") return "watch";
  if (sub === "sunglasses") return "sunglasses";
  if (sub === "scarf") return "scarf";
  if (cat === "tops") return "tshirt";
  if (cat === "bottoms") return "pants";
  if (cat === "outerwear") return "jacket";
  if (cat === "footwear") return "sneaker";
  if (cat === "accessories") return "bag";
  return "tshirt";
}

export default function ClothingIcon({ category, subcategory, colour, size = 80 }: Props) {
  const isCamo = (colour || "").toLowerCase().includes("camo");
  const hex = parseColor(colour);
  const dark = darken(hex);
  const light = lighten(hex);
  const patternId = `camo_${category}_${subcategory}`.replace(/\s/g, "_");
  const shape = getShapeType(category, subcategory);
  const fillProp = isCamo ? `url(#${patternId})` : hex;

  const isLandscapeShoe = shape === "sneaker" || shape === "sandal" || shape === "loafer";
  const svgWidth  = size;
  const svgHeight = isLandscapeShoe ? Math.round(size * 0.6) : size;
  const viewBox   = isLandscapeShoe ? "0 0 100 60" : "0 0 100 100";

  return (
    <Svg width={svgWidth} height={svgHeight} viewBox={viewBox}>
      {isCamo && <CamoPattern id={patternId} />}
      {shape === "tshirt" && <TShirtIcon fill={fillProp} dark={dark} />}
      {shape === "polo" && <PoloIcon fill={fillProp} dark={dark} />}
      {shape === "hoodie" && <HoodieIcon fill={fillProp} dark={dark} />}
      {shape === "tank" && <TankTopIcon fill={fillProp} dark={dark} />}
      {shape === "pants" && <PantsIcon fill={fillProp} dark={dark} />}
      {shape === "shorts" && <ShortsIcon fill={fillProp} dark={dark} />}
      {shape === "jacket" && <JacketIcon fill={fillProp} dark={dark} light={light} />}
      {shape === "coat" && <CoatIcon fill={fillProp} dark={dark} />}
      {shape === "sneaker" && <SneakerIcon fill={fillProp} dark={dark} light={light} />}
      {shape === "sandal" && <SandalIcon fill={fillProp} />}
      {shape === "loafer" && <LoaferIcon fill={fillProp} dark={dark} light={light} />}
      {shape === "boot" && <BootIcon fill={fillProp} dark={dark} />}
      {shape === "hat" && <HatIcon fill={fillProp} dark={dark} />}
      {shape === "belt" && <BeltIcon fill={fillProp} dark={dark} />}
      {shape === "bag" && <BagIcon fill={fillProp} dark={dark} />}
      {shape === "watch" && <WatchIcon fill={fillProp} dark={dark} light={light} />}
      {shape === "sunglasses" && <SunglassesIcon fill={fillProp} dark={dark} />}
      {shape === "scarf" && <ScarfIcon fill={fillProp} dark={dark} />}
    </Svg>
  );
}
