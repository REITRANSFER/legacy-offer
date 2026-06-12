"use client"

import { useState } from "react"
import type { LucideIcon } from "lucide-react"
import {
  Home,
  Building2,
  Building,
  Truck,
  Map as MapIcon,
  HelpCircle,
  ShieldCheck,
  Tag,
  Zap,
  CalendarClock,
  CalendarDays,
  Hourglass,
  Sprout,
  TreePine,
  Anchor,
  TrendingUp,
  Crown,
  Shrink,
  Plane,
  Gift,
  KeyRound,
  Hammer,
  AlertTriangle,
  Split,
  ChevronRight,
  User,
  Users,
  Heart,
  Briefcase,
  Handshake,
  Sparkles,
  Smile,
  Wrench,
  HardHat,
  Phone,
  MessageSquare,
  Eye,
} from "lucide-react"
// (DollarSign removed — asking-price step retired 2026-06-05 per William.)
import { AddressAutocomplete, type AddressDetails, type ServiceArea } from "@/components/survey/address-autocomplete"
import { readCapturedTracking } from "@/components/tracking/tracking-capture"
import { scoreLead } from "@/lib/lead-scoring"

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
  }
}

/**
 * Zero-distraction multi-step form.
 * Pathway-pattern: qualifying questions FIRST, contact info LAST.
 *
 * Steps:
 *   1. Property type
 *   2. Listed on the market?
 *   3. Timeline to sell
 *   4. How long have you owned it?  (William directive 2026-06-05)
 *   5. Reason for selling
 *   6. Property address
 *   7. Contact info → submit
 *
 * Every choice button carries a Lucide icon for visual hit-target reinforcement.
 * Mobile-first. Every choice button is a full-width 56px tap target.
 * Submit posts to the existing /api/submit route (no GHL/n8n changes).
 */

type Props = {
  accentColor: string
  serviceAreas: ServiceArea[]
  disqualifiedPropertyTypes: string[]
  phoneHref: string
  phoneDisplay: string
}

// DQ reasons surfaced to the user. Order matters — first match wins on the screen.
const DQ_REASONS = {
  notOwner: "We only work directly with property owners (or co-owners / family with rights to sell).",
  excellent: "Excellent-condition homes do best on the open market through a realtor. We focus on as-is.",
  recentlyBought: "We only buy homes that have been owned for 5+ years.",
  exploring: "Sounds like you're just gathering info right now. When you're ready to sell, we'll be here.",
} as const
type DqKey = keyof typeof DQ_REASONS

type FormState = {
  propertyType: string
  whoAreYou: string
  listedOnMarket: string
  timeline: string
  yearsOwned: string
  reason: string
  condition: string
  address: string
  addressDetails: AddressDetails | null
  firstName: string
  lastName: string
  email: string
  phone: string
  // Honeypot — invisible to humans, bots auto-fill it. If non-empty at
  // submit time, we silently fake-succeed without ever touching n8n / GHL.
  hp_company: string
}

/**
 * Format a raw phone string as the user types: "9495551234" -> "(949) 555-1234".
 * Strips a leading 1 and caps at 10 digits.
 */
function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^1/, "").slice(0, 10)
  if (digits.length === 0) return ""
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

type Choice = { id: string; label: string; icon: LucideIcon }

const PROPERTY_TYPES: Choice[] = [
  { id: "single-family", label: "Single Family Home", icon: Home },
  { id: "multi-family",  label: "Multi-Family / Duplex", icon: Building2 },
  { id: "condo",         label: "Condo / Townhouse", icon: Building },
  { id: "mobile-home",   label: "Mobile / Manufactured Home", icon: Truck },
  { id: "land",          label: "Vacant Land", icon: MapIcon },
  { id: "other",         label: "Other", icon: HelpCircle },
]

const WHO_ARE_YOU_OPTIONS: Choice[] = [
  { id: "owner",         label: "I'm the owner",                       icon: User },
  { id: "part-owner",    label: "I'm a part owner / co-owner",         icon: Users },
  { id: "family",        label: "Family member with rights to sell",   icon: Heart },
  { id: "agent",         label: "I'm an agent representing the seller", icon: Briefcase },
  { id: "wholesaler",    label: "I'm a wholesaler",                    icon: Handshake },
  { id: "other",         label: "Other",                               icon: HelpCircle },
]

const LISTED_OPTIONS: Choice[] = [
  { id: "no",  label: "No, it's not listed",  icon: ShieldCheck },
  { id: "yes", label: "Yes, it's listed",     icon: Tag },
]

