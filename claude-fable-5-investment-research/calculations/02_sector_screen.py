# /// script
# dependencies = ["pandas", "numpy"]
# ///
"""
02_sector_screen.py — sector screening model.

Data metrics (official, Derzhstat via SDMX API):
  - GVA by NACE section, current prices, 2015-2024 (annual NA) + 2025 (annual rows of quarterly NA)
    -> converted to USD with NBU average FX (from 01_macro_baseline outputs)
    -> pre-war USD CAGR 2015-2021, wartime resilience = GVA_2025_USD / GVA_2021_USD
  - Capital investment by NACE, 2021 vs 2025 (momentum, USD)
  - Goods exports by HS section, 2021 vs 2024 (export orientation)

Judgment criteria are explicit constants below, each with a `basis` citation into
sources/briefs/*.md. Composite = weighted sum of 0-10 normalized criteria.

Output: calculations/outputs/sector_scores.csv (+ gva_by_sector.csv, exports_by_section.csv,
        capinv_by_sector.csv)
"""
import pandas as pd
import numpy as np
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW, OUT = ROOT / "data/raw", ROOT / "calculations/outputs"

macro = pd.read_csv(OUT / "macro_baseline.csv").set_index("year")
FX = macro["fx_avg_uah_usd"]

NACE_NAMES = {
    "A": "Agriculture, forestry, fishing", "B": "Mining & quarrying", "C": "Manufacturing",
    "D": "Electricity, gas supply", "E": "Water, waste", "F": "Construction",
    "G": "Wholesale & retail trade", "H": "Transportation & storage", "I": "Accommodation & food",
    "J": "Information & telecom (IT)", "K": "Finance & insurance", "L": "Real estate",
    "M": "Professional/scientific", "N": "Administrative services", "O": "Public administration",
    "P": "Education", "Q": "Health", "R": "Arts & recreation",
}

# ---------------------------------------------------------------- GVA by NACE (annual 2015-2024 + 2025)
g = pd.read_csv(RAW / "statgov_gdp_annual.csv", dtype=str, low_memory=False)
gva = g[(g.INDICATOR == "GRS_VAL_ADD") & (g.PRICE_TYPE == "CURR_PRICES")
        & (g.BREAKDOWN_CATEGORY == "ECONOMIC_ACTIVITY_TYPE")].copy()
gva["value"] = gva.OBS_VALUE.astype(float)
gva["year"] = gva.TIME_PERIOD.astype(int)
gva = gva[gva.BREAKDOWN.isin(NACE_NAMES) & (gva.year >= 2015)]
piv = gva.pivot_table(index="BREAKDOWN", columns="year", values="value", aggfunc="first")  # UAH mn

q = pd.read_csv(RAW / "statgov_gdp_quarterly.csv", dtype=str, low_memory=False)
q25 = q[(q.INDICATOR == "GROSS_VAL_ADDED") & (q.PRICE_TYPE == "CURR_PRICES")
        & (q.TIME_PERIOD == "2025") & q.NACE.isin(NACE_NAMES)].copy()
q25["value"] = q25.OBS_VALUE.astype(float)
piv[2025] = q25.set_index("NACE")["value"]

usd = piv.copy()
for y in usd.columns:
    usd[y] = piv[y] / FX.loc[y] / 1000  # USD bn
usd.round(2).to_csv(OUT / "gva_by_sector.csv")

metrics = pd.DataFrame(index=usd.index)
metrics["gva_2021_usd_bn"] = usd[2021]
metrics["gva_2025_usd_bn"] = usd[2025]
metrics["prewar_cagr_usd"] = (usd[2021] / usd[2015]) ** (1 / 6) - 1
metrics["war_resilience_usd"] = usd[2025] / usd[2021]

# ---------------------------------------------------------------- capital investment by NACE section letters
ci = pd.read_csv(RAW / "statgov_capital_inv.csv", dtype=str, low_memory=False)
cin = ci[(ci.INDICATOR == "CAP_INV_UAH") & (ci.BREAKDOWN_CATEGORY == "_T")
         & ci.NACE.isin(NACE_NAMES)].copy()
cin = cin[cin.TIME_PERIOD.notna() & cin.TIME_PERIOD.str.fullmatch(r"\d{4}")]
cin["value"] = cin.OBS_VALUE.astype(float)
cin["year"] = cin.TIME_PERIOD.astype(int)
cin = cin[cin.year >= 2015]
cpiv = cin.pivot_table(index="NACE", columns="year", values="value", aggfunc="first")
cap_usd = cpiv.copy()
for y in cap_usd.columns:
    cap_usd[y] = cpiv[y] / FX.loc[y] / 1000
cap_usd.round(3).to_csv(OUT / "capinv_by_sector.csv")
metrics["capinv_2025_vs_2021_usd"] = cap_usd[2025] / cap_usd[2021]

