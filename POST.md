# LinkedIn writeup

> 🔗 **Published post:** _coming soon — link TBD_

<!-- Replace the line above with the live LinkedIn URL once published. -->

---

## Draft (pending publication)

**GPT 5.6 Sol vs Claude Fable 5 — a real Data Science fight 🥊**

I compared GPT 5.6 Sol with Claude Fable 5 on a Data Science task.

For my tests I love to use ONLY open-source government data, specifically Ukrstat: tons of open data, messy datasets that require cleaning, SDMX API — a data science nightmare. I asked both models to build a 10-year investment plan based only on this data, in one slide, which you can see below.

I don't pretend to build a comprehensive benchmark, but it's very aligned with the behaviour I see on my working tasks:

**Performance:**
Sol spent 1.2M tokens with an estimated cost of $28. Interesting that 1.1M of them were input tokens.
Fable spent 0.9M tokens with an estimated cost of $80 AND it quietly ran up another 4.2M tokens and $7 on a little background Haiku model for all the web fetching and searching 😄

**Code:**
Sol generated 59 files versus only 44 by Fable, but both of them used only about 8 data sources. Important: Fable ignored the word "only" and pulled 6 files from a different source, World Bank stats (though only 2 actually ended up in the model), plus numerous web searches.
So if Sol created so many artifacts, what was it doing? For example, in addition to the slide attached to this post, it created 4! versions of the same slide in additional formats.

**Behaviour:**
Sol behaved very interactively and during a 1-hour session asked me more than 10 clarification questions: from my citizenship to my preferences on slide format (and still created just a table). It was in plan mode, just like Fable — but Fable only checked some technical details 3 times at the beginning and then ignored me for the rest of the 2.5-hour session.

**Modeling:**
Here both went the same road at the start: score sectors from Ukrstat → build a 10-year cash flow for each opportunity → calculate IRR and MOIC → pack it into a portfolio with limits. And honestly, both admitted the same dirty secret: real data only drives the sector screening and the macro picture. Every return number inside the deal models is an assumption typed by hand 😅 So "based only on official data" is true for screening, not for the money math — for both of them.

Where they split:
Sol went classic finance banker. NPV with a 20% hurdle, three scenarios (down / base / up), and — the nice part — a REAL living Excel model where formulas recalculate, plus a self-check sheet that validates its own numbers (capital = 10? probabilities = 100%? ✅). Very "give this to the investment committee tomorrow".
Fable went quant nerd. 20,000 Monte Carlo simulations, probability of losing money, and a Kelly-style optimizer that maximizes log-wealth to avoid ruin. But no NPV at all. Very "I won't give you one number, I'll give you the whole distribution".
Funny result: Sol is the optimist (5.8x base return) because nothing drags his average down. Fable is the pessimist (2.7x expected, only 1.7% chance to lose money) because Monte Carlo keeps him humble.

**Overall:**
Sol = better deliverable engineer. Cheaper, faster, only official sources, Excel ready to send to a client. But talked to me too much and built 4 versions of one slide instead of thinking.
Fable = better analyst. Deeper risk math, wider research, nicer written story. But ignored my "only", spent more money, and quietly cloned itself into 8 agents to do all the reading while asking me absolutely nothing 🥲

If I could merge them: Fable's Monte-Carlo brain inside Sol's Excel body. That's the assistant I actually want.

Not a benchmark. Just one messy Ukrstat task. But it matches exactly what I feel every day at work.

Which one is your type — the chatty banker or the silent quant? 👇
