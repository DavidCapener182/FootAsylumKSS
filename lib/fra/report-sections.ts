/**
 * Single source of truth for FRA report section order and page-break behavior.
 * Mirrors the print-view structure (fra-print-page) for DOCX parity.
 * Used by generate-docx route only; UI is unchanged.
 */

export interface FRASectionDef {
  id: string
  title: string
  pageBreakAfter: boolean
}

export const FRA_SECTIONS: FRASectionDef[] = [
  { id: 'cover', title: 'Fire Risk Assessment - Review', pageBreakAfter: true },
  { id: 'photos-toc', title: 'Photo of Site / Building / Premises', pageBreakAfter: true },
  { id: 'purpose', title: 'Purpose of This Assessment', pageBreakAfter: true },
  { id: 'regulatory-reform', title: 'Regulatory Reform (Fire Safety) Order 2005', pageBreakAfter: true },
  { id: 'travel-distances', title: 'Travel Distances', pageBreakAfter: true },
  { id: 'category-l', title: 'Category L Fire Alarm Systems - Life Protection', pageBreakAfter: true },
  { id: 'fire-resistance', title: 'Fire Resistance', pageBreakAfter: true },
  { id: 'terms-limitations', title: 'Fire Risk Assessment – Terms, Conditions and Limitations', pageBreakAfter: true },
  { id: 'enforcement-insurers', title: 'Enforcement and Insurers / Specialist Advice / Liability', pageBreakAfter: true },
  { id: 'about-property', title: 'About the Property', pageBreakAfter: true },
  { id: 'fire-alarm', title: 'Fire Alarm Systems', pageBreakAfter: true },
  { id: 'emergency-lighting', title: 'Emergency Lighting', pageBreakAfter: true },
  { id: 'fire-extinguishers', title: 'Portable Fire-Fighting Equipment', pageBreakAfter: true },
  { id: 'sprinkler', title: 'Sprinkler & Smoke Extraction', pageBreakAfter: true }, // conditional
  { id: 'fire-rescue-access', title: 'Fire and Rescue Services Access', pageBreakAfter: true },
  { id: 'stage1-stage2', title: 'Stage 1 – Fire Hazards / Stage 2 – People at Risk', pageBreakAfter: true },
  { id: 'stage3', title: 'Stage 3 – Evaluate, remove, reduce and protect from risk', pageBreakAfter: true },
  { id: 'fire-plan', title: 'Fire Plan', pageBreakAfter: true },
  { id: 'fra-report', title: 'Fire Risk Assessment Report', pageBreakAfter: true },
  { id: 'risk-rating', title: 'Risk Rating', pageBreakAfter: true },
  { id: 'action-plan', title: 'Action Plan', pageBreakAfter: true },
]