# ---------------------------------------------------------------- exports by HS section
t = pd.read_csv(RAW / "statgov_trade_goods.csv", dtype=str, low_memory=False)
te = t[(t.INDICATOR == "EXP_GOODS") & (t.GROUPS_GOODS == "CHAPTER") & (t.FREQ == "A")].copy()
te["value"] = pd.to_numeric(te.OBS_VALUE, errors="coerce")
te["year"] = te.TIME_PERIOD.astype(int)
te["section"] = te.GOODS.str[:2].astype(int)
HS_SECTIONS = {1: "I Live animals/products", 2: "II Vegetable products", 3: "III Fats & oils",
               4: "IV Prepared foodstuffs", 5: "V Mineral products", 6: "VI Chemicals",
               7: "VII Plastics/rubber", 8: "VIII Hides", 9: "IX Wood", 10: "X Paper",
               11: "XI Textiles", 12: "XII Footwear", 13: "XIII Stone/cement", 14: "XIV Precious",
               15: "XV Base metals", 16: "XVI Machinery/electrical", 17: "XVII Vehicles/transport",
               18: "XVIII Instruments", 19: "XIX Arms", 20: "XX Misc manufactured", 21: "XXI Art"}
tp = te.pivot_table(index="section", columns="year", values="value", aggfunc="sum") / 1e6  # -> USD bn (source in USD thous.)
tp.index = [HS_SECTIONS.get(i, str(i)) for i in tp.index]
tp.round(2).to_csv(OUT / "exports_by_section.csv")

agri_exp_2024 = tp.loc[["I Live animals/products", "II Vegetable products", "III Fats & oils",
                        "IV Prepared foodstuffs"], 2024].sum()
total_exp_2024 = tp[2024].sum()

# ---------------------------------------------------------------- screening matrix
# Each investable sector maps to a NACE proxy for the data columns (or None).
# Judgment scores are 0-10, each with a citation basis into sources/briefs/.
S = [
 dict(sector="Farmland & primary agriculture", nace="A",
      reconstruction=6, export_fx=9, entry=10, return_evidence=9, exit_liq=6, safety=7,
      basis="briefs/01: price +96% UAH since 2021 yet 17-25% of BG/RO/HU level; 15-25% unlevered yield "
            "(briefs/07 §6); resident-only market = structural discount; liquid enough at 340k ha/yr traded"),
 dict(sector="Agro-processing & food export", nace="C",
      reconstruction=6, export_fx=9, entry=7, return_evidence=6, exit_liq=5, safety=6,
      basis="briefs/07: $22.7bn exports (56% of total); crush overcapacity (margins negative MY24/25-25/26) "
            "but soy/rape duty + niches (berries/organic/dairy) attractive; strike risk on plants"),
 dict(sector="Energy (solar/BESS/DG/biomethane)", nace="D",
      reconstruction=10, export_fx=5, entry=9, return_evidence=8, exit_liq=5, safety=6,
      basis="briefs/02: RDNA energy needs; BESS 5-yr EUR-fixed Ukrenergo contracts; CHP payback 2-4y; "
            "solar ~11% unlevered; biomethane EU export premium 2x; physical-strike exposure real"),
 dict(sector="Defense tech", nace=None,
      reconstruction=8, export_fx=8, entry=6, return_evidence=9, exit_liq=4, safety=5,
      basis="briefs/03: output $1bn->$35bn capacity (35x); exports legalized Jul-2026 (20% levy); "
            "Ukraine assets at 2.5-6x rev vs 10-14x EU peers; 25% margin cap, procurement concentration, froth"),
 dict(sector="IT services & Diia City", nace="J",
      reconstruction=4, export_fx=9, entry=9, return_evidence=7, exit_liq=6, safety=7,
      basis="briefs/04: exports bottomed 2024, +3.3% 2025; M&A at 3-4x EBITDA = 35-65% discount to peers; "
            "Diia City 9%/5% tax; mobilization + AI-cannibalization risks"),
 dict(sector="Logistics & warehousing", nace="H",
      reconstruction=8, export_fx=6, entry=8, return_evidence=7, exit_liq=5, safety=6,
      basis="briefs/05: Kyiv vacancy 3-3.5%, prime rent $5.3, take-up decade record; small-format YoC ~15%; "
            "big-box spec dev marginal (value<=replacement); Lviv rents above Kyiv"),
 dict(sector="Residential development", nace="F",
      reconstruction=9, export_fx=2, entry=8, return_evidence=6, exit_liq=6, safety=6,
      basis="briefs/05: dev margin 25-40% Lviv/Kyiv; eOselia = 1/3 of new-build sales; RDNA5 housing $90bn; "
            "transactions still -37% vs 2021; UAH revenue = FX-naked"),
 dict(sector="Construction materials", nace="C",
      reconstruction=10, export_fx=3, entry=6, return_evidence=5, exit_liq=4, safety=6,
      basis="briefs/05: construction output +12-15.5%/yr 2024-25; cement still ~30% below pre-war; "
            "demand contingent on reconstruction funding flow-through"),
 dict(sector="Metals & mining", nace="B",
      reconstruction=5, export_fx=8, entry=3, return_evidence=3, exit_liq=4, safety=4,
      basis="briefs/06: Ferrexpo quasi-distressed (ARMA seizure = governance base-rate); capital intensity "
            "above $10M ticket; energy-cost and logistics exposure"),
 dict(sector="Consumer/retail/pharma", nace="G",
      reconstruction=5, export_fx=3, entry=7, return_evidence=5, exit_liq=5, safety=7,
      basis="briefs/08: real wages +8-9%/yr above CPI (Derzhstat wage series), consumer recovery; "
            "GVA resilience strong; competitive market, few distressed entry points"),
 dict(sector="Liquid sovereign credit (eurobonds/OVDP)", nace=None,
      reconstruction=5, export_fx=7, entry=10, return_evidence=7, exit_liq=10, safety=5,
      basis="briefs/06: B-2036 at ~58 = +30-60% on normalization, -30-40% on re-default; OVDP 15-16% tax-free; "
            "instant deployment, daily liquidity"),
]
screen = pd.DataFrame(S)

