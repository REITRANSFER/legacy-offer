import Image from "next/image"
import { ZeroDistractionForm } from "@/components/survey/zero-distraction-form"
import { TrackingCapture } from "@/components/tracking/tracking-capture"
import { Footer } from "@/components/layout/footer"
import config from "@/lib/config"

export default function HomePage() {
  // Parse service areas for client-side validation
  let parsedServiceAreas: Array<{ id: string; centerLat: number; centerLng: number; radiusMiles: number }> = []
  try { parsedServiceAreas = JSON.parse(config.serviceAreas) } catch {}

  const disqualifiedPropertyTypes = config.disqualifiedPropertyTypes.split(",").map(s => s.trim()).filter(Boolean)

  return (
    <main className="relative min-h-screen bg-gray-50">
      {/* Captures UTMs / click IDs / fbp / fbc / referrer on mount, persists to
          sessionStorage so the form attaches them at submit. Renders nothing. */}
      <TrackingCapture />
      {/* Minimal white header — logo only (OC v3 zero-distraction look) */}
      <header className="w-full bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-3 lg:px-8">
          {config.logoUrl && (
            <Image
              src={config.logoUrl}
              alt={config.companyName}
              width={72}
              height={72}
              className="h-14 w-14 md:h-16 md:w-16 flex-shrink-0 object-contain"
              unoptimized
              priority
            />
          )}
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 pt-6 pb-12 md:pt-10">
        {/* Centered hero — copy stays config-driven (Legacy's HEADLINE / SUBHEADLINE) */}
        <h1 className="text-center text-2xl font-bold leading-tight text-gray-900 md:text-3xl mb-2 text-balance">
          {config.headline}
          {config.headlineAccent && (
            <span style={{ color: config.accentColor }}> {config.headlineAccent}</span>
          )}
        </h1>
        <p className="text-center text-sm md:text-base text-gray-600 mb-6 md:mb-8">
          {config.subheadline}
        </p>

        {/* The form — Legacy's existing SurveyCard (submit/scoring/pixel unchanged),
            reskinned to the v3 look. Accent is passed as a prop (no CSS-var dependency). */}
        <ZeroDistractionForm
          accentColor={config.accentColor}
          serviceAreas={parsedServiceAreas}
          disqualifiedPropertyTypes={disqualifiedPropertyTypes}
          phoneHref={config.phoneHref}
          phoneDisplay={config.phoneDisplay}
        />
      </div>

      <Footer
        companyName={config.companyName}
        phoneDisplay={config.phoneDisplay}
        phoneHref={config.phoneHref}
        privacyPolicyUrl={config.privacyPolicyUrl}
        termsUrl={config.termsUrl}
      />
    </main>
  )
}
