# Ukraine: Where to Invest $10M for Maximum 10-Year Return
### Investment research — 9 July 2026 · Ukrainian-resident private investor · USD returns, after Ukrainian tax

> One-slide version: `slide/slide.html`. Every figure traces to `sources/SOURCES.md` (official data)
> or `sources/briefs/*.md` (source-linked memos). Calculations reproduce via `uv run calculations/0*.py`.

---

## 1. Executive summary

**Recommendation:** deploy $10M into five positions — **farmland ($2.5M), an IT-outsourcing acquisition
($2.5M), flexible power generation ($2.0M), a defense-tech venture basket ($1.5M), and a UAH OVDP
ladder ($1.5M)** — for a probability-weighted **2.69x nominal USD multiple over 10 years
(~13.3%/yr blended expected IRR after Ukrainian taxes)**, with a Monte Carlo median outcome of
**$26M** and only ~2% probability of ending below the starting $10M in nominal terms.

The portfolio is built to win in *either* macro branch, not to bet on one:

- **If peace/EU-accession momentum (40% weight):** farmland converges toward EU price levels
  (Ukraine is at 17–25% of Bulgarian/Romanian/Hungarian prices), the IT company re-rates from
  3.5x to 6–7x EBITDA, warehouse/energy assets re-rate — portfolio ≈ **3.55x**.
- **If frozen war (40%):** war-economy cash engines dominate — gas CHP paybacks of 2–4 years,
  BESS ancillary contracts, defense-tech growth, 15%+ tax-free OVDP carry — portfolio ≈ **2.47x**.
- **If escalation (20%):** defense-tech (the one asset whose *bear* case is its *best* case) and
  CHP cash flows offset farmland/UAH losses — portfolio ≈ **1.43x** nominal (≈ capital preservation).

**The three highest-conviction single ideas** on the evidence: (1) IT-outsourcing M&A at 3–4x EBITDA
(a 35–65% discount to peers, with a state-sanctioned 9%/5% tax regime); (2) farmland at ~$1,500–2,500/ha
(4–7x farm EBITDA/ha; resident-only market = structural discount a Ukrainian citizen can uniquely
exploit); (3) distributed flexible generation (2–4-year paybacks created by 43.5 GW of destroyed
generation and 5-year EUR-fixed Ukrenergo capacity contracts).

---

## 2. Investor profile and binding constraints

Confirmed with the client: **Ukrainian citizen/resident**, broad scope (direct + liquid instruments).

Constraints that shaped everything (brief 08, brief 06):
- **Farmland access is a citizenship privilege**: only Ukrainian citizens/fully-Ukrainian-owned entities
  may buy; foreigners are banned pending a referendum — the buyer pool is artificially small **now**,
  which is exactly why entry prices are 4–13x below EU comparables.
- **Capital controls**: outbound investment is still blocked for individuals (e-limits suspended;
  ~UAH 100k/mo card routes only). Offshore instruments (eurobonds, LSE/WSE equities) are practical
  only if part of the $10M already sits offshore. Onshore structuring note: new FX capital brought
  into a Ukrainian company's charter capital since May-2025 creates an NBU **"investment limit"**
  that legalizes future repatriation — route entries through it.
- **Tax**: 18% CIT; 10% total on dividends to a resident individual; 23% on securities gains;
  **0% on OVDP**; Diia City 9% exit-capital tax. The model applies these rates.
- **War-risk insurance**: state ECA scheme + CMU Res. 1541 premium subsidy caps effective cost near
  **1% of sum insured** (small caps per company) — modeled as a 1% annual drag on physical assets.

---

## 3. Data foundation

Primary: **Derzhstat SDMX API** (the new stat.gov.ua Data Bank). Despite the official martial-law
suspension notice, the Data Bank carries: GVA by sector to **2025**, capital investment by sector to
**2025**, goods trade to **2024/2025-07**, CPI to **2026-M06**, construction to **2026-M05**,
quarterly GDP to **2026-Q1**. Wages stop at 2020 (suspended).
Verification: Derzhstat-computed nominal USD GDP and real growth match World Bank **to the decimal**
for 2015–2025 (see `outputs/macro_baseline.csv`) — the pipeline is sound.

