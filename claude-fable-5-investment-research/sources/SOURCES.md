# Sources & Provenance

All sources accessed **2026-07-09** unless noted. This file lists (1) primary datasets downloaded into
`data/raw/`, (2) research briefs with their own inline citations, (3) cross-checks performed, and
(4) known gaps and conflicts. Every number in `report.md` and the slide traces to one of these.

---

## 1. Primary datasets (`data/raw/`)

| File | Source | What it is | Coverage |
|---|---|---|---|
| `statgov_cpi_ua.csv` | [Derzhstat SDMX API v3](https://stat.gov.ua/en/development-api/sdmx-api-v3), dataflow `SSSU:DF_PRICE_CHANGE_CONSUMER_GOODS_SERVICE(27.2.0)`, filtered REGION=UA-total | CPI indices, core inflation, avg consumer prices | 2021-01 → 2026-06 |
| `statgov_gdp_annual.csv` | dataflow `SSSU:DF_ANNUAL_NATIONAL_ACCOUNTS(7.0.0)` | GDP/GVA by NACE activity, current & constant prices | 2010 → 2024 |
| `statgov_gdp_quarterly.csv` | dataflow `SSSU:DF_QUARTERLY_NATIONAL_ACCOUNTS(14.0.0)` | Quarterly + annual GDP/GVA by NACE (preliminary) | 2019 → 2026-Q1 (annual GVA to 2025) |
| `statgov_trade_goods.csv` | dataflow `SSSU:DF_EXTERNAL_TRADE_OF_GOODS(6.0.0)`, REGION=UA-total | Goods exports/imports by HS chapter/group, USD thous. | 1996 → 2025-07 (annual to 2024) |
| `statgov_capital_inv.csv` | dataflow `SSSU:DF_CAPITAL_INVESTMENTS_A(3.0.1)`, REGION=UA-total | Capital investment by NACE, UAH | 2010 → 2025 |
| `statgov_wages.csv` | dataflow `SSSU:DF_SALARY_LEVEL_OF_EMPLOYEES(6.0.0)` | Wages by activity — **publication suspended, stops at 2020** | 2016 → 2020 |
| `statgov_housing_prices.csv` | dataflow `SSSU:DF_PRICE_CHANGE_HOUSING_MARKET(16.0.0)` | Housing price indices | 2016 → 2026-Q1 |
| `statgov_construction.csv` | dataflow `SSSU:DF_ECONOM_INDC_SHORT-TERM_CONSTRUCTION_STAT(16.0.0)` | Construction output indices | 2010 → 2026-M05 |
| `statgov_harvests.csv` | dataflow `SSSU:DF_AREA_HARVESTS_CROP_YIELD_A(2.0.0)` | Areas, harvests, yields by crop | 2015 → 2026 |
| `statgov_industry.csv` | dataflow `SSSU:DF_IND_SHORT_STAT_INDUSTR_STAT(14.0.0)` | Industrial production indices | 2017-M01 → 2026-M04 |
| `nbu_usd_daily.json` | [NBU Exchange API](https://bank.gov.ua/NBU_Exchange/exchange_site?start=20210101&end=20260709&valcode=usd&sort=exchangedate&order=asc&json) | Official UAH/USD daily rate | 2021-01-01 → 2026-07-09 |
| `worldbank_*.json` | [World Bank API v2](https://api.worldbank.org/v2/country/UKR/indicator/), indicators NY.GDP.MKTP.CD, NY.GDP.MKTP.KD.ZG, FP.CPI.TOTL.ZG, NV.AGR.TOTL.ZS, NE.EXP.GNFS.CD, BX.KLT.DINV.CD.WD | GDP, growth, CPI, agri share, exports, FDI | ~1990 → 2025 |

API base used: `https://stat.gov.ua/sdmx/workspaces/default:integration/registry/sdmx/3.0/data/dataflow/SSSU/{FLOW}/{VER}/*?attributes=none&c[REGION]=UA00000000000000000&c[TIME_PERIOD]=ge:YYYY`
with `Accept: application/vnd.sdmx.data+csv;version=2.0.0`. Documented at
[stat.gov.ua/en/development-api](https://stat.gov.ua/en/development-api).

**Martial-law caveat (official):** Derzhstat [suspended publication](https://stat.gov.ua/en/news/suspend-publication-statistical-information)
of most statistics during martial law except CPI, goods export-import, preliminary GDP, and selected releases.
In practice the Data Bank carries more than the minimum (GVA to 2025, capital investment to 2025,
construction to 2026-M05), but wages stop at 2020 and detailed trade lags ~1 year. 2022+ data exclude
occupied territories — sector aggregates understate pre-war-comparable activity.

## 2. Research briefs (`sources/briefs/`)

Each brief is a source-linked research memo compiled 2026-07-09 by parallel research passes; every
figure carries its own URL and confidence flag inside the file.

| Brief | Topic | Key primary sources inside |
|---|---|---|
| `01-farmland.md` | Land market since 2021 opening | KSE Land Market Review Q4-2024, Eurostat land prices, Opendatabot/InVenture, FREE Network |
| `02-energy.md` | Solar/BESS/CHP/wind/biomethane economics | Ukrenergo auctions, DTEK/Fluence, IEA biomethane, Green Deal Ukraina winter report, NEURC caps |
| `03-defense-tech.md` | Defense-tech market & venture | Brave1/RNBO, MoD, Kyiv Independent, DealBook of Ukraine 2026, export-mechanism decisions Jul-2026 |
| `04-it-sector.md` | IT exports, Diia City, M&A multiples | NBU BoP via IT Ukraine Assoc./Lviv IT Cluster, KPMG M&A Radar, Euvic/dev.ua, PwC Diia City |
| `05-real-estate-logistics.md` | Warehouse/residential/office/reconstruction | CBRE Ukraine, Expandia, UTG, LUN, NBU FSR (via press), World Bank RDNA4/RDNA5, eOselia/eVidnovlennia |
| `06-liquid-instruments.md` | Eurobonds, C-notes, OVDP, equities, capital controls | MinFin, White & Case, Trium Capital, NBU liberalization strategy, index.minfin |
| `07-agro-processing.md` | Agri exports, crush, elevators, logistics | USDA FAS, UGA/UkrAgroConsult, Kernel FY2025 AR, Agrohub EBITDA/ha survey, EC DG Trade (DCFTA) |
| `08-risk-parameters.md` | FX, capital controls, war-risk insurance, tax, scenarios | NBU, IMF EFF PR 26/202, CMU Res. 1541, ECA, PwC tax, Consilium (EU accession), Polymarket |

## 3. Cross-checks performed

- **Nominal GDP (USD)**: Derzhstat (UAH, current prices, converted at NBU avg FX) vs World Bank —
  match to ±0.1bn for every year 2015-2025 (see `calculations/outputs/macro_baseline.csv`).
- **Real GDP growth**: computed from Derzhstat prices-of-previous-year identity vs World Bank series —
  identical to 0.1pp for 2016-2025 (2022: −28.8%, 2023: +5.5%, 2024: +3.2%, 2025: +1.8%).
- **Agri share of goods exports 2024**: computed from Derzhstat trade cube = 56.6% vs UCAB-reported 56.1% (2025) ✓.
- **FX anchors**: NBU API daily series matches brief 08 anchors (fix 29.25 Feb-2022; 36.57 Jul-2022; 42.39 end-2025; 44.48 Jul-2026).
- **Warehouse/energy/land figures**: at least two independent sources per headline number inside each brief (flagged where single-source).

## 4. Known gaps and conflicts (carried into the model as ranges/haircuts)

1. Official farmland prices understate true market (deals registered near the NMV floor) — KSE caveat;
   model entry uses $1,800/ha (above official $1,501 avg).
2. No published prime-yield series for CRE 2022-26 — cap rates triangulated (±200bp uncertainty).
3. IT M&A 3-4x EBITDA is buyer-stated (Euvic), not a closed-deal median.
4. July-2026 eurobond per-series prices not found in open sources — modeled at 58 (Dec-2025/Apr-2026 range 57-65).
5. Ukrenergo BESS auction price units ambiguous (UAH/MW settlement convention) — flexibility yields
   anchored to CHP paybacks instead.
6. No official UAH forecast beyond 2026 budget (45.6 avg) — scenario FX drifts derived from inflation
   differentials and realized managed-float drift.
7. Defense VC 2025 totals conflict by methodology ($105M Brave1 floor vs $129M DealBook vs $776M PitchBook
   Ukraine-linked) — brief uses $105M floor.
8. 2025 farm EBITDA/ha not yet published (Agrohub) — 2024 values ($446/ha blended) used as normalization anchor.
9. Wages by sector suspended after 2020; national average wage series via Derzhstat press releases only.
10. RDNA numbering: RDNA4 = Feb-2025 ($176bn damage), RDNA5 = Feb-2026 ($195bn damage, $588bn needs) —
    early drafts of this research mislabeled the Feb-2026 release; corrected throughout.
