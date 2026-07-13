# /// script
# dependencies = ["pandas", "numpy"]
# ///
"""
01_macro_baseline.py — macro series from official data + scenario assumptions.

Inputs (data/raw/):
  nbu_usd_daily.json            NBU official UAH/USD, daily, 2021-01-01..2026-07-09
  statgov_cpi_ua.csv            Derzhstat CPI (SDMX DF_PRICE_CHANGE_CONSUMER_GOODS_SERVICE v27.2.0)
  statgov_gdp_quarterly.csv     Derzhstat quarterly national accounts (DF_QUARTERLY_NATIONAL_ACCOUNTS v14.0.0)
  worldbank_*.json              World Bank API cross-checks

Outputs (calculations/outputs/):
  macro_baseline.csv            year x {fx_avg, fx_eop, cpi_decdec, gdp_nom_uah_bn, gdp_nom_usd_bn, real_gdp_growth}
  assumptions.json              scenario definitions used by 03/04

FX averages for 2015-2020 are NBU official annual averages (bank.gov.ua archive),
hardcoded because the NBU_Exchange API range request here covers 2021+ only.
"""
import json
import pandas as pd
import numpy as np
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW, OUT = ROOT / "data/raw", ROOT / "calculations/outputs"
OUT.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------- FX (NBU)
fx = pd.DataFrame(json.load(open(RAW / "nbu_usd_daily.json")))
fx["date"] = pd.to_datetime(fx["exchangedate"], format="%d.%m.%Y")
fx["year"] = fx["date"].dt.year
fx_yr = fx.groupby("year")["rate"].agg(fx_avg="mean", fx_eop="last").round(3)

# NBU official annual averages 2015-2020 (source: bank.gov.ua exchange-rate archive)
fx_hist = {2015: 21.845, 2016: 25.551, 2017: 26.597, 2018: 27.200, 2019: 25.846, 2020: 26.961}
for y, v in fx_hist.items():
    fx_yr.loc[y, ["fx_avg", "fx_eop"]] = [v, np.nan]
fx_yr = fx_yr.sort_index()

# ---------------------------------------------------------------- CPI (Derzhstat)
cpi = pd.read_csv(RAW / "statgov_cpi_ua.csv", dtype=str, low_memory=False)
c = cpi[(cpi.INDICATOR == "INDEX_CONSUMPRICE")
        & (cpi.BASE_PERIOD == "DEC_PREV_YEAR")
        & (cpi.GOODS_SERVICES_TYPE == "0")
        & (cpi.FREQ == "M")].copy()
c["value"] = c.OBS_VALUE.astype(float)
c["year"] = c.TIME_PERIOD.str[:4].astype(int)
c["month"] = c.TIME_PERIOD.str[6:].astype(int)
# December value of index (base = Dec of previous year) -> Dec/Dec inflation
dec = c[c.month == 12].set_index("year")["value"] - 100.0
latest = c.sort_values(["year", "month"]).groupby("year").tail(1)
cpi_decdec = dec.to_dict()
last_row = latest.iloc[-1]
cpi_ytd_note = f"{last_row.TIME_PERIOD}: {last_row.value - 100:.1f}% vs Dec-{int(last_row.year)-1}"

# ---------------------------------------------------------------- GDP (Derzhstat quarterly NA file, annual rows)
q = pd.read_csv(RAW / "statgov_gdp_quarterly.csv", dtype=str, low_memory=False)
q["value"] = q.OBS_VALUE.astype(float)
ann = q[(q.INDICATOR == "GROSS_DOM_PRODUCT") & (q.NACE == "_T")
        & q.TIME_PERIOD.str.fullmatch(r"\d{4}")].copy()
gdp_cur = ann[ann.PRICE_TYPE == "CURR_PRICES"].set_index("TIME_PERIOD")["value"]      # UAH mn
gdp_py  = ann[ann.PRICE_TYPE == "PRICES_PY"].set_index("TIME_PERIOD")["value"]        # UAH mn, prices of prev yr
# real growth(t) = GDP in prices of previous year (t) / GDP current prices (t-1) - 1
real_g = {}
for yr in gdp_py.index:
    prev = str(int(yr) - 1)
    if prev in gdp_cur.index:
        real_g[int(yr)] = (gdp_py[yr] / gdp_cur[prev] - 1) * 100