const TIMELINE_OPTIONS: Choice[] = [
  { id: "asap",      label: "ASAP (within 30 days)",  icon: Zap },
  { id: "3-months",  label: "Within 3 months",        icon: CalendarClock },
  { id: "6-months",  label: "Within 6 months",        icon: CalendarDays },
  { id: "6-plus",    label: "6+ months",              icon: Hourglass },
  { id: "exploring", label: "Just exploring",         icon: Eye },
]

const YEARS_OWNED_OPTIONS: Choice[] = [
  { id: "0-2",   label: "Less than 2 years",      icon: Sprout },
  { id: "3-5",   label: "3 to 5 years",           icon: TreePine },
  { id: "6-10",  label: "6 to 10 years",          icon: Anchor },
  { id: "11-20", label: "11 to 20 years",         icon: TrendingUp },
  { id: "20+",   label: "More than 20 years",     icon: Crown },
]

const REASON_OPTIONS: Choice[] = [
  { id: "downsize",    label: "Downsizing / Empty Nest",   icon: Shrink },
  { id: "relocation",  label: "Relocating",                icon: Plane },
  { id: "inheritance", label: "Inherited / Probate",       icon: Gift },
  { id: "landlord",    label: "Tired Landlord",            icon: KeyRound },
  { id: "repairs",     label: "Too Many Repairs",          icon: Hammer },
  { id: "foreclosure", label: "Behind on Payments",        icon: AlertTriangle },
  { id: "divorce",     label: "Divorce",                   icon: Split },
  { id: "other",       label: "Other",                     icon: HelpCircle },
]

// Condition choices include a longer sub-line so users self-select honestly.
type ConditionChoice = { id: string; label: string; sub: string; icon: LucideIcon }
const CONDITION_OPTIONS: ConditionChoice[] = [
  {
    id: "excellent",
    label: "Excellent",
    sub: "2025+ build or recently renovated. Move-in ready.",
    icon: Sparkles,
  },
  {
    id: "good",
    label: "Good",
    sub: "Needs minor TLC. Paint, carpet, small cosmetic fixes.",
    icon: Smile,
  },
  {
    id: "fair",
    label: "Fair",
    sub: "Dated but solid. Needs work to hit current standards.",
    icon: Wrench,
  },
  {
    id: "poor",
    label: "Poor",
    sub: "Won't pass inspection. Major repairs needed.",
    icon: HardHat,
  },
]

// -------- module-level UI primitives --------
// IMPORTANT: keep these OUTSIDE the form component. Defining them inside
// `ZeroDistractionForm` created a new component type on every render, which
// caused React 19 to unmount/remount every choice button on each state
// change and swallow tap events on mobile.

function ChoiceButton({
  choice, selected, accentColor, onClick,
}: { choice: Choice; selected?: boolean; accentColor: string; onClick: () => void }) {
  const Icon = choice.icon
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full min-h-14 rounded-xl border-2 px-4 py-3 text-base md:text-lg font-medium text-left transition-all active:scale-[0.98] flex items-center gap-3"
      style={{
        borderColor: selected ? accentColor : "#e5e7eb",
        backgroundColor: selected ? `${accentColor}0D` : "#ffffff",
        color: selected ? accentColor : "#111827",
      }}
    >
      <span
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
        style={{
          backgroundColor: selected ? `${accentColor}1A` : "#f3f4f6",
          color: selected ? accentColor : "#4b5563",
        }}
      >
        <Icon className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <span className="flex-1">{choice.label}</span>
      <ChevronRight className="h-5 w-5 text-gray-300 group-hover:translate-x-0.5 transition-transform" />
    </button>
  )
}

function NextButton({
  disabled, onClick, accentColor, label = "Next",
}: { disabled?: boolean; onClick: () => void; accentColor: string; label?: string }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="w-full h-14 md:h-16 rounded-xl text-white font-semibold text-lg md:text-xl shadow-md transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ backgroundColor: accentColor }}
    >
      {label}
    </button>
  )
}

function StepHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 text-center md:text-left">
      {children}
    </h2>
  )
}

