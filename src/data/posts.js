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
    "slug": "car-ownership-cost-by-state-2027",
    "title": "The Cost of Owning a Car in Every State (2027 Ranking)",
    "subtitle": "Same car, same loan — up to $2,964 a year apart",
    "date": "2026-10-15",
    "author": "Cash Pedal",
    "readTime": "6 min read",
    "excerpt": "We priced the monthly running costs of the same $35,000 car in all 50 states and D.C. New York is the most expensive at $623 a month before the loan payment; Idaho is the cheapest at $376. Here is the full ranking.",
    "tags": [
      "Data",
      "Car Ownership",
      "Insurance"
    ],
    "content": `
<p>
  Ask how much a car costs and most people quote the sticker price or the monthly payment. But the payment is the same in every state — what changes is everything that comes after it: insurance, gas and registration. Those running costs decide how much car your income can really support.
</p>
<p>
  We ran the same $35,000 vehicle, driven 13,500 miles a year, through Cash Pedal's cost model for all 50 states and Washington D.C. The result: the identical car costs <strong>$2,964 more per year to run in New York than in Idaho</strong>.
</p>

<h2>Key findings</h2>
<ul>
  <li><strong>Most expensive:</strong> New York ($623/mo), Nevada ($619/mo), California ($613/mo), Florida ($606/mo), Colorado ($581/mo).</li>
  <li><strong>Least expensive:</strong> Idaho ($376/mo), North Dakota ($383/mo), Vermont ($385/mo), Ohio ($390/mo), Tennessee ($398/mo).</li>
  <li><strong>Insurance drives the gap.</strong> Premiums range from $133 to $379 a month for the same car — a bigger swing than gas and registration combined.</li>
  <li><strong>It changes the salary you need.</strong> Add the $664 loan payment (20% down, 48 months at 6.5% APR) and keep the total at 15% of income: you'd need about $102,961 in New York, but $83,201 in Idaho.</li>
</ul>

<h2>Full ranking: monthly running costs of a $35,000 car</h2>
<p>Running costs exclude the loan payment, which is the same everywhere. Maintenance is held constant at $95/month so the ranking isolates what your state controls.</p>
<table>
<thead><tr><th>#</th><th>State</th><th>Insurance</th><th>Gas</th><th>Registration</th><th>Total / month</th><th>Total / year</th></tr></thead>
<tbody>
<tr><td>1</td><td>New York</td><td>$371</td><td>$150</td><td>$7</td><td><strong>$623</strong></td><td>$7,476</td></tr>
<tr><td>2</td><td>Nevada</td><td>$325</td><td>$158</td><td>$41</td><td><strong>$619</strong></td><td>$7,428</td></tr>
<tr><td>3</td><td>California</td><td>$283</td><td>$192</td><td>$43</td><td><strong>$613</strong></td><td>$7,356</td></tr>
<tr><td>4</td><td>Florida</td><td>$379</td><td>$129</td><td>$3</td><td><strong>$606</strong></td><td>$7,272</td></tr>
<tr><td>5</td><td>Colorado</td><td>$288</td><td>$133</td><td>$65</td><td><strong>$581</strong></td><td>$6,972</td></tr>
<tr><td>6</td><td>Louisiana</td><td>$363</td><td>$117</td><td>$3</td><td><strong>$578</strong></td><td>$6,936</td></tr>
<tr><td>7</td><td>Connecticut</td><td>$246</td><td>$142</td><td>$63</td><td><strong>$546</strong></td><td>$6,552</td></tr>
<tr><td>8</td><td>Arizona</td><td>$242</td><td>$150</td><td>$52</td><td><strong>$539</strong></td><td>$6,468</td></tr>
<tr><td>9</td><td>Michigan</td><td>$283</td><td>$138</td><td>$22</td><td><strong>$538</strong></td><td>$6,456</td></tr>
<tr><td>10</td><td>New Jersey</td><td>$296</td><td>$138</td><td>$5</td><td><strong>$534</strong></td><td>$6,408</td></tr>
<tr><td>11</td><td>Rhode Island</td><td>$271</td><td>$142</td><td>$9</td><td><strong>$517</strong></td><td>$6,204</td></tr>
<tr><td>12</td><td>Washington D.C.</td><td>$258</td><td>$150</td><td>$7</td><td><strong>$510</strong></td><td>$6,120</td></tr>
<tr><td>13</td><td>Maryland</td><td>$275</td><td>$133</td><td>$7</td><td><strong>$510</strong></td><td>$6,120</td></tr>
<tr><td>14</td><td>Massachusetts</td><td>$188</td><td>$146</td><td>$81</td><td><strong>$510</strong></td><td>$6,120</td></tr>
<tr><td>15</td><td>Missouri</td><td>$233</td><td>$117</td><td>$61</td><td><strong>$506</strong></td><td>$6,072</td></tr>
<tr><td>16</td><td>Minnesota</td><td>$233</td><td>$133</td><td>$41</td><td><strong>$502</strong></td><td>$6,024</td></tr>
<tr><td>17</td><td>Virginia</td><td>$188</td><td>$129</td><td>$86</td><td><strong>$498</strong></td><td>$5,976</td></tr>
<tr><td>18</td><td>Delaware</td><td>$263</td><td>$129</td><td>$3</td><td><strong>$490</strong></td><td>$5,880</td></tr>
<tr><td>19</td><td>Kentucky</td><td>$238</td><td>$121</td><td>$34</td><td><strong>$488</strong></td><td>$5,856</td></tr>
<tr><td>20</td><td>Georgia</td><td>$263</td><td>$121</td><td>$2</td><td><strong>$481</strong></td><td>$5,772</td></tr>
<tr><td>21</td><td>Kansas</td><td>$221</td><td>$117</td><td>$44</td><td><strong>$477</strong></td><td>$5,724</td></tr>
<tr><td>22</td><td>Alaska</td><td>$217</td><td>$158</td><td>$4</td><td><strong>$474</strong></td><td>$5,688</td></tr>
<tr><td>23</td><td>Oklahoma</td><td>$254</td><td>$117</td><td>$8</td><td><strong>$474</strong></td><td>$5,688</td></tr>
<tr><td>24</td><td>Pennsylvania</td><td>$225</td><td>$142</td><td>$7</td><td><strong>$469</strong></td><td>$5,628</td></tr>
<tr><td>25</td><td>Montana</td><td>$217</td><td>$138</td><td>$18</td><td><strong>$468</strong></td><td>$5,616</td></tr>
<tr><td>26</td><td>Illinois</td><td>$217</td><td>$142</td><td>$13</td><td><strong>$467</strong></td><td>$5,604</td></tr>
<tr><td>27</td><td>Maine</td><td>$154</td><td>$138</td><td>$80</td><td><strong>$467</strong></td><td>$5,604</td></tr>
<tr><td>28</td><td>Texas</td><td>$246</td><td>$121</td><td>$5</td><td><strong>$467</strong></td><td>$5,604</td></tr>
<tr><td>29</td><td>New Hampshire</td><td>$167</td><td>$133</td><td>$63</td><td><strong>$458</strong></td><td>$5,496</td></tr>
<tr><td>30</td><td>Washington</td><td>$175</td><td>$167</td><td>$20</td><td><strong>$457</strong></td><td>$5,484</td></tr>
<tr><td>31</td><td>West Virginia</td><td>$196</td><td>$129</td><td>$35</td><td><strong>$455</strong></td><td>$5,460</td></tr>
<tr><td>32</td><td>Hawaii</td><td>$154</td><td>$196</td><td>$6</td><td><strong>$451</strong></td><td>$5,412</td></tr>
<tr><td>33</td><td>Oregon</td><td>$192</td><td>$158</td><td>$6</td><td><strong>$451</strong></td><td>$5,412</td></tr>
<tr><td>34</td><td>Nebraska</td><td>$217</td><td>$125</td><td>$3</td><td><strong>$440</strong></td><td>$5,280</td></tr>
<tr><td>35</td><td>South Carolina</td><td>$183</td><td>$121</td><td>$41</td><td><strong>$440</strong></td><td>$5,280</td></tr>
<tr><td>36</td><td>Arkansas</td><td>$221</td><td>$117</td><td>$2</td><td><strong>$435</strong></td><td>$5,220</td></tr>
<tr><td>37</td><td>Wyoming</td><td>$163</td><td>$129</td><td>$46</td><td><strong>$433</strong></td><td>$5,196</td></tr>
<tr><td>38</td><td>Mississippi</td><td>$163</td><td>$117</td><td>$54</td><td><strong>$429</strong></td><td>$5,148</td></tr>
<tr><td>39</td><td>Utah</td><td>$188</td><td>$142</td><td>$4</td><td><strong>$429</strong></td><td>$5,148</td></tr>
<tr><td>40</td><td>Iowa</td><td>$175</td><td>$125</td><td>$33</td><td><strong>$428</strong></td><td>$5,136</td></tr>
<tr><td>41</td><td>South Dakota</td><td>$204</td><td>$125</td><td>$3</td><td><strong>$427</strong></td><td>$5,124</td></tr>
<tr><td>42</td><td>New Mexico</td><td>$196</td><td>$125</td><td>$3</td><td><strong>$419</strong></td><td>$5,028</td></tr>
<tr><td>43</td><td>North Carolina</td><td>$167</td><td>$125</td><td>$32</td><td><strong>$419</strong></td><td>$5,028</td></tr>
<tr><td>44</td><td>Indiana</td><td>$154</td><td>$129</td><td>$39</td><td><strong>$417</strong></td><td>$5,004</td></tr>
<tr><td>45</td><td>Alabama</td><td>$196</td><td>$121</td><td>$4</td><td><strong>$416</strong></td><td>$4,992</td></tr>
<tr><td>46</td><td>Wisconsin</td><td>$175</td><td>$133</td><td>$8</td><td><strong>$411</strong></td><td>$4,932</td></tr>
<tr><td>47</td><td>Tennessee</td><td>$179</td><td>$121</td><td>$3</td><td><strong>$398</strong></td><td>$4,776</td></tr>
<tr><td>48</td><td>Ohio</td><td>$167</td><td>$125</td><td>$3</td><td><strong>$390</strong></td><td>$4,680</td></tr>
<tr><td>49</td><td>Vermont</td><td>$138</td><td>$142</td><td>$10</td><td><strong>$385</strong></td><td>$4,620</td></tr>
<tr><td>50</td><td>North Dakota</td><td>$163</td><td>$121</td><td>$4</td><td><strong>$383</strong></td><td>$4,596</td></tr>
<tr><td>51</td><td>Idaho</td><td>$133</td><td>$142</td><td>$6</td><td><strong>$376</strong></td><td>$4,512</td></tr>
</tbody>
</table>

<h2>What this means if you're shopping</h2>
<p>
  If you live near the top of this list, a "$664 a month" car is really closer to $1,287 a month. Budget from the all-in number, not the payment. Getting insurance quotes <em>before</em> you pick a car matters more in high-premium states, and in states with value-based registration fees, a cheaper car saves you every single year.
</p>
<p>
  Want your own numbers? The <a href="/affordability">Cash Pedal affordability calculator</a> detects your state and works out the most car your salary supports, and the <a href="/tco">true cost of ownership calculator</a> prices a specific make and model for your ZIP code. For quick answers, see our <a href="/guides">affordability guides by salary and car price</a>.
</p>

<h2>Methodology</h2>
<p>
  Insurance is modelled from 2025 state average full-coverage premiums (Bankrate/Quadrant) scaled to the vehicle's value; gas uses state average fuel prices at 28 MPG and 13,500 miles a year; registration applies each state's flat and value-based fees for a new $35,000 vehicle. Figures are estimates for comparison, not quotes — your premium depends on your driving record, credit and coverage.
</p>
  `
  },
  {
    "slug": "how-much-car-can-i-afford-by-salary",
    "title": "How Much Car Can I Afford? The Real Numbers by Salary (2027)",
    "subtitle": "Why the \"payment you can afford\" is the wrong question",
    "date": "2026-10-15",
    "author": "Cash Pedal",
    "readTime": "7 min read",
    "excerpt": "Most affordability rules only look at the loan payment. Once gas, insurance, maintenance and registration are included, a $75,000 salary comfortably supports a car of about $28,500 — here is the table for every income.",
    "tags": [
      "Affordability",
      "Guides",
      "Budgeting"
    ],
    "content": `
<p>
  "How much car can I afford?" is usually answered with a monthly payment: the dealer asks what you'd like to pay and works backwards. That skips the costs that arrive after you drive off — and they add up to hundreds of dollars a month.
</p>

<h2>The rule we use</h2>
<p>
  Keep <strong>total</strong> car costs — loan payment, gas, insurance, maintenance and registration — at a set share of your gross (pre-tax) income:
</p>
<ul>
  <li><strong>10% — conservative.</strong> This is the classic 20/4/10 rule: 20% down, a loan of 4 years or less, and total vehicle costs under 10% of income.</li>
  <li><strong>15% — comfortable.</strong> Our recommended budget for most households.</li>
  <li><strong>20% — stretch.</strong> Doable, but leaves little room for repairs, rate hikes or income changes.</li>
</ul>

<h2>Car price you can afford, by salary</h2>
<p>Assumes 20% down, a 48-month loan at 6.5% APR, 13,500 miles a year and national-average running costs. Click a salary for the full breakdown, including the best and worst states.</p>
<table>
<thead><tr><th>Salary</th><th>15% budget / month</th><th>Conservative (10%)</th><th>Comfortable (15%)</th><th>Stretch (20%)</th></tr></thead>
<tbody>
<tr><td><a href="/guides/how-much-car-can-i-afford-40000-salary">$40,000</a></td><td>$500</td><td>$1,500</td><td><strong>$10,500</strong></td><td>$18,000</td></tr>
<tr><td><a href="/guides/how-much-car-can-i-afford-50000-salary">$50,000</a></td><td>$625</td><td>$6,000</td><td><strong>$16,500</strong></td><td>$24,500</td></tr>
<tr><td><a href="/guides/how-much-car-can-i-afford-60000-salary">$60,000</a></td><td>$750</td><td>$10,500</td><td><strong>$21,000</strong></td><td>$31,000</td></tr>
<tr><td><a href="/guides/how-much-car-can-i-afford-75000-salary">$75,000</a></td><td>$938</td><td>$16,500</td><td><strong>$28,500</strong></td><td>$40,500</td></tr>
<tr><td><a href="/guides/how-much-car-can-i-afford-90000-salary">$90,000</a></td><td>$1,125</td><td>$21,000</td><td><strong>$36,000</strong></td><td>$50,000</td></tr>
<tr><td><a href="/guides/how-much-car-can-i-afford-100000-salary">$100,000</a></td><td>$1,250</td><td>$24,500</td><td><strong>$40,500</strong></td><td>$55,500</td></tr>
<tr><td><a href="/guides/how-much-car-can-i-afford-120000-salary">$120,000</a></td><td>$1,500</td><td>$31,000</td><td><strong>$50,000</strong></td><td>$67,000</td></tr>
<tr><td><a href="/guides/how-much-car-can-i-afford-150000-salary">$150,000</a></td><td>$1,875</td><td>$40,500</td><td><strong>$62,500</strong></td><td>$91,500</td></tr>
<tr><td><a href="/guides/how-much-car-can-i-afford-200000-salary">$200,000</a></td><td>$2,500</td><td>$55,500</td><td><strong>$91,500</strong></td><td>$135,500</td></tr>
</tbody>
</table>

<h2>Three things the table reveals</h2>
<h3>1. Running costs take a big bite at lower incomes</h3>
<p>
  On $50,000 a year, the comfortable budget is $625 a month — but around $311 of that is gone on gas, insurance and upkeep before you make a single payment. That's why the affordable price climbs slowly at first, then much faster as income rises.
</p>
<h3>2. New cars start above many comfortable budgets</h3>
<p>
  The cheapest new 2027 car in our catalog starts around $22,890. Below roughly $65,000 a year, a new car only fits the stretch budget — a 2–4-year-old used car is the smarter buy.
</p>
<h3>3. A longer loan is a costly way to "afford" more</h3>
<p>
  On $75,000, going from a 48- to a 72-month loan raises the comfortable price from $28,500 to $36,500 — and adds $2,988 in interest, while you owe more than the car is worth for longer.
</p>

<h2>Get your exact number</h2>
<p>
  Your state, ZIP code and the specific car change the answer a lot — insurance alone can vary by more than double between states. The free <a href="/affordability">Cash Pedal affordability calculator</a> uses your location and shows matching 2027 models; the <a href="/salary">salary calculator</a> works the other way, from a car's price to the income you need. Browse every income and price level in our <a href="/guides">affordability guides</a>.
</p>
  `
  },
  {
    "slug": "true-cost-of-72-month-car-loans",
    "title": "What a 72- or 84-Month Car Loan Really Costs You",
    "subtitle": "The lower payment is the most expensive option",
    "date": "2026-10-15",
    "author": "Cash Pedal",
    "readTime": "5 min read",
    "excerpt": "Stretching a $35,000 car loan from 48 to 84 months cuts the payment by $248 a month — and adds $3,053 in interest, even before rate markups for long terms. Here is the math.",
    "tags": [
      "Financing",
      "Loans"
    ],
    "content": `
<p>
  Long car loans have become the norm: 72- and even 84-month terms are now common at dealerships, because they make an expensive car look affordable. The monthly payment drops — but you pay for it in three ways.
</p>

<h2>The math on a $35,000 car</h2>
<p>20% down ($7,000), $28,000 financed at 6.5% APR:</p>
<table>
<thead><tr><th>Loan term</th><th>Monthly payment</th><th>Total interest</th><th>Extra interest vs 48 months</th></tr></thead>
<tbody>
<tr><td>36 months</td><td>$858</td><td>$2,894</td><td>−$979</td></tr>
<tr><td>48 months</td><td>$664</td><td>$3,873</td><td>—</td></tr>
<tr><td>60 months</td><td>$548</td><td>$4,871</td><td>+$998</td></tr>
<tr><td>72 months</td><td>$471</td><td>$5,889</td><td>+$2,016</td></tr>
<tr><td>84 months</td><td>$416</td><td>$6,926</td><td>+$3,053</td></tr>
</tbody>
</table>
<p>
  And that assumes the same rate for every term. In practice lenders charge more for longer loans, so the real gap is usually wider.
</p>

<h2>1. You pay more interest</h2>
<p>
  Going from 48 to 84 months saves $248 a month but costs $3,053 more in interest over the loan.
</p>

<h2>2. You're "underwater" for years</h2>
<p>
  New cars typically lose 20–30% of their value in the first two years. With a long loan, the balance falls more slowly than the car's value, so for much of the loan you owe more than you could sell it for. If the car is totalled or you need to sell, you pay the difference.
</p>

<h2>3. Payments outlast the warranty</h2>
<p>
  Most bumper-to-bumper warranties end at 3 years / 36,000 miles. On an 84-month loan you'd be making payments for four more years while also paying for repairs out of pocket.
</p>

<h2>When a longer loan can make sense</h2>
<ul>
  <li>You have a promotional rate (0–2.9%) and will invest the difference.</li>
  <li>You plan to pay extra each month and only use the long term as a safety net.</li>
</ul>

<h2>A better question to ask</h2>
<p>
  Instead of "what payment can I afford?", ask "what car can I afford on a 48-month loan?" — then keep the total cost, including gas, insurance and maintenance, under 15% of income. The <a href="/affordability">Cash Pedal affordability calculator</a> does exactly that, and the <a href="/tco-full">full cost calculator</a> shows the year-by-year interest and depreciation for any specific car. See also: <a href="/guides/salary-needed-for-35000-car">what salary you need for a $35,000 car</a>.
</p>
  `
  },
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
