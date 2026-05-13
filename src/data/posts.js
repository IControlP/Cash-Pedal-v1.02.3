// ─── HOW TO ADD A BLOG POST ────────────────────────────────────────────────
//
//  1. Copy the example object below and paste it at the TOP of the `posts`
//     array (newest post first).
//
//  2. Fill in every field:
//       slug    – URL-safe string, e.g. "how-to-negotiate-car-price"
//                 Must be unique. Use only letters, numbers, and hyphens.
//       title   – Full post title shown on the card and post page.
//       date    – ISO date string "YYYY-MM-DD".
//       excerpt – One or two sentences shown on the blog index card.
//       tags    – Array of short label strings (optional, can be []).
//       content – HTML string. Write your post between the backticks.
//                 Supported tags: <h2>, <h3>, <p>, <ul>/<ol>/<li>,
//                 <strong>, <em>, <a href="...">, <blockquote>, <hr>.
//                 Tip: Wrap sections in <h2> headings for readability.
//
//  3. Save the file and deploy (push to the connected Railway branch).
//     The post will appear immediately — no server restart needed.
//
// ─────────────────────────────────────────────────────────────────────────────

export const posts = [
  {
    slug: 'your-budget-has-a-leak',
    title: 'Your Budget Has a Leak',
    subtitle: 'And it\'s been dripping for years',
    date: '2026-05-13',
    author: 'Noah',
    readTime: '5 min read',
    cover: '/assets/articles/budget-has-a-leak.png',
    excerpt:
      'We\'ve gotten good at tracking subscriptions and fixed bills. But there\'s an entire category of spending most budgets aren\'t built to handle — and a gas price spike is just the moment it becomes impossible to ignore.',
    tags: ['Budgeting', 'Car Ownership'],
    content: `
<p>
  We've gotten pretty good at tracking the obvious stuff.
</p>

<p>
  Netflix. Spotify. The gym membership we keep meaning to cancel. The financial wellness industry has spent the last decade training us to audit our recurring monthly bills — and for the most part, we listened. We know what we spend. Line by line, dollar by dollar.
</p>

<p>
  And yet, millions of households are getting blindsided right now by a spike in gas prices caused by a war thousands of miles away. Not because they're irresponsible. Because there's an entire <em>category</em> of spending that budgets aren't built to handle — and most of us have never been taught to see it.
</p>

<hr>

<h2>Two Kinds of Costs</h2>

<p>
  Most of what we spend money on falls into one of two predictable buckets.
</p>

<p>
  There's the <strong>one-time purchase</strong> — you buy the thing, it's done, you move on. And there's the <strong>fixed recurring cost</strong> — the subscription, the lease, the utility bill. These are easy to budget. They're visible, stable, and plannable.
</p>

<p>
  But then there's a third category. One that most budgeting frameworks quietly ignore.
</p>

<p>
  Call it <strong>variable ownership cost</strong> — the ongoing, unpredictable, often invisible financial obligation that comes with owning certain <em>classes</em> of things. Cars. Homes. Boats. Motorcycles. Recreational vehicles. These aren't products you buy once and forget, and they aren't subscriptions with a stable monthly fee. They're living, aging, depreciating systems that demand money from you on a schedule you don't control.
</p>

<p>
  Fuel prices fluctuate with geopolitical events. Repairs arrive without warning. Insurance premiums drift upward year over year. Tires wear out. Registration renews. Depreciation quietly erodes the asset's value whether you drive it or not. None of these costs appear on a single line in your bank statement. None of them are easy to predict. And almost none of them are factored into a typical household budget with any real accuracy.
</p>

<hr>

<h2>The Gas Pump as a Symptom</h2>

<p>
  Since the outbreak of conflict in the Middle East, oil prices surged more than 55% — one of the largest short-window spikes in recent memory. For American drivers, that translated into pump prices rising roughly 45% in a matter of months.
</p>

<p>
  The commentary has focused on the price shock itself — the geopolitics, the supply disruption, the downstream effect at the pump. All of that is real. But the reason it <em>hurts</em> isn't primarily the price of gasoline. It's that most households have no buffer left in their transportation budgets to absorb a variable cost spike of any kind.
</p>

<p>
  The average cost of owning and operating a new vehicle runs about $11,577 per year — roughly $965 a month. Personal finance experts recommend keeping total vehicle expenses under 10% of gross income. The median American car owner is already running 51% above that target.
</p>

<p>
  That's not a gas price problem. That's a total cost visibility problem. The gas spike is just the moment it becomes impossible to ignore.
</p>

<p>
  And cars are only one example. The same dynamic plays out with homeowners absorbing a sudden HVAC failure, a boat owner hit with an unexpected hull repair, a family that just discovered their home insurance premium jumped 30% at renewal. These aren't rare events. They're the predictable consequence of owning things that age, break, and operate in a world that changes.
</p>

<hr>

<h2>The Budgeting Gap Nobody Talks About</h2>

<p>
  We have good tools for the predictable stuff. But variable ownership costs don't fit neatly into a budgeting app category. They're too irregular to track as recurring expenses, too significant to ignore, and too complex to estimate without actually doing the math across every component.
</p>

<p>
  The result is that most people manage these costs <em>reactively</em> — they feel the pain at the pump, or when the repair bill arrives, or when the insurance renewal comes — but they never develop a clear picture of what a particular asset is actually costing them to own. Without that picture, you can't make good decisions: about whether to keep a vehicle or replace it, about how much buffer to hold, about whether you're getting real value from an asset or just endlessly servicing it.
</p>

<p>
  That visibility gap is what CashPedal was built around. Not as a budgeting gimmick or a way to tell people their car is too expensive — but because this specific category of cost, variable ownership cost, is the one place most financial tools simply don't go. And it's precisely the place that leaves people exposed when the world changes around them.
</p>

<p>
  The gas price spike will eventually ease. The underlying problem won't — not until people can see the full picture of what ownership actually costs them.
</p>
    `.trim(),
  },
  {
    slug: 'welcome-to-cash-pedal-blog',
    title: 'Welcome to the Cash Pedal Blog',
    date: '2026-05-02',
    excerpt:
      'Tips, guides, and straight talk on making smarter vehicle-buying decisions — without the dealership runaround.',
    tags: ['Announcement'],
    content: `
<p>
  Welcome to the Cash Pedal blog — your go-to source for no-nonsense advice on
  buying, financing, and owning a vehicle without leaving money on the table.
</p>

<h2>What we'll cover</h2>
<ul>
  <li>How to use our calculators to their full potential</li>
  <li>Real-world negotiation tactics that work at dealerships</li>
  <li>Financing mistakes that cost buyers thousands</li>
  <li>TCO breakdowns on popular vehicles</li>
  <li>When to buy new vs. used vs. lease</li>
</ul>

<h2>Who this is for</h2>
<p>
  Whether you're buying your first car or your fifth, our goal is the same:
  give you the numbers and the knowledge to walk in confident and drive out
  without regrets.
</p>

<p>Stay tuned — more posts are coming soon.</p>
    `.trim(),
  },
]
