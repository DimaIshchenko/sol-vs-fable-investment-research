# Ukraine Investment Research — $10M / 10-Year Horizon

Investment research for a **Ukrainian-resident private investor** with **$10M**, optimizing for
**maximum return over 10 years (2026–2036)**, built on official Ukrainian statistics
([stat.gov.ua](https://stat.gov.ua/en) SDMX API, NBU, MinFin) plus institutional sources
(World Bank RDNA5, IMF, KSE), compiled **9 July 2026**.

## Headline result

| | |
|---|---|
| Recommended allocation | Farmland **$2.5M** · IT-outsourcing acquisition **$2.5M** · Flexible generation (gas CHP + BESS) **$2.0M** · Defense-tech venture **$1.5M** · UAH OVDP ladder **$1.5M** |
| Expected outcome | **2.69x** nominal MOIC / **~13.3%/yr** blended expected IRR (USD, after Ukrainian taxes) |
| Scenario MOICs | Peace 3.55x · Frozen war 2.47x · Escalation 1.43x |
| Monte Carlo (20k paths) | median **$26.0M**, p5 $11.6M, p95 $45.9M, P(nominal loss) 1.7% |

See `report.md` for the full analysis and **`slide/slide.html`** for the one-slide summary
(published at https://claude.ai/code/artifact/0eaa9841-ebbc-4851-b2d6-1c0a14d9bd51).

## Repository layout

```
report.md                  full written analysis
slide/slide.html           the one big slide (self-contained HTML)
sources/SOURCES.md         every source, access date, cross-checks, gaps
sources/briefs/*.md        8 research memos (farmland, energy, defense, IT, real estate,
                           liquid instruments, agro-processing, risk parameters)
data/raw/                  downloaded official data (Derzhstat SDMX, NBU, World Bank)
calculations/01..04*.py    the model pipeline (see below)
calculations/outputs/      CSV results each script emits
```

## Reproducing the calculations

Requires [uv](https://docs.astral.sh/uv/) (each script declares its own deps via PEP 723):

```bash
uv run calculations/01_macro_baseline.py    # FX, CPI, GDP series + scenario assumptions.json
uv run calculations/02_sector_screen.py     # sector scoring model -> sector_scores.csv
uv run calculations/03_opportunity_models.py# 8 opportunities x 3 scenarios -> IRR/MOIC
uv run calculations/04_portfolio.py         # $10M allocation + 20k-path Monte Carlo
```

Scripts are deterministic (fixed RNG seed) and run from `data/raw/` only — no network access needed
to reproduce. To refresh the raw data, the exact download commands/URLs are in `sources/SOURCES.md §1`.

## Method in one paragraph

Official Derzhstat data (GVA by sector to 2025, trade to 2024/25, capital investment to 2025, CPI to
2026-M06) provides growth, wartime-resilience, and export metrics per sector; eight source-linked
research briefs provide entry pricing, yields, and market rules per opportunity; three scenarios
(Peace 40% / Frozen 40% / Escalation 20%, anchored to prediction-market and bond-implied odds) drive
explicit 10-year after-tax USD cash-flow models per opportunity; a max-expected-log-wealth optimizer
under documented capacity caps produces the allocation; Monte Carlo quantifies the outcome distribution.

## Disclaimer

This is an analytical exercise, **not financial advice**. It was produced by an AI research pipeline
from public sources on 2026-07-09; figures marked low-confidence in `sources/` should be re-verified
before any transaction. Wartime investment in Ukraine can result in total loss of invested capital.
Verify current law (land, tax, currency control, mobilization) with Ukrainian counsel before acting.
