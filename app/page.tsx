import Image from "next/image"
import { SurveyCard } from "@/components/survey/survey-card"
import { Footer } from "@/components/layout/footer"
import config from "@/lib/config"

export default function HomePage() {
  // Parse service areas for client-side validation
  let parsedServiceAreas: Array<{ id: string; centerLat: number; centerLng: number; radiusMiles: number }> = []
  try { parsedServiceAreas = JSON.parse(config.serviceAreas) } catch {}

  const disqualifiedPropertyTypes = config.disqualifiedPropertyTypes.split(",").map(s => s.trim()).filter(Boolean)

  return (
    <main className="relative min-h-screen bg-gray-50">
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
        {/* Centered hero — headline matched to the Seattle/WA service area */}
        <h1 className="text-center text-2xl font-bold leading-tight text-gray-900 md:text-3xl mb-2 text-balance">
          Washington Homeowners: Sell Your House Fast, For Cash, As-Is
        </h1>
        <p className="text-center text-sm md:text-base text-gray-600 mb-4">
          {config.subheadline}
        </p>

        {/* Trust badges — verified: BBB A+ Accredited, Google reviews, WA since 2015 */}
        <div className="mb-6 md:mb-8 flex flex-wrap items-center justify-center gap-2.5">
          <a
            href="https://www.bbb.org/us/wa/everett/profile/real-estate-investing/legacy-onset-home-buyer-1296-1000102651"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 shadow-sm transition-shadow hover:shadow"
          >
            <span className="rounded bg-[#0a4ea2] px-1.5 py-px text-[11px] font-extrabold italic leading-none text-white">BBB</span>
            <span className="text-xs md:text-sm font-semibold text-gray-700">A+ Accredited</span>
          </a>

          <a
            href="https://maps.app.goo.gl/oGzJBZi6jEzFnFkJA"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 shadow-sm transition-shadow hover:shadow"
          >
            <span className="text-sm font-bold leading-none" aria-hidden="true">
              <span style={{ color: "#4285F4" }}>G</span>
              <span style={{ color: "#EA4335" }}>o</span>
              <span style={{ color: "#FBBC05" }}>o</span>
              <span style={{ color: "#4285F4" }}>g</span>
              <span style={{ color: "#34A853" }}>l</span>
              <span style={{ color: "#EA4335" }}>e</span>
            </span>
            <span className="text-xs leading-none tracking-tight text-[#FBBC05]">★★★★★</span>
            <span className="text-xs md:text-sm font-semibold text-gray-700">Reviews</span>
          </a>

          <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 shadow-sm">
            <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-xs md:text-sm font-semibold text-gray-700">Trusted in WA Since 2015</span>
          </span>
        </div>

        {/* The form — Legacy's existing SurveyCard (submit/scoring/pixel unchanged),
            reskinned to the v3 look. Accent is passed as a prop (no CSS-var dependency). */}
        <SurveyCard
          accentColor={config.accentColor}
          phoneDisplay={config.phoneDisplay}
          phoneHref={config.phoneHref}
          serviceAreas={parsedServiceAreas}
          disqualifiedPropertyTypes={disqualifiedPropertyTypes}
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
