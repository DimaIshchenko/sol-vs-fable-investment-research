# LinkedIn writeup

> 🔗 **Published post:** _link pending — will be added on publication._

<!-- Replace the line above with the live LinkedIn URL once published. -->

---

I compared GPT 5.6 Sol with Claude Fable 5 on a data science task.

(so you can save your tokens)

For my tests I love to use open-source government data, specifically Ukrstat: tons of open data, messy datasets that require cleaning, an SDMX API — a data science nightmare. I asked both models to build a 10-year investment plan based only on this data, with a high level of freedom in how to do it.

You can see the final results on the screenshots.

Not trying to pass this off as a real benchmark or anything — but it does match up with what I'm seeing on my actual tasks. Key facts:

**Performance**
Sol spent 1.2M tokens with an estimated cost of $28, almost all input tokens.
Fable spent 0.9M tokens AND decided to call a Haiku model for web search with another 4.2M — an estimated total cost of $87.

**Behaviour**
So, first of all, Fable completely ignored my request to use ONLY data from my site and started web searching immediately. No respect for the human at all.
Sol behaved very interactively and, during a 1-hour session, asked me more than 10 clarifying questions (even about my citizenship 🌚). Fable asked 3 technical things upfront and went dark for 2.5 hours.

**Code & Data**
Between them they downloaded ~170 MB of official statistics — Fable ~450k and Sol ~190k data points — across 46 raw files. But they actually opened and used only 7 and 8 files, respectively.
The rest was downloaded and never touched. And the real kicker: even the files they did parse only decide which sectors to pick. Every final return number is a hand-typed assumption — the data never reaches the money math.
BTW, what was Sol doing with the leftover energy? Making 4 versions of the same slide in different formats 🙂

**Modeling**
From a data-analysis perspective, Sol is the banker: just three scenarios and a genuinely live Excel model that checks its own numbers. Fable used Monte Carlo simulation and piled a lot more math on top — but nothing you can easily adjust.

**Summary**
So, unless you happen to have 10 years and $10M to help me evaluate this properly, let's rely on the markers of good analysis. Sol is cheaper and faster; at the same effort setting, it technically did what I asked. Fable was just doing more — even the things I asked it not to do — for the same request, and spent more money accordingly. Fable feels deeper but more isolated in its own thinking, whereas Sol is just an excellent executor. And Fable is definitely better slide designer.
