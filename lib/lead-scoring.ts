/**
 * Lead scoring for OC Home Buyers /v3 form.
 *
 * Designed per William's direction 2026-06-05:
 *   - No more soft DQs — anything not on the hard-DQ list just scores LOWER
 *   - Single Family Home always weighs more than multi/condo/etc
 *   - Single decision-maker (owner) > co-owner > family-with-rights
 *   - Relocation is a weak signal — score it down
 *   - Condition + timeline are self-explanatory (poor + ASAP = top fit)
 *
 * Hard DQs (handled in the form's `checkDq()`):
 *   - whoAreYou: anything other than owner / part-owner / family
 *   - timeline: exploring
 *   - yearsOwned: 0-2 or 3-5
 *   - condition: excellent
 *
 * Maximum possible score under this model: 125 points.
 * Buckets:
 *   HOT       85+
 *   WARM      60-84
 *   STANDARD  35-59
 *   LOW       <35
 *
 * Meta CAPI value (sent to fbq + n8n as the conversion value Andromeda
 * optimizes toward):
 *   HOT       150
 *   WARM      100
 *   STANDARD   50
 *   LOW        10
 */

export type ScoreInput = {
  propertyType: string
  whoAreYou: string
  listedOnMarket: string
  timeline: string
  yearsOwned: string
  reason: string
  condition: string
}

export type ScoreResult = {
  lead_score: number
  lead_quality: "HOT" | "WARM" | "STANDARD" | "LOW"
  meta_value: number
  breakdown: Record<string, number>
}

// ---- per-field weight tables ----

const PROPERTY_WEIGHTS: Record<string, number> = {
  "single-family": 30,  // SFH always weighs heaviest
  "multi-family":  18,
  "condo":         12,
  "mobile-home":    2,
  "land":           2,
  "other":          5,
}

const WHO_WEIGHTS: Record<string, number> = {
  "owner":      20,  // Single decision maker — fastest close
  "part-owner": 12,  // Multiple decision makers — slower
  "family":      8,  // Family with rights — slowest decision velocity
  // agent / wholesaler / other are hard-DQ'd before scoring runs
}

const LISTED_WEIGHTS: Record<string, number> = {
  "no":  10,
  "yes":  3,  // Realtor in the loop = more friction but not a DQ
}

const TIMELINE_WEIGHTS: Record<string, number> = {
  "asap":     20,
  "3-months": 15,
  "6-months": 10,
  "6-plus":    5,
  // exploring is hard-DQ'd before scoring
}

const YEARS_WEIGHTS: Record<string, number> = {
  "20+":   15,  // Most equity
  "11-20": 12,
  "6-10":   8,
  // 0-2 and 3-5 are hard-DQ'd before scoring
}

const REASON_WEIGHTS: Record<string, number> = {
  "foreclosure": 15,  // Highest urgency
  "inheritance": 13,
  "divorce":     12,
  "landlord":    11,
  "repairs":     10,
  "downsize":     8,
  "relocation":   4,  // Per William: weak signal
  "other":        5,
}

const CONDITION_WEIGHTS: Record<string, number> = {
  "poor": 15,  // Best fit for cash buyer
  "fair": 12,
  "good":  6,  // Could go open market — lower fit
  // excellent is hard-DQ'd before scoring
}

export function scoreLead(input: ScoreInput): ScoreResult {
  const breakdown = {
    property:   PROPERTY_WEIGHTS[input.propertyType]    ?? 0,
    who:        WHO_WEIGHTS[input.whoAreYou]            ?? 0,
    listed:     LISTED_WEIGHTS[input.listedOnMarket]    ?? 0,
    timeline:   TIMELINE_WEIGHTS[input.timeline]        ?? 0,
    years:      YEARS_WEIGHTS[input.yearsOwned]         ?? 0,
    reason:     REASON_WEIGHTS[input.reason]            ?? 0,
    condition:  CONDITION_WEIGHTS[input.condition]      ?? 0,
  }

  const lead_score = Object.values(breakdown).reduce((s, n) => s + n, 0)

  let lead_quality: ScoreResult["lead_quality"] = "LOW"
  let meta_value = 10
  if (lead_score >= 85)      { lead_quality = "HOT";      meta_value = 150 }
  else if (lead_score >= 60) { lead_quality = "WARM";     meta_value = 100 }
  else if (lead_score >= 35) { lead_quality = "STANDARD"; meta_value = 50 }

  return { lead_score, lead_quality, meta_value, breakdown }
}