export function ZeroDistractionForm({ accentColor, serviceAreas, disqualifiedPropertyTypes, phoneHref, phoneDisplay }: Props) {
  const [step, setStep] = useState(1)
  const TOTAL_STEPS = 9
  const [outsideAreaError, setOutsideAreaError] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  // When non-null, the form short-circuits and shows the DQ screen with Call/Text.
  const [dq, setDq] = useState<DqKey | null>(null)

  // SMS body sent when user couldn't qualify but still wants help.
  const smsHref = `sms:${phoneHref}?body=${encodeURIComponent("I was unable to fill out the form but I would still like an offer.")}`

  // Check if a pick triggers a DQ. Returns the DqKey or null.
  const checkDq = (key: keyof FormState, value: FormState[keyof FormState]): DqKey | null => {
    if (key === "whoAreYou" && typeof value === "string") {
      const qualified = ["owner", "part-owner", "family"]
      if (!qualified.includes(value)) return "notOwner"
    }
    if (key === "timeline" && value === "exploring") return "exploring"
    if (key === "yearsOwned" && typeof value === "string") {
      if (value === "0-2" || value === "3-5") return "recentlyBought"
    }
    if (key === "condition" && value === "excellent") return "excellent"
    return null
  }

  const [form, setForm] = useState<FormState>({
    propertyType: "",
    whoAreYou: "",
    listedOnMarket: "",
    timeline: "",
    yearsOwned: "",
    reason: "",
    condition: "",
    address: "",
    addressDetails: null,
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    hp_company: "",
  })

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  // Auto-advance after a choice picked — keeps the page feeling fast on mobile.
  // Short-circuits to the DQ screen if the pick triggers a disqualifier.
  const pickAndAdvance = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    const dqHit = checkDq(key, value)
    if (dqHit) {
      setTimeout(() => setDq(dqHit), 150)
      return
    }
    setTimeout(() => setStep(s => Math.min(s + 1, TOTAL_STEPS)), 150)
  }

  // Hard-DQ on property type — soft-flag for n8n routing.
  const isPropertyDisqualified = (typeId: string) => disqualifiedPropertyTypes.includes(typeId)

  // Address-level service area check — same logic as /v2.
  const isInServiceArea = (details: AddressDetails): boolean => {
    if (serviceAreas.length === 0) return true
    if (!details.lat || !details.lng) return true
    return serviceAreas.some(area => {
      const dLat = (details.lat! - area.centerLat) * Math.PI / 180
      const dLng = (details.lng! - area.centerLng) * Math.PI / 180
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(area.centerLat * Math.PI / 180) *
        Math.cos(details.lat! * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      return 3959 * c <= area.radiusMiles  // miles
    })
  }

  const handleAddressSelect = (address: string, details: AddressDetails) => {
    if (!isInServiceArea(details)) {
      setOutsideAreaError(true)
      return
    }
    setOutsideAreaError(false)
    setForm(prev => ({ ...prev, address, addressDetails: details }))
    setStep(s => s + 1)
  }

  const submit = async () => {
    setSubmitting(true)
    setSubmitError("")
    try {
      // 0. Honeypot — if any value, silently fake-succeed. Real users never see
      //    the hp_company field; bots auto-fill every field they find.
      if (form.hp_company.trim().length > 0) {
        await new Promise(r => setTimeout(r, 400)) // mimic a real submit delay
        window.location.href = "/thank-you"
        return
      }

      // 1. Score the lead from the form answers
      const score = scoreLead({
        propertyType:   form.propertyType,
        whoAreYou:      form.whoAreYou,
        listedOnMarket: form.listedOnMarket,
        timeline:       form.timeline,
        yearsOwned:     form.yearsOwned,
        reason:         form.reason,
        condition:      form.condition,
      })

      // 2. Pull captured tracking (UTMs / click IDs / cookies / referrer)
      const tracking = readCapturedTracking()

      // 3. Deterministic eventID — shared between browser pixel + server CAPI
      //    so Meta dedupes the same lead instead of double-counting.
      const emailNorm = form.email.toLowerCase().trim().replace(/[^a-z0-9]/g, "")
      const eventID = emailNorm
        ? `legacy_lead_${emailNorm.slice(0, 16)}`
        : `legacy_lead_anon_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

      // 4. Fire Meta Lead event from the browser (was missing on /v3 entirely).
      //    Value tells Andromeda how good this lead is, qualified=true keeps
      //    optimization aligned to true conversions only.
      if (typeof window !== "undefined" && window.fbq) {
        window.fbq("track", "Lead", {
          value: score.meta_value,
          currency: "USD",
          qualified: true,
          lead_score: score.lead_score,
          lead_quality: score.lead_quality,
          content_name: "Cash Offer Request",
          content_category: "cash_buyer_legacy",
        }, { eventID })
      }

      // 5. Build the full payload n8n will fan out to Resimpli / Discord /
      //    Supabase / Gmail / DealOracle / Meta CAPI.
      const payload = {
        // Identity
        name: `${form.firstName} ${form.lastName}`.trim(),
        first_name: form.firstName,
        last_name: form.lastName,
        email: form.email,
        phone: form.phone,
        address: form.address,

        // Form answers
        property_type:    form.propertyType,
        who_are_you:      form.whoAreYou,
        listed_on_market: form.listedOnMarket,
        timeline:         form.timeline,
        years_owned:      form.yearsOwned,
        reason:           form.reason,
        condition:        form.condition,

        // Scoring (for routing + Meta value)
        lead_score:           score.lead_score,
        lead_quality:         score.lead_quality,
        lead_meta_value:      score.meta_value,
        lead_score_breakdown: score.breakdown,

        // Meta dedup
        event_id: eventID,
        qualified: true,

        // Attribution / tracking
        utm_source:   tracking.utm_source   ?? "",
        utm_medium:   tracking.utm_medium   ?? "",
        utm_campaign: tracking.utm_campaign ?? "",
        utm_content:  tracking.utm_content  ?? "",
        utm_term:     tracking.utm_term     ?? "",
        fbclid:       tracking.fbclid       ?? "",
        gclid:        tracking.gclid        ?? "",
        ttclid:       tracking.ttclid       ?? "",
        msclkid:      tracking.msclkid      ?? "",
        fbp:          tracking.fbp          ?? "",
        fbc:          tracking.fbc          ?? "",
        referrer:     tracking.referrer     ?? "",
        landing_url:  tracking.landing_url  ?? "",
        captured_at:  tracking.captured_at  ?? "",

        // Funnel meta
        lead_stage: 'complete',
        funnel_variant: 'v3-zero-distraction',
        page_url: typeof window !== "undefined" ? window.location.href : "",
      }

      // 6. B1 compatibility SUPERSET — ADDITIVE aliases so Legacy's existing n8n
      //    (Zapier 35-key Generic CRM Webhook + Discord embed + Slack/Gmail +
      //    Universal Tracker) reads every field it expects. NOTHING from the v3
      //    payload above is removed; these are pure additions. ZERO n8n change.
      const mapYearsToOwnership = (y: string): string =>
        (({ "0-2": "less-than-3", "3-5": "3-to-5", "6-10": "5-to-10", "11-20": "10-plus", "20+": "10-plus" }) as Record<string, string>)[y] || ""
      const deriveIsLegalOwner = (w: string): string =>
        (({ "owner": "yes-owner", "part-owner": "yes-owner", "family": "yes-family" }) as Record<string, string>)[w] || ""

      const body = {
        ...payload,
        // camelCase identity + survey answers (Slack / Gmail / Discord / CRM / Universal Tracker)
        firstName: form.firstName,
        lastName: form.lastName,
        propertyType: form.propertyType,
        isLegalOwner: deriveIsLegalOwner(form.whoAreYou),
        ownershipLength: mapYearsToOwnership(form.yearsOwned),
        listedOnMarket: form.listedOnMarket,
        // meta_* aliases (CRM contract expects these names)
        meta_event_id: eventID,
        meta_event_name: "Lead",
        meta_value: score.meta_value,
        // single-stage CRM fields Legacy's contract expects
        source: "Survey Form",
        submittedAt: new Date().toISOString(),
        disqualify_reason: "",
        landing_page: tracking.landing_url ?? "",
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        // alt click-ids the Universal Tracker reads (blank unless present on the landing URL)
        epik:      tracking.epik      ?? "",
        sclid:     tracking.sclid     ?? "",
        li_fat_id: tracking.li_fat_id ?? "",
      }

      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Submission failed")
      }
      window.location.href = "/thank-you"
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong")
      setSubmitting(false)
    }
  }

  // -------- step renders (primitives defined at module level above) --------

  // ---- DQ screen render ----
  if (dq) {
    return (
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 md:p-8 text-center">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full mb-4"
          style={{ backgroundColor: `${accentColor}1A`, color: accentColor }}
        >
          <Phone className="h-7 w-7" />
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
          Let&apos;s talk directly.
        </h2>
        <p className="text-sm md:text-base text-gray-600 mb-2 max-w-md mx-auto">
          {DQ_REASONS[dq]}
        </p>
        <p className="text-sm md:text-base text-gray-700 font-medium mb-6 max-w-md mx-auto">
          That said, we&apos;d still like to hear from you. Call or text and we&apos;ll see what we can do.
        </p>

        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
          <a
            href={`tel:${phoneHref}`}
            className="flex items-center justify-center gap-2 h-14 rounded-xl text-white font-semibold text-base shadow-sm active:scale-[0.98] transition-transform"
            style={{ backgroundColor: accentColor }}
          >
            <Phone className="h-5 w-5" />
            <span>Call Us</span>
          </a>
          <a
            href={smsHref}
            className="flex items-center justify-center gap-2 h-14 rounded-xl font-semibold text-base shadow-sm active:scale-[0.98] transition-transform border-2"
            style={{ borderColor: accentColor, color: accentColor, backgroundColor: "#ffffff" }}
          >
            <MessageSquare className="h-5 w-5" />
            <span>Text Us</span>
          </a>
        </div>

        <p className="mt-4 text-sm font-medium text-gray-500">
          {phoneDisplay}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 md:p-8">
      {/* Progress strip */}
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-xs font-medium text-gray-500">Step {step} of {TOTAL_STEPS}</span>
          <span className="text-xs font-medium" style={{ color: accentColor }}>{Math.round((step / TOTAL_STEPS) * 100)}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%`, backgroundColor: accentColor }}
          />
        </div>
      </div>

      {/* Step 1 — Property Type */}
      {step === 1 && (
        <div>
          <StepHeader>What type of property is it?</StepHeader>
          <div className="space-y-3">
            {PROPERTY_TYPES.map(c => (
              <ChoiceButton key={c.id} accentColor={accentColor}
                choice={c}
                selected={form.propertyType === c.id}
                onClick={() => {
                  if (isPropertyDisqualified(c.id)) {
                    update("propertyType", c.id)
                  }
                  pickAndAdvance("propertyType", c.id)
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Step 2 — Who are you? */}
      {step === 2 && (
        <div>
          <StepHeader>And who are you in this transaction?</StepHeader>
          <div className="space-y-3">
            {WHO_ARE_YOU_OPTIONS.map(c => (
              <ChoiceButton key={c.id} accentColor={accentColor} choice={c} selected={form.whoAreYou === c.id} onClick={() => pickAndAdvance("whoAreYou", c.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Step 3 — Listed on Market */}
      {step === 3 && (
        <div>
          <StepHeader>Is your home currently listed with a realtor?</StepHeader>
          <div className="space-y-3">
            {LISTED_OPTIONS.map(c => (
              <ChoiceButton key={c.id} accentColor={accentColor} choice={c} selected={form.listedOnMarket === c.id} onClick={() => pickAndAdvance("listedOnMarket", c.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Step 4 — Timeline to sell */}
      {step === 4 && (
        <div>
          <StepHeader>How soon would you like to sell?</StepHeader>
          <div className="space-y-3">
            {TIMELINE_OPTIONS.map(c => (
              <ChoiceButton key={c.id} accentColor={accentColor} choice={c} selected={form.timeline === c.id} onClick={() => pickAndAdvance("timeline", c.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Step 5 — Years owned */}
      {step === 5 && (
        <div>
          <StepHeader>How long have you owned the property?</StepHeader>
          <div className="space-y-3">
            {YEARS_OWNED_OPTIONS.map(c => (
              <ChoiceButton key={c.id} accentColor={accentColor} choice={c} selected={form.yearsOwned === c.id} onClick={() => pickAndAdvance("yearsOwned", c.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Step 6 — Reason for selling */}
      {step === 6 && (
        <div>
          <StepHeader>What&apos;s the main reason for selling?</StepHeader>
          <div className="space-y-3">
            {REASON_OPTIONS.map(c => (
              <ChoiceButton key={c.id} accentColor={accentColor} choice={c} selected={form.reason === c.id} onClick={() => pickAndAdvance("reason", c.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Step 7 — Condition (two-line choice with sub-copy) */}
      {step === 7 && (
        <div>
          <StepHeader>How would you describe the condition?</StepHeader>
          <div className="space-y-3">
            {CONDITION_OPTIONS.map(c => {
              const Icon = c.icon
              const selected = form.condition === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => pickAndAdvance("condition", c.id)}
                  className="group w-full rounded-xl border-2 px-4 py-3 text-left transition-all active:scale-[0.98] flex items-start gap-3"
                  style={{
                    borderColor: selected ? accentColor : "#e5e7eb",
                    backgroundColor: selected ? `${accentColor}0D` : "#ffffff",
                  }}
                >
                  <span
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg mt-0.5"
                    style={{
                      backgroundColor: selected ? `${accentColor}1A` : "#f3f4f6",
                      color: selected ? accentColor : "#4b5563",
                    }}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2.2} />
                  </span>
                  <span className="flex-1">
                    <span
                      className="block text-base md:text-lg font-semibold leading-tight"
                      style={{ color: selected ? accentColor : "#111827" }}
                    >
                      {c.label}
                    </span>
                    <span className="block text-sm text-gray-500 mt-0.5 leading-snug">
                      {c.sub}
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 text-gray-300 mt-2 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Step 8 — Address (was step 9 before asking-price was retired) */}
      {step === 8 && (
        <div>
          <StepHeader>What&apos;s the property address?</StepHeader>
          <div className="space-y-3">
            <AddressAutocomplete
              value={form.address}
              onChange={(v) => { update("address", v); setOutsideAreaError(false) }}
              onSelect={(addr, details) => {
                // Inline the service-area check (the autocomplete also runs it
                // when serviceAreas is passed; we keep our own here as a fence
                // so the local DQ message stays consistent).
                if (!isInServiceArea(details)) {
                  setOutsideAreaError(true)
                  return
                }
                setOutsideAreaError(false)
                setForm(prev => ({ ...prev, address: addr, addressDetails: details }))
                setStep(s => s + 1)
              }}
              onOutOfArea={() => setOutsideAreaError(true)}
              serviceAreas={serviceAreas}
              placeholder="Start typing your address..."
            />
            {outsideAreaError && (
              <p className="text-sm text-red-600 text-center">
                Sorry, that address is outside our buying area. Please enter a property in the areas we serve.
              </p>
            )}
            <p className="text-xs text-gray-500 text-center">
              We buy in the areas we serve.
            </p>
          </div>
        </div>
      )}

      {/* Step 9 — Contact info → submit (First, Last, Email, Phone in that order) */}
      {step === 9 && (
        <div>
          <StepHeader>Who should we send the offer to?</StepHeader>
          <div className="space-y-4">
            {/* Honeypot — visually + interactively hidden from humans. Bots auto-fill
                every field they find; if this comes back non-empty, /api/submit
                silently 200s without forwarding to n8n. */}
            <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
              <label htmlFor="hp_company">Company (leave blank)</label>
              <input
                id="hp_company"
                type="text"
                name="company"
                tabIndex={-1}
                autoComplete="off"
                value={form.hp_company}
                onChange={e => update("hp_company", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  inputMode="text"
                  autoComplete="given-name"
                  placeholder="John"
                  value={form.firstName}
                  onChange={e => update("firstName", e.target.value)}
                  className="w-full h-14 px-4 rounded-xl border-2 border-gray-200 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  inputMode="text"
                  autoComplete="family-name"
                  placeholder="Smith"
                  value={form.lastName}
                  onChange={e => update("lastName", e.target.value)}
                  className="w-full h-14 px-4 rounded-xl border-2 border-gray-200 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => update("email", e.target.value)}
                className="w-full h-14 px-4 rounded-xl border-2 border-gray-200 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(949) 555-1234"
                value={form.phone}
                onChange={e => update("phone", formatPhoneDisplay(e.target.value))}
                className="w-full h-14 px-4 rounded-xl border-2 border-gray-200 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent tabular-nums"
              />
            </div>
            {submitError && (
              <p className="text-sm text-red-600 text-center">{submitError}</p>
            )}
            <NextButton
              accentColor={accentColor}
              label={submitting ? "Sending..." : "Get My Cash Offer"}
              disabled={
                submitting ||
                !form.firstName.trim() ||
                !form.lastName.trim() ||
                !form.email.trim() ||
                form.phone.replace(/\D/g, "").length < 10
              }
              onClick={submit}
            />
            <p className="text-xs text-gray-500 text-center px-2">
              By tapping above you agree to be contacted about your offer. No spam. No obligation.
            </p>
          </div>
        </div>
      )}

      {/* Back link — except on step 1 and the final submit step (9) */}
      {step > 1 && step < 9 && (
        <button
          type="button"
          onClick={() => setStep(s => Math.max(s - 1, 1))}
          className="mt-5 w-full text-sm text-gray-500 hover:text-gray-700 text-center"
        >
          ← Back
        </button>
      )}
    </div>
  )
}