Macro baseline (official):

| Year | FX avg | CPI Dec/Dec | GDP $bn | Real growth |
|---|---|---|---|---|
| 2021 | 27.28 | 10.0% | 199.8 | +3.4% |
| 2022 | 32.37 | 26.6% | 161.9 | **−28.8%** |
| 2023 | 36.58 | 5.1% | 181.2 | +5.5% |
| 2024 | 40.16 | 12.0% | 190.8 | +3.2% |
| 2025 | 41.69 | 8.0% | 214.2 | +1.8% |
| 2026 | 43.79* | 5.7% YTD-Jun | — | 1.0–1.6%F (IMF) |

\* Jan–Jul average; spot 44.48 on 2026-07-09.

---

## 4. Scenarios (probabilities are the single biggest judgment in this report)

| Scenario | P | Sketch | FX drift | Real GDP |
|---|---|---|---|---|
| **PEACE** | 0.40 | Durable ceasefire by ~2028; EU accession track (Cluster 1 opened Jun-2026; Brussels range 2030–34); $588bn RDNA5 reconstruction demand starts flowing | −3%/yr | +5.0% |
| **FROZEN** | 0.40 | War grinds on / frozen; muddle-through with Western financing | −7%/yr | +1.5% |
| **ESCALATION** | 0.20 | Major escalation; financing stress; second sovereign restructuring | −14%/yr | −3% |

Anchors: Polymarket ceasefire-before-2027 ≈ 25–40%; eurobond pricing implies ~50% odds of
re-restructuring within 5y; EBRD publishes a 2.5%/5.0% war/ceasefire GDP pair; realized managed-float
FX drift is 7.2%/yr. Over a 10-year window, cumulative settlement odds must exceed any single year's —
hence 40/40/20. **Stress test:** even at bearish 25/45/30 the chosen portfolio returns 2.42x.

---

## 5. Sector screen (11 sectors, 9 criteria, official data + cited judgment)

Composite = weighted sum of normalized criteria; data criteria from Derzhstat (pre-war USD GVA CAGR,
wartime GVA resilience 2025/2021, capital-investment momentum); judgment criteria each carry a citation
(see `outputs/sector_scores.csv`).

| Rank | Sector | Score | The data that drives it |
|---|---|---|---|
| 1 | **Defense tech** | 7.29 | Output capacity $1bn→$35bn (35x, 2022–25); exports legalized 1-Jul-2026 (20% levy); UA assets at 2.5–6x revenue vs 10–14x EU peers |
| 2 | **Energy (solar/BESS/DG/biomethane)** | 7.09 | The **only major private sector whose USD GVA grew through the war** (D: 1.42x 2025/2021, official); CHP paybacks 2–4y; EUR-fixed 5-yr Ukrenergo contracts |
| 3 | **Farmland & primary agriculture** | 6.84 | Price +96% UAH since 2021 yet 17–25% of BG/RO/HU levels; 15–25% unlevered EBITDA yield; 56.6% of goods exports are agri (computed, 2024) |
| 4 | **IT services & Diia City** | 6.61 | Exports bottomed 2024 (+3.3% 2025, +3.7% YTD-26); M&A at 3–4x EBITDA; Diia City = 4,000+ residents |
| 5 | **Liquid sovereign credit** | 6.53 | OVDP 15.1–15.8% tax-free; eurobonds ~58–65 = asymmetric peace optionality |
| 6 | Logistics & warehousing | 5.72 | Kyiv vacancy 3–3.5%, take-up record; but big-box value ≤ replacement cost |
| 7 | Residential development | 5.67 | Dev margins 25–40% Lviv/Kyiv; eOselia props demand; FX-naked UAH revenue |
| 8 | Agro-processing | 5.54 | Crush overcapacity (negative margins 2 seasons); niches (berries/organic/dairy) attractive |
| 9 | Construction materials | 5.01 | Reconstruction-contingent; cement −30% vs pre-war |
| 10 | Consumer/retail/pharma | 4.93 | Real-wage recovery but few distressed entries |
| 11 | Metals & mining | 3.88 | Exports collapsed $22.3bn→$7.3bn; Ferrexpo precedent = governance risk |

