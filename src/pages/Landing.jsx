import Navbar from '../components/Navbar'
import Hero from '../components/landing/Hero'
import TrustStrip from '../components/landing/TrustStrip'
import Problem from '../components/landing/Problem'
import HowItWorks from '../components/landing/HowItWorks'
import TCOPreview from '../components/landing/TCOPreview'
import Coverage from '../components/landing/Coverage'
import Features from '../components/landing/Features'
import FAQ from '../components/landing/FAQ'
import CTAOffer from '../components/landing/CTAOffer'
import LandingFooter from '../components/landing/LandingFooter'

export default function Landing() {
  return (
    <div className="landing-page">
      <div className="bg-glow" />
      <div className="grid-bg" />

      <Navbar />

      <main className="relative z-10 pt-14">
        <Hero />
        <TrustStrip />
        <Problem />
        <HowItWorks />
        <TCOPreview />
        <Coverage />
        <Features />
        <FAQ />
        <CTAOffer />
        <LandingFooter />
      </main>
    </div>
  )
}
