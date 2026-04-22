import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ProGate from '../components/ProGate'
import { useSubscription } from '../hooks/useSubscription'
import { questions, questionImpacts, vehicleProfiles } from '../data/surveyData'

function scoreVehicles(answers) {
  const categories = Object.keys(vehicleProfiles)
  const scores = Object.fromEntries(categories.map(c => [c, 50]))

  answers.forEach((answer, qi) => {
    const multiplier = (answer - 3) // -2 to +2
    questionImpacts[qi].forEach(({ category, impact }) => {
      if (scores[category] !== undefined) {
        scores[category] += impact * multiplier
      }
    })
  })

  // Clamp 0-100
  categories.forEach(c => {
    scores[c] = Math.max(0, Math.min(100, scores[c]))
  })

  return scores
}

function ProgressBar({ current, total }) {
  return (
    <div className="flex items-center gap-3 mb-8">
      <div className="flex-1 h-1 bg-[var(--border)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
          style={{ width: `${((current) / total) * 100}%` }}
        />
      </div>
      <span className="text-xs text-[var(--text-muted)] shrink-0 font-semibold tabular-nums">
        {current} / {total}
      </span>
    </div>
  )
}

function ScoreMeter({ score, label }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-[var(--text-muted)] w-28 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-[var(--border)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--accent)] rounded-full transition-all duration-700"
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-sm font-bold text-white tabular-nums w-8 text-right">{Math.round(score)}</span>
    </div>
  )
}