---

## 6. The opportunities (10-year, per $1M, USD, after tax)

| Opportunity | Exp. IRR | Exp. MOIC | PEACE | FROZEN | ESCAL. | Core evidence |
|---|---|---|---|---|---|---|
| IT outsourcing acquisition @3.5x EBITDA | **21.2%** | 4.32x | 6.83x | 3.40x | 1.15x | briefs/04: Euvic buy-box 3–4x; exit re-rate to 4–6.5x; Diia City taxes |
| Flexible generation (CHP+BESS) | **16.6%** | 2.08x | 1.72x | 2.54x | 1.89x | briefs/02: payback 2–4y; 863 MW auctioned 2025; deficit persists in war scenarios |
| Defense-tech venture basket | **10.7%** | 2.23x | 1.92x | 2.39x | 2.54x | briefs/03: $105M 2025 funding; MITS/UA1/D3 vehicles; **counter-cyclical hedge** |
| Farmland 2,000+ ha via LLC | **9.6%** | 2.42x | 3.45x | 2.08x | 1.03x | briefs/01: $1,800/ha entry; EU convergence 4–6x gap; 4.5% net lease carry |
| Warehouse small-format build-to-lease | 9.6% | 2.10x | 2.55x | 2.02x | 1.38x | briefs/05: ~14% yield-on-cost, 3% vacancy |
| Solar PV (operating plants) | 8.1% | 1.84x | 2.17x | 1.78x | 1.28x | briefs/02: ~11% EBIT yield at $650k/MW asks |
| UAH OVDP ladder (tax-free) | 4.8% | 1.69x | 2.27x | 1.55x | 0.82x | briefs/06: 14–15.8% UAH, 0% tax; USD return = carry − FX drift |
| Ukraine eurobonds B-2036 @58 | 2.2% | 1.39x | 2.04x | 1.13x | 0.60x | briefs/06: +30–60% on peace vs −40% on re-default; **the 2022–25 multi-bagger is gone** |

Notes: farmland modeled as *passive* (lease income); self-operating adds the 15–25%/yr farm EBITDA
channel at operational risk. Defense VC is deliberately conservative (2.2–3.0x net TVPI vs power-law
upside). Eurobond math is why "buy Ukraine debt" — the obvious trade — no longer maximizes return:
warrants already did 4.6x from the 2022 trough and were retired in the Dec-2025 restructuring.

---

## 7. Portfolio: $10M allocation

Optimizer: maximize expected **log** terminal wealth (compounded-growth criterion with built-in ruin
aversion) under documented capacity caps (deal-size realities per brief) and ≥15% liquidity.

| Position | $M | Weight | Why it makes the cut |
|---|---|---|---|
| **Farmland (~1,500–2,000 ha, central/west, via Ukrainian LLC)** | 2.52 | 25.2% | Highest-convexity peace asset that still carries ~4.5% net cash yield in war; citizen-only access |
| **IT outsourcing acquisition (~100-person, Diia City)** | 2.50 | 25.0% (cap) | Highest expected IRR; USD revenue; earn-out structures standard; MergeWave/InVenture deal flow |
| **Flexible generation: gas CHP portfolio + BESS auction** | 1.98 | 19.8% | War-economy cash engine; 2026 Ukrenergo ≥500 MW auction entry; EUR-fixed revenue |
| **Defense-tech venture (2–3 funds + Brave1 co-invest)** | 1.50 | 15.0% (cap) | Only asset that pays MORE in escalation; export legalization = new revenue ceiling |
| **UAH OVDP ladder (Diia/ICU, 1–3y)** | 1.50 | 15.0% | Tax-free 15% carry; dry powder for distressed opportunities; liquidity floor |
| Solar / warehouse / eurobonds | 0 | — | Dominated: lower expected return than the funded five at equal or higher risk |

