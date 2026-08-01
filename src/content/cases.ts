import { STEMS } from "@/lib/audio/manifest";

/**
 * Case study content, specification §6.3 and §7 of the PRD.
 *
 * Typed data rather than MDX. A case study is a filled-in template — client,
 * sector, package, an asset inventory with loudness and formats, three context
 * players, named metrics, credits — and almost none of that is prose. Encoding
 * it as data means the shape is checked at build time and the index can filter
 * and count without parsing anything. The journal, which genuinely is prose,
 * is the thing that wants MDX.
 *
 * These four are the clients named in the PRD personas and the roadmap's
 * content inventory: four studies with usable stems, one of them anonymised
 * because it is under NDA until March. They are illustrative, not real
 * engagements, and every stem maps to a synthesised placeholder.
 */

export const SECTORS = [
  "Fintech",
  "Mobility",
  "Hospitality",
  "Aviation",
] as const;
export type Sector = (typeof SECTORS)[number];

export const PACKAGES = ["Mnemonic", "Identity", "System"] as const;
export type PackageTier = (typeof PACKAGES)[number];

/** One deliverable in the asset inventory, §6.3 "The System". */
export type InventoryItem = {
  name: string;
  seconds: number;
  lufs: number;
  format: string;
};

/** One of the three environment players, §6.3 "In Context". */
export type ContextPlayer = {
  id: string;
  label: string;
  description: string;
};

export type Metric = { value: string; label: string };
export type Credit = { role: string; name: string };

export type CaseStudy = {
  slug: string;
  client: string;
  sector: Sector;
  tier: PackageTier;
  year: number;
  territories: string;
  /** One line for the index card and the meta description. */
  summary: string;
  brief: string;
  insight: string;
  inventory: InventoryItem[];
  contexts: ContextPlayer[];
  results: Metric[];
  credits: Credit[];
  /** Key into the audio manifest, or null where no stem is cleared. */
  stem: string | null;
  featured: boolean;
};