# data-driven columns via NACE proxy
screen["prewar_cagr_usd"] = screen.nace.map(metrics["prewar_cagr_usd"])
screen["war_resilience_usd"] = screen.nace.map(metrics["war_resilience_usd"])
screen["capinv_momentum"] = screen.nace.map(metrics["capinv_2025_vs_2021_usd"])
# sector-specific overrides where NACE proxy misses the investable niche (documented):
ovr = {
    "Defense tech": dict(prewar_cagr_usd=0.10, war_resilience_usd=6.0, capinv_momentum=5.0,
                         note="briefs/03: capacity $1bn->$35bn 2022-25; treated as growth ceiling, capped in normalization"),
    "Liquid sovereign credit (eurobonds/OVDP)": dict(prewar_cagr_usd=0.05, war_resilience_usd=1.6, capinv_momentum=1.0,
                         note="briefs/06: eurobond recovery 2022 trough -> 2026 ~2x; forward return capped vs 2022-25"),
}
for k, v in ovr.items():
    for col in ("prewar_cagr_usd", "war_resilience_usd", "capinv_momentum"):
        screen.loc[screen.sector == k, col] = v[col]

def norm(s, lo=None, hi=None, cap=None):
    s = s.astype(float).clip(upper=cap) if cap else s.astype(float)
    lo = s.min() if lo is None else lo
    hi = s.max() if hi is None else hi
    return ((s - lo) / (hi - lo) * 10).clip(0, 10)

screen["n_growth"] = norm(screen.prewar_cagr_usd)
screen["n_resilience"] = norm(screen.war_resilience_usd, cap=2.0)
screen["n_capinv"] = norm(screen.capinv_momentum, cap=3.0)

WEIGHTS = {  # documented weights, sum = 1.0
    "n_growth": 0.075,            # pre-war USD GVA CAGR (official)
    "n_resilience": 0.125,        # GVA 2025/2021 USD (official)
    "n_capinv": 0.05,             # capital-investment momentum 2025/2021 (official)
    "reconstruction": 0.125,      # RDNA5 needs mapping (judgment, cited)
    "export_fx": 0.10,            # FX-hedge quality (data + judgment)
    "entry": 0.15,                # feasibility at <=$10M ticket (judgment, cited)
    "return_evidence": 0.20,      # documented current yields/multiples (judgment, cited)
    "exit_liq": 0.075,            # exit path within 10y
    "safety": 0.10,               # inverse of destruction/regulatory/margin-cap risk
}
assert abs(sum(WEIGHTS.values()) - 1.0) < 1e-9
screen["composite"] = sum(screen[c] * w for c, w in WEIGHTS.items())
screen = screen.sort_values("composite", ascending=False).reset_index(drop=True)
screen.index += 1
cols = ["sector", "composite", "n_growth", "n_resilience", "n_capinv", "reconstruction",
        "export_fx", "entry", "return_evidence", "exit_liq", "safety",
        "prewar_cagr_usd", "war_resilience_usd", "capinv_momentum", "basis"]
screen[cols].round(3).to_csv(OUT / "sector_scores.csv", index_label="rank")

print("=== GVA by sector, USD bn (official Derzhstat + NBU FX) ===")
print(usd[[2015, 2019, 2021, 2023, 2024, 2025]].round(1).to_string())
print("\n=== Sector metrics ===")
print(metrics.round(3).to_string())
print("\n=== Exports by HS section, USD bn ===")
print(tp[[2021, 2023, 2024]].round(1).to_string())
print(f"\nAgri share of goods exports 2024: {agri_exp_2024/total_exp_2024:.1%}")
print("\n=== SCREEN RANKING ===")
print(screen[["sector", "composite"]].round(2).to_string())
