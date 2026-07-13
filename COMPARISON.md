# Sol vs Fable — detailed comparison

Two AI coding agents, the same [prompt](./PROMPT.md), the same data source (official Ukrainian government statistics). This document has two layers:

1. **Headline** — the figures as I reported them publicly (from each tool's own cost/usage UI).
2. **Appendix** — the same session re-measured directly from the raw session logs, for anyone who wants the fuller token accounting.

---

## 1. Headline

### Performance
- **Sol** spent **1.2M tokens** at an estimated **~$28**. Notably, 1.1M of those were input tokens.
- **Fable** spent **0.9M tokens** at an estimated **~$80** — and separately called a **Haiku** model for web fetching and search, adding **4.2M tokens / ~$7**. It effectively decided I could read the figures myself and delegated the reading to a junior model.

### Code
- **Sol generated 60 files** vs **Fable's 45**, but both ultimately parsed only **~8 data sources** in code.
- **Fable ignored the word "only"**: it pulled in World Bank data (6 files downloaded, 2 actually used) plus numerous web searches, whereas Sol stayed on official Ukrainian government sources.
- Where did Sol's extra files go? Polish: e.g. it produced **4 versions of the same slide** in additional formats (PPTX, PDF, PNG, plus QA renders).

### Behaviour
- **Sol was highly interactive** — 10+ clarifying questions in a ~1h session (from my citizenship to my slide-format preferences… and still delivered a table).
- **Fable** checked a few technical details at the very start, then worked silently for the rest of a ~2.5h session.

### Modeling
Both built the same skeleton: **score sectors from official data → 10-year, 3-scenario cash-flow model per opportunity → IRR & MOIC → constrained portfolio**. Both were honest that the raw data mainly drives the *screening* and macro layers, while the deal-level return assumptions are hand-set.

Where they split (see the side-by-side below):
- **Sol** = classic finance banker — NPV @ 20% hurdle, a **live formula-driven Excel model** with a self-validating checks sheet.
- **Fable** = quant — **20,000-path Monte Carlo**, probability-of-loss, and a **Kelly-style log-wealth optimizer** (but no NPV).

### Overall
- **Sol** — better *deliverable engineer*: cheaper, faster, official-only sources, Excel ready to hand to a client. But over-asked and spent effort making four slide versions.
- **Fable** — better *analyst*: deeper risk math, wider research, a nicer written story. But ignored "only", cost more, and quietly outsourced the reading to a junior Haiku.

---

## 2. Modeling, side by side

| | Sol (Codex) | Fable (Claude) |
|---|---|---|
| Sector screen | 12 NACE sectors, 0–100; ~55% of weight data-derived | 11 sectors × 9 criteria; ~25% of weight data-derived |
| Scenarios | Downside 25% / Base 50% / Upside 25% | PEACE 40% / FROZEN 40% / ESCALATION 20% |
| Return metrics | IRR, **NPV @ 20% hurdle**, MOIC | IRR, MOIC (undiscounted, no NPV) |
| Risk analysis | 3 discrete scenarios only | **20,000-path Monte Carlo** → wealth percentiles, P(loss) |
| Portfolio method | brute-force combinatorial (best 4-of-6, ≥3 demand drivers) | **Kelly / max expected log-wealth** via `scipy` SLSQP |
| Excel model | ✅ live, formula-driven, self-checking sheet | ✗ (Python only) |
| Headline return | 5.76× base MOIC / 22.9% base IRR | 2.69× expected MOIC / ~13.3%/yr; MC median $26M, P(loss) 1.7% |

**Recommended portfolios (they diverge):**

| Sol (Codex) | $ | Fable (Claude) | $ |
|---|---|---|---|
| Dual-use sensing & autonomy (NACE 72) | $3.0M | Farmland (~1,500–2,000 ha) | $2.52M |
| Soy / protein processing (NACE 10) | $3.0M | IT-outsourcing acquisition | $2.50M |
| Low-carbon construction materials (NACE 23) | $1.5M | Flexible generation (gas CHP + BESS) | $1.98M |
| Distributed power & storage (NACE 35) | $1.5M | Defense-tech venture basket | $1.50M |
| Diligence / reserve (USD) | $1.0M | UAH OVDP ladder (tax-free) | $1.50M |

*(Sol's headline MOIC is rosier partly because it has no Monte Carlo pulling the expectation down.)*

---

## 3. Sources

| | Sol (Codex) | Fable (Claude) |
|---|---|---|
| Registered sources | 19, **all official/primary** (Ukrstat, NBU, UkraineInvest, Rada) | 12 primary datasets **+ ~528 URL citations across ~255 domains** |
| Secondary/press sources | none | many (Interfax, Kyiv Independent, CBRE, KPMG/PwC, PitchBook, Polymarket, …) |
| Acquisition | mostly direct `curl` of official endpoints + 16 targeted searches | heavy WebSearch/WebFetch (321 calls) + `curl` to APIs |

Sol was narrow and purist (official-only, cleaner but thinner on market color). Fable cast a wide net (richer, but mixes source quality).

---

## 4. Data usage — downloaded vs actually parsed

A key shared finding: in **both** repos the raw data feeds only the sector *screen* and macro context — **none of it flows into the final cash-flow models or the dollar allocation** (those rest on hand-set, cited assumptions).

| | Sol (Codex) | Fable (Claude) |
|---|---|---|
| Raw files downloaded | 28 (~70 MB) | 18 (~108 MB) |
| Parsed by code | **7** (25% by count, ~54% by bytes) | **8** (44% by count, ~83% by bytes) |
| Never read | 21 (all PDFs/HTMLs/xlsx, FX JSONs, redundant codelists) | 10 (industry 10 MB, harvests 6.5 MB, 4 World Bank pulls, wages, construction, housing, 1 failed-download error page) |

Both genuinely parse their large JSON/CSV files (not transcribed by hand) — so the top-end download effort is real — but each consumes them as thin slices.

---

## Appendix — measured directly from the session logs

These are **raw token counts pulled from each tool's session transcript**, which include cache-read tokens and sub-agent activity. They are a different (fuller) accounting than the billed/UI headline figures above — that is why the totals look much larger. Both views are correct; they measure different things.

### Fable (Claude Code, `claude-fable-5`)
- **726 API calls** — 232 in the main session + 494 across **8 parallel `general-purpose` sub-agents** (which is where the "Haiku helper" web work lives).
- Output **731K** tokens · uncached input **698K** · cache-creation **4.66M** · **cache-read 72.6M** → **~78.7M total tokens through the model** (~92% cache reads).
- **~2h 21m** wall-clock. Tools: **206 WebSearch + 115 WebFetch** + 57 Bash + 18 Write + 8 Agent.
- List-price estimate at Fable-5 rates ≈ **$174** (≈$87 at Opus-4.8 rates). No oversized data file ever entered context.

### Sol (Codex, `gpt-5.6-sol`, reasoning `xhigh`)
- **~34M total tokens** for the full session (31.6M for the main build): output **110K**, reasoning **34.6K**, and ~**96% of input served from cache**. Fresh (uncached) input ≈ 1.38M.
- **~58 min active** compute (across sittings). Tools: **255 `exec` (shell) + 16 web_search + 18 apply_patch**, 192 reasoning events.
- Ran on a **ChatGPT Plus subscription → ~$0 marginal cost** (consumed 1%→11% of the 5-hour rate-limit window).

### Note on file counts
The published folders as copied contain **59 files (Sol)** and **44 files (Fable)** — the headline "60 / 45" are the counts as I first reported them; the one-file differences are immaterial (a montage/QA artifact).

---

*Not investment advice. See [DATA.md](./DATA.md) and the repo [README](./README.md) disclaimer.*