# ---------------------------------------------------------------- World Bank cross-check
wb_gdp = json.load(open(RAW / "worldbank_NY.GDP.MKTP.CD.json"))[1]
wb_gdp = {int(r["date"]): r["value"] / 1e9 for r in wb_gdp if r["value"]}
wb_gr = json.load(open(RAW / "worldbank_NY.GDP.MKTP.KD.ZG.json"))[1]
wb_gr = {int(r["date"]): r["value"] for r in wb_gr if r["value"] is not None}

# ---------------------------------------------------------------- assemble
years = range(2015, 2027)
rows = []
for y in years:
    gdp_uah_bn = gdp_cur.get(str(y), np.nan) / 1000 if str(y) in gdp_cur.index else np.nan
    fxa = fx_yr.fx_avg.get(y, np.nan)
    rows.append({
        "year": y,
        "fx_avg_uah_usd": fxa,
        "fx_eop_uah_usd": fx_yr.fx_eop.get(y, np.nan),
        "cpi_decdec_pct": cpi_decdec.get(y, np.nan),
        "gdp_nominal_uah_bn": round(gdp_uah_bn, 1) if pd.notna(gdp_uah_bn) else np.nan,
        "gdp_nominal_usd_bn_statgov": round(gdp_uah_bn / fxa, 1) if pd.notna(gdp_uah_bn) and pd.notna(fxa) else np.nan,
        "gdp_nominal_usd_bn_worldbank": round(wb_gdp.get(y, np.nan), 1),
        "real_gdp_growth_pct_statgov": round(real_g.get(y, np.nan), 1) if y in real_g else np.nan,
        "real_gdp_growth_pct_worldbank": round(wb_gr.get(y, np.nan), 1) if y in wb_gr else np.nan,
    })
macro = pd.DataFrame(rows)
macro.to_csv(OUT / "macro_baseline.csv", index=False)

# ---------------------------------------------------------------- scenario assumptions
assumptions = {
    "as_of": "2026-07-09",
    "horizon_years": 10,
    "fx_spot_uah_usd": float(fx.iloc[-1]["rate"]),
    "scenarios": {
        "PEACE": {
            "probability": 0.40,
            "description": "Durable ceasefire/settlement by ~2028; EU accession momentum (Cluster 1 opened Jun-2026; "
                           "Brussels working range 2030-2034); reconstruction boom (RDNA5 $588bn needs).",
            "fx_depreciation_pa": 0.03,
            "real_gdp_pa": 0.050,
            "rationale": "EBRD ceasefire scenario 5.0% GDP; IMF 2028 4.2%; FX drift = inflation differential only "
                         "(NBU CPI target path 5%, USD 2.5%).",
        },
        "FROZEN": {
            "probability": 0.40,
            "description": "War continues / frozen conflict; muddle-through; no EU accession within horizon; "
                           "continued Western financing at reduced scale.",
            "fx_depreciation_pa": 0.07,
            "real_gdp_pa": 0.015,
            "rationale": "Managed-float realized drift Oct-2023..Jul-2026 ~7.2%/yr; IMF/WB/NBU 2026 forecasts 1.0-1.6%.",
        },
        "ESCALATION": {
            "probability": 0.20,
            "description": "Major escalation: intensified strikes, loss of additional territory, financing stress, "
                           "second sovereign debt restructuring.",
            "fx_depreciation_pa": 0.14,
            "real_gdp_pa": -0.03,
            "rationale": "War-period realized drift 11.4%/yr plus stress premium; eurobond pricing implies ~50% odds "
                         "of re-restructuring within 5y (Substack/Trium analysis in brief 06).",
        },
    },
    "probability_rationale": "Polymarket ceasefire-before-2027 ~25-40%; over a 10-year window cumulative odds of some "
                             "settlement are materially higher than any single year; 40/40/20 is the analyst judgment "
                             "used here and is stress-tested in 04_portfolio.py.",
    "tax": {
        "cit": 0.18, "dividend_pit_ml": 0.10, "securities_gains": 0.23,
        "ovdp": 0.0, "diia_city_exit_tax": 0.09,
        "land_sale_first_in_year_held3y": 0.0,
    },
    "war_risk_insurance_effective": 0.01,
    "sources": "sources/briefs/08-risk-parameters.md, 06-liquid-instruments.md",
}
json.dump(assumptions, open(OUT / "assumptions.json", "w"), indent=2)

print(macro.to_string(index=False))
print("\nCPI YTD:", cpi_ytd_note)
print("\nWrote macro_baseline.csv and assumptions.json")
