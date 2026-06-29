import { useEffect } from 'react'
import Navbar from '../components/Navbar'
import Hero from '../components/landing/Hero'
import Journey from '../components/landing/Journey'
import Problem from '../components/landing/Problem'
import TCOPreview from '../components/landing/TCOPreview'
import FAQ from '../components/landing/FAQ'
import CTAOffer from '../components/landing/CTAOffer'
import LandingFooter from '../components/landing/LandingFooter'
import LandingStickyCTA from '../components/landing/LandingStickyCTA'
import { trackLandingPageView } from '../utils/analytics'

export default function Landing() {
  // 1. landing_page_view — fires once per landing-page mount so we can segment
  // paid vs organic traffic and measure funnel entry by device / source.
  useEffect(() => { trackLandingPageView() }, [])

  return (
    <div className="landing-page">
      <div className="bg-glow" />
      <div className="grid-bg" />

      <Navbar />

      <main className="relative z-10 pt-14">
        <Hero />
        <Journey />
        <Problem />
        <TCOPreview />
        <FAQ />
        <CTAOffer />
        <LandingFooter />
      </main>

      <LandingStickyCTA />
    </div>
  )
}
