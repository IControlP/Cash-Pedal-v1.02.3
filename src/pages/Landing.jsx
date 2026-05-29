import Navbar from '../components/Navbar'
import Hero from '../components/landing/Hero'
import Problem from '../components/landing/Problem'
import HowItWorks from '../components/landing/HowItWorks'
import FreeTools from '../components/landing/FreeTools'
import TCOPreview from '../components/landing/TCOPreview'
import Coverage from '../components/landing/Coverage'
import Features from '../components/landing/Features'
import WhyNotFree from '../components/landing/WhyNotFree'
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
        <Problem />
        <HowItWorks />
        <FreeTools />
        <TCOPreview />
        <Coverage />
        <Features />
        <WhyNotFree />
        <FAQ />
        <CTAOffer />
        <LandingFooter />
      </main>
    </div>
  )
}
