/**
 * Service lines, packages and the retainer, specification §6.4 and PRD §4.
 *
 * Price bands, not fixed prices. The roadmap records the two-hour argument
 * behind that: bands make the studio a commodity, silence makes it a phone
 * call, and phone calls take three weeks to schedule. Bands won, with Identity
 * highlighted to anchor the middle — recorded there as the single
 * highest-leverage decision of the project.
 */

export type ServiceLine = {
  number: string;
  name: string;
  description: string;
  deliverables: string[];
  duration: string;
  inPackages: string[];
};

export const SERVICE_LINES: readonly ServiceLine[] = [
  {
    number: "01",
    name: "Sonic mnemonic",
    description:
      "The three seconds a brand is known by. Territory exploration, development of one direction, and the adaptations that let it survive every place it has to live.",
    deliverables: [
      "3 territories explored, 1 developed",
      "6 adaptations: short, long, percussive, orchestral, solo-voice, UI stub",
      "Trademark-ready stems",
      "12-page mini-guideline",
    ],
    duration: "6–8 weeks",
    inPackages: ["Mnemonic", "Identity", "System"],
  },
  {
    number: "02",
    name: "Product and UI sound",
    description:
      "The sounds a product makes while someone is using it. Delivered as versioned tokens with naming, loudness targets and a format matrix, not as a folder of files.",
    deliverables: [
      "20–40 assets across states and surfaces",
      "Loudness-normalised to platform targets",
      "Figma and Storybook handoff",
      "Haptic sync guidance",
    ],
    duration: "8–12 weeks",
    inPackages: ["Identity", "System"],
  },
  {
    number: "03",
    name: "Brand voice direction",
    description:
      "Casting, direction and the rules that keep a voice consistent across everyone who will ever record for it — including, increasingly, the synthetic ones.",
    deliverables: [
      "Casting brief and shortlist",
      "Direction on session",
      "Pronunciation and pacing guide",
      "Synthetic model supervision where used",
    ],
    duration: "4–8 weeks",
    inPackages: ["Identity", "System"],
  },
  {
    number: "04",
    name: "Soundscape architecture",
    description:
      "Sound designed per space rather than per playlist. Lobby, spa, retail floor, restaurant — each with its own bed, its own level, and a rule for who may change it.",
    deliverables: [
      "Per-space beds and level targets",
      "Playback and hardware specification",
      "Governance model",
      "Property-level implementation guide",
    ],
    duration: "10–16 weeks",
    inPackages: ["System"],
  },
  {
    number: "05",
    name: "Sonic identity guidelines",
    description:
      "The document that makes the work outlast the engagement. Written to be used by agencies and engineers who were not in the room.",
    deliverables: [
      "40-page guidelines",
      "File naming and versioning convention",
      "Format matrix by platform",
      "Do-not list with worked examples",
    ],
    duration: "3–5 weeks",
    inPackages: ["Identity", "System"],
  },
  {
    number: "06",
    name: "Measurement and guardianship",
    description:
      "Quarterly audits, new-asset production, and a sound-check on every new surface before it ships. The part that stops a system decaying the moment it is handed over.",
    deliverables: [
      "Quarterly audit and report",
      "6 new assets per quarter",
      "Agency and vendor briefing",
      "Annual guidelines revision",
    ],
    duration: "12-month minimum",
    inPackages: ["System"],
  },
] as const;

export type Package = {
  name: string;
  scope: string;
  duration: string;
  band: string;
  buyer: string;
  highlighted: boolean;
};

export const PACKAGES: readonly Package[] = [
  {
    name: "Mnemonic",
    scope:
      "Audio logo. Three territories explored, one developed, six adaptations. Trademark-ready stems and a 12-page mini-guideline.",
    duration: "6–8 weeks",
    band: "£45,000 – £75,000",
    buyer: "Challenger brands, single-product companies, rebrand add-on",
    highlighted: false,
  },
  {
    name: "Identity",
    scope:
      "Mnemonic plus a UI and product sound set of 20–40 assets, brand voice casting direction, 40-page guidelines and implementation support.",
    duration: "12–16 weeks",
    band: "£110,000 – £180,000",
    buyer: "Fintech, CPG, EV — the core offer",
    // Anchors the middle of the range. The roadmap records this as the single
    // highest-leverage decision of the project.
    highlighted: true,
  },
  {
    name: "System",
    scope:
      "Identity plus retail and hospitality soundscape architecture, synthetic voice direction and model supervision, multi-territory adaptation, a measurement framework and a 12-month embed.",
    duration: "20–30 weeks",
    band: "£220,000 – £450,000",
    buyer: "Airlines, hospitality groups, multi-property or multi-market clients",
    highlighted: false,
  },
] as const;

export const RETAINER = {
  name: "Sonic guardianship",
  band: "£4,500 – £12,000 / month",
  minimum: "12-month minimum",
  covers: [
    "Quarterly audits",
    "New-asset production, fair-use pool of 6 per quarter",
    "Agency and vendor briefing",
    "Sound-check on all new product surfaces",
    "Annual guidelines revision",
  ],
} as const;

export const LICENSING = [
  {
    title: "Bespoke composition",
    body: "Full assignment of copyright, as standard. Everything composed for a client belongs to that client outright.",
  },
  {
    title: "Third-party performance",
    body: "Session musicians and voice talent are licensed separately, £3,000–£25,000 per performer depending on territory and term.",
  },
  {
    title: "Synthetic voice models",
    body: "An annual model-hosting and refresh licence at £18,000/year, for as long as the model is in use.",
  },
] as const;

export const FAQ = [
  {
    q: "Why publish price bands at all?",
    a: "Because the alternative is a phone call to find out, and that takes three weeks to schedule. Bands let you decide whether to talk to us before you spend an hour doing it.",
  },
  {
    q: "What decides where in a band we land?",
    a: "Number of territories, number of adaptations, whether voice talent is involved, and how much implementation support the internal team needs.",
  },
  {
    q: "Do we own the work?",
    a: "The bespoke composition, entirely. Third-party performance and synthetic voice models are licensed separately and stated plainly in the contract.",
  },
  {
    q: "Can you work with our existing audio?",
    a: "Often. An audit is the usual starting point, and sometimes the answer is that what exists is fine and the problem is governance.",
  },
  {
    q: "What if we only need one sound?",
    a: "Then Mnemonic is the package, and we will say so rather than sell you a system you do not need.",
  },
  {
    q: "How do you hand over to engineering?",
    a: "Named, versioned, loudness-normalised files with a format matrix, plus Figma and Storybook entries. Wwise, FMOD and Unity where the platform calls for it.",
  },
  {
    q: "Do you do the implementation?",
    a: "We support it. The team that owns the codebase should own the integration; we sit alongside and sound-check what ships.",
  },
  {
    q: "How long until we hear something?",
    a: "Territories land at the end of week three on most engagements. They are deliberately rough — the point is to react to a direction, not to a finish.",
  },
  {
    q: "What happens after delivery?",
    a: "Either nothing, and the system slowly decays, or a guardianship retainer. We would rather say that plainly than discover it in year two.",
  },
] as const;