export const CASES: readonly CaseStudy[] = [
  {
    slug: "kestrel",
    client: "Kestrel",
    sector: "Fintech",
    tier: "Identity",
    year: 2025,
    territories: "UK, EU",
    summary:
      "A payment confirmation you feel before you read, and a UI sound set shipped as versioned design tokens.",
    brief:
      "Kestrel had 3.1 million users and a payments flow that tested well on every measure except confidence. People completed transfers and then checked twice that they had. The brief was to make confirmation legible without a single extra pixel, and to hand it over as something the design system could version rather than a folder of unlabelled files.",
    insight:
      "Confirmation anxiety is a timing problem, not a volume problem. The tone has to resolve before the animation does, or the eye overrules the ear.",
    inventory: [
      { name: "tmb_kestrel_ui_confirm_v03", seconds: 0.9, lufs: -16, format: "WAV 48k/24" },
      { name: "tmb_kestrel_ui_error_v02", seconds: 0.6, lufs: -16, format: "WAV 48k/24" },
      { name: "tmb_kestrel_ui_biometric_v04", seconds: 0.4, lufs: -18, format: "WAV 48k/24" },
      { name: "tmb_kestrel_ui_card_freeze_v01", seconds: 1.1, lufs: -16, format: "WAV 48k/24" },
      { name: "tmb_kestrel_mnemonic_long_v06", seconds: 3.2, lufs: -14, format: "WAV 48k/24" },
    ],
    contexts: [
      {
        id: "in-app",
        label: "In app",
        description:
          "Payment confirmation at handset volume, over the haptic it is synced to.",
      },
      {
        id: "in-branch",
        label: "In branch",
        description:
          "The same mnemonic at counter distance, in a room with hard surfaces.",
      },
      {
        id: "in-ad",
        label: "In broadcast",
        description: "The long-form mnemonic as it lands at the end of a 30-second spot.",
      },
    ],
    results: [
      { value: "-31%", label: "Confirmation-related support contacts" },
      { value: "94%", label: "Unprompted recall at eight weeks" },
      { value: "40", label: "Assets shipped as versioned tokens" },
    ],
    credits: [
      { role: "Creative direction", name: "Ines Kovač" },
      { role: "Composition", name: "Wren Baptiste" },
      { role: "Sound design", name: "Wren Baptiste" },
      { role: "Strategy", name: "Nour el-Amrani" },
    ],
    stem: "kestrel",
    featured: true,
  },
  {
    slug: "halcyon",
    client: "Halcyon Mobility",
    sector: "Mobility",
    tier: "System",
    year: 2025,
    territories: "EU, UK, NO",
    summary:
      "Start-up, charging and door-close tones for a second-generation EV platform, built to survive AVAS regulation.",
    brief:
      "An electric vehicle makes almost no sound, so every sound it does make is a decision someone has to defend. Halcyon needed a start-up chime, a charging-complete tone and a door-close cue that would read as one family, register as trademarkable assets, and satisfy an acoustics team who had until then treated sound as a compliance surface.",
    insight:
      "A cabin is not a studio. Anything that relies on low frequency disappears under road noise at 70km/h, so the identity had to carry in the mids and be recognisable from its rhythm alone.",
    inventory: [
      { name: "tmb_halcyon_startup_v08", seconds: 2.4, lufs: -18, format: "WAV 48k/24" },
      { name: "tmb_halcyon_charge_complete_v05", seconds: 1.8, lufs: -18, format: "WAV 48k/24" },
      { name: "tmb_halcyon_door_close_v03", seconds: 0.7, lufs: -20, format: "WAV 48k/24" },
      { name: "tmb_halcyon_avas_exterior_v11", seconds: 4.0, lufs: -12, format: "WAV 48k/24" },
    ],
    contexts: [
      {
        id: "in-vehicle",
        label: "In vehicle",
        description: "Cabin position, stationary, with the HVAC at its usual setting.",
      },
      {
        id: "exterior",
        label: "Exterior",
        description: "The AVAS layer at two metres, as a pedestrian hears it.",
      },
      {
        id: "in-app",
        label: "In app",
        description: "Charging complete, arriving as a phone notification.",
      },
    ],
    results: [
      { value: "3", label: "Tones filed as registered marks" },
      { value: "AVAS", label: "Regulatory acoustic requirements cleared" },
      { value: "14mo", label: "Delivered ahead of platform launch" },
    ],
    credits: [
      { role: "Creative direction", name: "Ines Kovač" },
      { role: "Composition", name: "Wren Baptiste" },
      { role: "Acoustic consultancy", name: "Halcyon NVH team" },
      { role: "Project management", name: "Nour el-Amrani" },
    ],
    stem: "halcyon",
    featured: true,
  },
  {
    slug: "solene",
    client: "Solene Group",
    sector: "Hospitality",
    tier: "System",
    year: 2024,
    territories: "ES, PT, IT, FR",
    summary:
      "One soundscape strategy across thirty-one properties, with a governance model that survived handover.",
    brief:
      "Thirty-one properties, thirty-one playlists, one brand. Solene had bought a sonic identity once before and received a licensed Spotify playlist. What they needed was a strategy per space — lobby, spa, restaurant, in-room — and a way to keep general managers inside it without stationing someone in every building.",
    insight:
      "Governance is the deliverable. A soundscape that depends on taste decays the moment the person with the taste leaves the room, so the rules have to be duller and more specific than anyone wants them to be.",
    inventory: [
      { name: "tmb_solene_lobby_bed_v04", seconds: 480, lufs: -22, format: "WAV 48k/24" },
      { name: "tmb_solene_spa_bed_v06", seconds: 600, lufs: -26, format: "WAV 48k/24" },
      { name: "tmb_solene_restaurant_bed_v03", seconds: 420, lufs: -20, format: "WAV 48k/24" },
      { name: "tmb_solene_ivr_greeting_v02", seconds: 6.5, lufs: -16, format: "WAV 48k/24" },
    ],
    contexts: [
      {
        id: "in-lobby",
        label: "In lobby",
        description: "Arrival, at the volume the space actually runs at.",
      },
      {
        id: "in-spa",
        label: "In spa",
        description: "The quietest bed in the system, mixed for a tiled room.",
      },
      {
        id: "on-call",
        label: "On call",
        description: "The IVR greeting through a telephony codec.",
      },
    ],
    results: [
      { value: "31", label: "Properties on one governed system" },
      { value: "+6pt", label: "Guest satisfaction, ambience sub-score" },
      { value: "12mo", label: "Guardianship retainer attached" },
    ],
    credits: [
      { role: "Creative direction", name: "Ines Kovač" },
      { role: "Composition", name: "Wren Baptiste" },
      { role: "Governance model", name: "Nour el-Amrani" },
      { role: "Quality assurance", name: "Kiri Tanaka" },
    ],
    stem: "solene",
    featured: true,
  },
  {
    slug: "aviation-carrier",
    client: "European flag carrier",
    sector: "Aviation",
    tier: "Identity",
    year: 2024,
    territories: "Global",
    summary:
      "A boarding and cabin identity for a national carrier. Client name withheld under NDA.",
    brief:
      "A full-service carrier rebuilding its cabin experience, where the sonic layer had accumulated over two decades without anyone owning it. Boarding music, seatbelt chimes and the arrival theme had come from three different eras and three different vendors. The work was as much archaeology as composition.",
    insight:
      "A chime that signals an instruction cannot be beautiful at the cost of being unambiguous. The seatbelt tone was the hardest asset in the project and the shortest.",
    inventory: [
      { name: "tmb_carrier_boarding_bed_v07", seconds: 240, lufs: -23, format: "WAV 48k/24" },
      { name: "tmb_carrier_seatbelt_v14", seconds: 0.8, lufs: -14, format: "WAV 48k/24" },
      { name: "tmb_carrier_arrival_theme_v05", seconds: 22, lufs: -18, format: "WAV 48k/24" },
    ],
    contexts: [
      {
        id: "in-cabin",
        label: "In cabin",
        description: "Boarding, against the cabin noise floor with the APU running.",
      },
      {
        id: "in-lounge",
        label: "In lounge",
        description: "The same identity in a room built for conversation.",
      },
      {
        id: "in-app",
        label: "In app",
        description: "Check-in confirmation on a handset.",
      },
    ],
    results: [
      { value: "2", label: "Decades of inherited assets retired" },
      { value: "1", label: "Coherent system across cabin and ground" },
      { value: "NDA", label: "Full results published March" },
    ],
    credits: [
      { role: "Creative direction", name: "Ines Kovač" },
      { role: "Composition", name: "Wren Baptiste" },
      { role: "Strategy", name: "Nour el-Amrani" },
    ],
    stem: "aviation",
    featured: true,
  },
] as const;

export function caseBySlug(slug: string): CaseStudy | undefined {
  return CASES.find((entry) => entry.slug === slug);
}

export function casesInSector(sector: Sector | "All"): readonly CaseStudy[] {
  return sector === "All"
    ? CASES
    : CASES.filter((entry) => entry.sector === sector);
}

/** Sectors that actually have work behind them, for the filter row. */
export function populatedSectors(): Sector[] {
  return SECTORS.filter((sector) =>
    CASES.some((entry) => entry.sector === sector),
  );
}

/** The next case in the list, wrapping — §6.3 "Next Project". */
export function nextCase(slug: string): CaseStudy {
  const index = CASES.findIndex((entry) => entry.slug === slug);
  return CASES[(index + 1) % CASES.length];
}

/** Resolves a case's stem to a playable asset, or null where none is cleared. */
export function stemFor(entry: CaseStudy) {
  return entry.stem ? (STEMS[entry.stem] ?? null) : null;
}