**Scenario outcomes:** PEACE 3.55x · FROZEN 2.47x · ESCALATION 1.43x → expected **2.69x**;
blended expected IRR **13.3%/yr**.
**Monte Carlo (20,000 paths):** median **$26.0M**; p25–p75 $19.5–33.1M; p5 $11.6M; p95 $45.9M;
P(end < $10M) = 1.7%; P(end > $25M) = 53.9%.
(MOICs are nominal cumulative distributions; interim cash is not compounded — conservative.)

### Execution roadmap (first 12 months)
1. **OVDP first** (week 1): park the full $10M at ~15% tax-free while deploying.
2. **Farmland**: set up a 100% Ukrainian-owned LLC; target Poltava/Khmelnytskyi/Vinnytsia at
   $1,500–2,200/ha and Land Bank lease auctions; expect 12–24 months to assemble 1,500+ ha
   (avg plot 2.24 ha — this is an operations game; budget 1 full-time land manager).
3. **IT M&A**: mandate MergeWave Capital + InVenture; screen for ≥60% non-US-election-exposed
   clients, ≥50% staff with deferments or female/abroad, Diia City residency; structure 50–60%
   upfront + 12–24-month earn-out (wartime standard).
4. **Flexibility**: bid the announced ≥500 MW 2026 Ukrenergo auction via a JV with an operating
   developer; in parallel, 2–4 CHP units (€0.2–0.6M each) contracted to industrial offtakers.
5. **Defense**: LP commitments to two of MITS Lightning / UA1 / Green Flag II (+Brave1 Invest club
   for co-invests); insist on export-revenue exposure in portfolio construction.
6. **Insurance**: register every physical asset under CMU Res. 1541 subsidy + ECA war-risk cover
   (effective ~1%); site selection west of the Dnipro where feasible.

---

## 8. Risk map (what breaks this)

| Risk | Exposure | Mitigation in the construction |
|---|---|---|
| Escalation destroys physical assets | Farmland (mined/occupied), CHP, warehouses | 1% state-subsidized insurance; western siting; defense hedge sized 15% |
| UAH step-devaluation | OVDP, farmland carry, IT payroll (benefit) | 62% of portfolio revenue is USD/EUR-linked (IT exports, EUR-fixed BESS, land as real asset) |
| Second sovereign restructuring | OVDP haircut risk is historically low (domestic bonds serviced through 2022–26); eurobonds avoided | Zero eurobond weight; OVDP laddered short |
| Mobilization drains acquired workforce | IT company | Diia City + critical-status booking (50–100% quotas); staff-mix diligence pre-close |
| Governance/raider/ARMA | All onshore | BIT-less domestic status acknowledged; clean-title diligence; no regulated-monopoly sectors; bank-CIT precedent watched |
| Defense demand cliff on peace | Defense VC | Export legalization + EU rearmament channel; PEACE case modeled at only 1.92x |
| Land-reform reversal / referendum politics | Farmland | Base case keeps foreigner ban (supports scarcity premium); full reversal would hit exit liquidity — sized 25% |
| Fiscal opportunism (windfall taxes) | High-profit sectors | Bank 50% CIT precedent noted; diversified across regimes (Diia City, Group IV agro, standard) |

## 9. What to verify before committing money (top of the gap list)

1. Live per-series eurobond/C-note prices (terminal data) if the liquid sleeve is revisited.
2. KSE full-year 2025 land review (decompose the H2-2025 official price jump: mix-shift vs appreciation).
3. Ukrenergo 2026 auction documentation (price units, contract currency, collateral).
4. Closed IT deal comps from MergeWave (the 3–4x is buyer-stated).
5. LP terms/minimums for MITS Lightning, UA1, Green Flag II (unpublished).
6. Current military-levy application to land sales and the OVDP exemption statute text with counsel.

---

*Prepared 2026-07-09 from public official sources. Not financial advice; see README disclaimer.
All model parameters and their citations: `calculations/*.py` (inline comments) and `sources/`.*
