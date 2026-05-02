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
