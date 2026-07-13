# Ukraine $10M / 10-Year Investment Opportunity Pack

## Recommendation

Deploy $9.0M across four direct-investment archetypes and retain $1.0M for target diligence and follow-on capital. The optimized illustrative portfolio produces a 22.9% base-case gross USD equity IRR and 5.76x MOIC. Probability-weighting the 25% downside, 50% base, and 25% upside cases produces a 24.6% IRR, 6.50x MOIC, and $3.48M NPV at a 20% USD hurdle. The modeled IRR range is 3.0% to 36.2%.

| Opportunity | Allocation | Base IRR | Base MOIC | Preferred footprint |
| --- | ---: | ---: | ---: | --- |
| Civilian sensing and autonomy platform | $3.0M | 28.9% | 9.0x | Lviv / Kyiv, distributed team |
| Soy/protein processing and traceable ingredients | $3.0M | 21.8% | 5.2x | Vinnytsia / Khmelnytskyi |
| Low-carbon construction materials plant | $1.5M | 21.0% | 4.8x | Lviv / Ternopil corridor |
| Distributed industrial power and storage SPV | $1.5M | 20.9% | 4.6x | Central / western industrial sites |
| Diligence and follow-on reserve | $1.0M | n/a | 1.0x residual | Held in USD until conditions clear |

These are deployable deal archetypes, not claims that named companies are currently for sale.

## Package contents

- `Ukraine_10M_Investment_Thesis.pptx` - one editable 16:9 investment-committee slide.
- `Ukraine_10M_Investment_Thesis.pdf` and `.png` - page-exact high-resolution exports.
- `Ukraine_Investment_Model.xlsx` - formula-driven model with `Read Me`, `Sources`, `Sector Screen`, `Opportunity Assumptions`, `Cash Flows`, `Portfolio & Scenarios`, and `Checks` sheets.
- `sources/raw/` - archived official Ukrstat, National Bank of Ukraine, UkraineInvest, and territory-order source files.
- `sources/source_register.csv` - 19-source register with publisher, URL, period, units, transformations, and caveats.
- `calculations/` - normalized sector data, scoring, opportunity and portfolio cash flows, data dictionary, portfolio summary, artifact builders, and QA evidence.

## Methodology

1. Ukrstat is the statistical backbone. The model uses official enterprise performance, financial results, balance-sheet, investment, national-accounts, trade, output, and value-added series. NBU, UkraineInvest, and the official territory order supply macro, incentive, priority-sector, and geographic context.
2. Relevant NACE/KVED sectors are scored 0-100 using: profitability/cash generation 20%, real growth/recovery 20%, export or import-substitution potential 15%, capital efficiency 15%, structural/reconstruction demand 15%, and resilience/geographic/data confidence 15%.
3. Nominal turnover is deflated consistently using official NBU macro inputs. Periods, units, NACE mappings, transformations, and martial-law data caveats are documented instead of backfilled with invented observations.
4. Six opportunity candidates are converted into ten-year USD cash-flow models. The portfolio optimizer selects four investments subject to a $3M maximum ticket, $1M reserve, three independent demand drivers, safer-region policy, and no direct-weapons exposure.
5. Scenario returns are gross USD equity IRR and MOIC after modeled 18% portfolio-company tax, before investor-level taxes, fees, and carried interest. The base case is unlevered. Terminal multiples, FX, growth, margins, capital intensity, working capital, and ramp timing are editable analyst assumptions.

## Official observations versus analyst estimates

- Official observations are archived in `sources/raw/`, registered in `sources/source_register.csv`, normalized in `calculations/normalized_sector_data.csv`, and shown in black in the workbook.
- Analyst assumptions are shown in blue on `Opportunity Assumptions`. They include revenue ramp, EBITDA margin, capital intensity, working capital, terminal multiple, FX path, exit timing, and scenario adjustments.
- Workbook formulas are black; cross-sheet links are green. Yellow cells mark attention or refresh items.
- Return forecasts, sector score subcomponents without direct official series, locations, deal terms, target profiles, and exit multiples are analyst judgments rather than Ukrainian government forecasts.

## Update and reproducibility

Run commands from the workspace root. Use the bundled Codex Node/Python runtimes or equivalent installations with `@oai/artifact-tool` and `reportlab` available.

```bash
node outputs/ukraine_10m_investment_pack_2026/calculations/reproduce_analysis.mjs
node outputs/ukraine_10m_investment_pack_2026/calculations/build_workbook.mjs
node outputs/ukraine_10m_investment_pack_2026/calculations/build_slide.mjs
python3 outputs/ukraine_10m_investment_pack_2026/calculations/export_slide_pdf.py
```

Before an investment decision, replace or append the raw official files, update `source_register.csv`, rerun the analysis, review all blue assumptions, and refresh the official territory list, FX rate, taxation, sanctions, insurance eligibility, and incentive terms. The statistical and macro source snapshot was retrieved on 9 July 2026; the consolidated territory list was refreshed on 10 July 2026 and incorporates the June 2026 amendments.

## Validation completed

- Total capital equals $10.0M; invested capital equals $9.0M; reserve equals $1.0M.
- Four selected opportunities; no ticket exceeds $3.0M.
- Scenario probabilities total 100%; all cash flows, terminal values, IRR, MOIC, NPV, and portfolio totals tie.
- Formula-error scan returned zero matches; every workbook check reports `OK`.
- Base portfolio IRR exceeds the 20% hurdle; downside, base, upside, and probability-weighted outputs match across calculations, workbook, and slide.
- Every workbook sheet and the final PPTX/PDF page were rendered and visually inspected; the slide overflow test passed.

## Limitations and decision conditions

Martial-law reporting gaps, revisions, coverage exclusions, liquidity constraints, security incidents, insurance availability, FX convertibility, sanctions, and target-level execution can materially change results. Enterprise statistics may exclude banks, budget institutions, occupied territories, and areas where hostilities are or were conducted, as documented in the source register. Physical assets must remain outside officially designated active-hostility and occupied territories, with the current order refreshed at diligence and closing. Dual-use exposure is limited to businesses with a credible civilian revenue path; direct weapons manufacturing is excluded.

This pack is illustrative investment research, not a return guarantee or personalized legal, tax, sanctions, securities, or investment advice. Do not deploy capital until commercial, financial, legal, tax, security, technical, end-use, insurance, and governance diligence is complete.