export default function CarSurvey() {
  const { isSubscribed } = useSubscription()
  const [step, setStep] = useState('intro') // intro | quiz | results
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState(Array(questions.length).fill(3))
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [showAllScores, setShowAllScores] = useState(false)

  const scores = useMemo(() => {
    if (step !== 'results') return null
    return scoreVehicles(answers)
  }, [answers, step])

  const rankedProfiles = useMemo(() => {
    if (!scores) return []
    return Object.entries(scores)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([key, score]) => ({ key, score, profile: vehicleProfiles[key] }))
  }, [scores])

  const topMatch = rankedProfiles[0]

  function handleAnswer(value) {
    setSelectedAnswer(value)
    const newAnswers = [...answers]
    newAnswers[currentQ] = value
    setAnswers(newAnswers)

    setTimeout(() => {
      setSelectedAnswer(null)
      if (currentQ < questions.length - 1) {
        setCurrentQ(q => q + 1)
      } else {
        setStep('results')
      }
    }, 300)
  }

  function handleRestart() {
    setAnswers(Array(questions.length).fill(3))
    setCurrentQ(0)
    setSelectedAnswer(null)
    setShowAllScores(false)
    setStep('intro')
  }

  if (step === 'intro') {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--bg)]">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 pt-20 pb-16">
          <div className="max-w-xl w-full text-center">
            <div className="anim-0 text-5xl mb-6">🎯</div>
            <h1 className="anim-1 font-display font-extrabold text-white text-3xl sm:text-4xl mb-4">
              What car is actually right for you?
            </h1>
            <p className="anim-2 text-[var(--text-muted)] text-lg mb-8 leading-relaxed">
              Answer 13 quick questions and we'll match you to your ideal vehicle type — no BS, just honest results.
            </p>
            <div className="anim-3 card text-left mb-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-4">How it works</p>
              <div className="flex flex-col gap-3">
                {['13 questions, about 90 seconds total', 'No wrong answers — just honest ones', 'You\'ll get your top match with model picks', 'Retake anytime if your situation changes'].map((t, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-[var(--accent)] font-bold text-sm mt-0.5">{i + 1}.</span>
                    <span className="text-sm text-[var(--text-muted)]">{t}</span>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => setStep('quiz')} className="btn-primary w-full justify-center text-base py-4 anim-4">
              Start the Survey →
            </button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (step === 'quiz') {
    const q = questions[currentQ]
    return (
      <div className="min-h-screen flex flex-col bg-[var(--bg)]">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 pt-20 pb-16">
          <div className="max-w-xl w-full">
            <ProgressBar current={currentQ + 1} total={questions.length} />

            <div className="card mb-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-4">
                Question {currentQ + 1} of {questions.length}
              </p>
              <h2 className="font-display font-bold text-white text-xl sm:text-2xl leading-snug mb-8">
                "{q.text}"
              </h2>

              <div className="flex flex-col gap-3">
                {[1, 2, 3, 4, 5].map(v => {
                  const labels = {
                    1: q.lowLabel,
                    3: 'Somewhere in the middle',
                    5: q.highLabel,
                  }
                  return (
                    <button
                      key={v}
                      onClick={() => handleAnswer(v)}
                      className={`flex items-center gap-4 px-4 py-3 rounded-lg border text-left transition-all duration-200 ${
                        selectedAnswer === v
                          ? 'border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]'
                          : 'border-[var(--border)] hover:border-[#3a3a3e] hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-white'
                      }`}
                    >
                      <span className={`w-7 h-7 shrink-0 rounded-full border flex items-center justify-center font-bold text-sm transition-colors ${
                        selectedAnswer === v
                          ? 'border-[var(--accent)] bg-[var(--accent)] text-black'
                          : 'border-[var(--border)]'
                      }`}>
                        {v}
                      </span>
                      <span className="text-sm">
                        {labels[v] || (v === 2 ? 'Leaning toward: ' + q.lowLabel : 'Leaning toward: ' + q.highLabel)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {currentQ > 0 && (
              <button
                onClick={() => setCurrentQ(q => q - 1)}
                className="text-sm text-[var(--text-muted)] hover:text-white transition-colors"
              >
                ← Back
              </button>
            )}
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // Results
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <Navbar />
      <main className="flex-1 pt-20 pb-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10 pt-8">
            <div className="text-5xl mb-4 anim-0">{topMatch?.profile.emoji}</div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)] mb-2 anim-0">Your top match</p>
            <h1 className="font-display font-extrabold text-white text-3xl sm:text-4xl anim-1">
              {topMatch?.profile.name}
            </h1>
            <p className="text-[var(--text-muted)] font-semibold text-lg mt-1 anim-2">
              "{topMatch?.profile.tagline}"
            </p>
          </div>

          {/* Top match card */}
          <div className="card border-[var(--accent)] mb-6 anim-3" style={{ background: 'rgba(255,184,0,0.04)' }}>
            <p className="text-[var(--text-muted)] text-sm leading-relaxed mb-6">{topMatch?.profile.description}</p>

            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)] mb-3">Perfect for</p>
                <ul className="flex flex-col gap-2">
                  {topMatch?.profile.perfectFor.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
                      <span className="text-[var(--accent)] mt-0.5">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-3">Worth knowing</p>
                <ul className="flex flex-col gap-2">
                  {topMatch?.profile.considerations.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
                      <span className="text-yellow-500 mt-0.5">△</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-[var(--border)]">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-3">Top model picks</p>
              <div className="flex flex-wrap gap-2">
                {topMatch?.profile.topPicks.map(pick => (
                  <span key={pick} className="px-3 py-1.5 rounded-full bg-[var(--bg)] border border-[var(--border)] text-sm text-white font-medium">
                    {pick}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Runner-up profiles — Pro only */}
          <div className="mb-6 anim-4">
            {isSubscribed ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {rankedProfiles.slice(1, 3).map(({ key, score, profile }) => (
                  <div key={key} className="card hover:border-[#3a3a3e] transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{profile.emoji}</span>
                        <span className="font-display font-bold text-white text-base">{profile.name}</span>
                      </div>
                      <span className="text-xs font-bold text-[var(--text-muted)] bg-[var(--bg)] px-2 py-1 rounded">{Math.round(score)}%</span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] italic mb-3">"{profile.tagline}"</p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.topPicks.map(pick => (
                        <span key={pick} className="px-2 py-1 rounded text-xs text-[var(--text-muted)] bg-[var(--bg)] border border-[var(--border)]">
                          {pick}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ProGate
                isPro={false}
                title="Runner-up Matches"
                description="See your #2 and #3 vehicle type matches with model recommendations — Pro feature."
                preview={
                  <div className="grid sm:grid-cols-2 gap-4 p-2">
                    {rankedProfiles.slice(1, 3).map(({ key, score, profile }) => (
                      <div key={key} className="card">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{profile.emoji}</span>
                            <span className="font-display font-bold text-white text-base">{profile.name}</span>
                          </div>
                          <span className="text-xs font-bold text-[var(--text-muted)] bg-[var(--bg)] px-2 py-1 rounded">{Math.round(score)}%</span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] italic">"{profile.tagline}"</p>
                      </div>
                    ))}
                  </div>
                }
              />
            )}
          </div>

          {/* Full score breakdown — Pro only */}
          <div className="mb-8 anim-5">
            {isSubscribed ? (
              <div className="card">
                <button
                  onClick={() => setShowAllScores(s => !s)}
                  className="w-full flex items-center justify-between text-sm font-semibold text-[var(--text-muted)] hover:text-white transition-colors"
                >
                  <span>Full score breakdown</span>
                  <span>{showAllScores ? '▲' : '▼'}</span>
                </button>
                {showAllScores && (
                  <div className="mt-6 flex flex-col gap-3">
                    {rankedProfiles.map(({ key, score, profile }) => (
                      <ScoreMeter key={key} score={score} label={`${profile.emoji} ${profile.name}`} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <ProGate
                isPro={false}
                title="Full Quiz Score Breakdown"
                description="All vehicle types ranked by match percentage — upgrade to Pro to see your complete results."
                preview={
                  <div className="p-4 flex flex-col gap-3">
                    {rankedProfiles.slice(0, 4).map(({ key, score, profile }) => (
                      <ScoreMeter key={key} score={score} label={`${profile.emoji} ${profile.name}`} />
                    ))}
                  </div>
                }
              />
            )}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 anim-5">
            <Link to="/tco" className="btn-primary flex-1 justify-center py-4">
              Calculate TCO for this vehicle →
            </Link>
            <button onClick={handleRestart} className="btn-ghost flex-1 justify-center py-4">
              Retake the survey
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
