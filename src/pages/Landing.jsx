import Navbar from '../components/Navbar'
import Hero from '../components/landing/Hero'
import Journey from '../components/landing/Journey'
import Problem from '../components/landing/Problem'
import TCOPreview from '../components/landing/TCOPreview'
import FAQ from '../components/landing/FAQ'
import CTAOffer from '../components/landing/CTAOffer'
import LandingFooter from '../components/landing/LandingFooter'
import LandingStickyCTA from '../components/landing/LandingStickyCTA'

export default function Landing() {
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
