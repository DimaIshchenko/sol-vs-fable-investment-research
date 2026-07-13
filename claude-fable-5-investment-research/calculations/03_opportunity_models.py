# /// script
# dependencies = ["pandas", "numpy", "numpy-financial"]
# ///
"""
03_opportunity_models.py — 10-year cash-flow models per opportunity, per scenario.

All flows are in USD, per $1.0M invested mid-2026, after Ukrainian taxes for a resident
individual (rates in outputs/assumptions.json). Scenario probabilities/FX paths come from
01_macro_baseline.py. Every parameter cites its brief (sources/briefs/*.md).

Output: calculations/outputs/opportunity_models.csv
"""
import json
import numpy as np
import numpy_financial as npf
import pandas as pd
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "calculations/outputs"
A = json.load(open(OUT / "assumptions.json"))
SC = A["scenarios"]
YEARS = A["horizon_years"]          # 10
DIV_TAX = A["tax"]["dividend_pit_ml"]        # 0.10
SEC_TAX = A["tax"]["securities_gains"]       # 0.23
INS = A["war_risk_insurance_effective"]      # 0.01 of asset value p.a.


def fx_factor(scn, t):
    """USD value multiplier for a UAH-denominated flow after t years of depreciation."""
    return 1.0 / (1.0 + SC[scn]["fx_depreciation_pa"]) ** t


def irr_moic(cf):
    irr = npf.irr(cf)
    moic = sum(c for c in cf[1:] if c > 0) / -cf[0]
    return round(float(irr), 4), round(float(moic), 2)


R = []


def add(name, scn, cf, note):
    irr, moic = irr_moic(cf)
    R.append(dict(opportunity=name, scenario=scn, irr=irr, moic=moic, note=note))


# ================================================================= 1. FARMLAND
# briefs/01: entry ~$1,800/ha all-in (official avg $1,501 + real-market premium & costs);
# net lease yield ~4.5% of land value (5% blend - MTL/admin); price paths:
#   PEACE  : +11%/yr (convergence to ~60% of RO/BG €8.7k by 2036)
#   FROZEN : +5%/yr  (realized official USD trend since 2021 ~5-6%/yr)
#   ESCAL  : -35% shock year 1, then +2%/yr
# exit via corporate share deal, 5% friction; rent distributions taxed 10%.
for scn, path in {"PEACE": 0.11, "FROZEN": 0.05, "ESCALATION": None}.items():
    v = 1.0
    cf = [-1.0]
    for t in range(1, YEARS + 1):
        if scn == "ESCALATION":
            v = v * 0.65 if t == 1 else v * 1.02
        else:
            v *= 1 + path
        rent = 0.045 * v * (1 - DIV_TAX)
        cf.append(rent + (v * 0.95 if t == YEARS else 0.0))
    add("Farmland (2,000+ ha via LLC)", scn, cf,
        "briefs/01 §2,4,5; briefs/07 §6: 15-25% unlevered EBITDA yield alternative if self-operated")

# ================================================================= 2. SOLAR (operating, secondary market)
# briefs/02 §8: $650k/MW asks, EBIT ~11% unlevered; UAH-denominated DAM revenue with
# EU price convergence (70% effective FX pass-through). Insurance 1% (state-subsidized).
# Terminal: PEACE re-rate to 8% cap (1.30x cost, degradation-adjusted); FROZEN 0.95x; ESCAL 0.55x.
for scn, (term, dmg) in {"PEACE": (1.30, 0.0), "FROZEN": (0.95, 0.0), "ESCALATION": (0.55, 0.15)}.items():
    cf = [-1.0]
    for t in range(1, YEARS + 1):
        gross = 0.11 * (0.3 + 0.7 * (fx_factor(scn, t) / fx_factor(scn, 0)) ** 0.3)  # partial FX pass-through
        net = (gross - INS) * (1 - DIV_TAX)
        net *= (1 - dmg) if t <= 3 else 1.0   # escalation damage haircut on early cash flows
        cf.append(net + (term if t == YEARS else 0.0))
    add("Solar PV (operating plants)", scn, cf, "briefs/02 §1,8: 11% EBIT yield on $650k/MW; caps on DAM prices")

# ================================================================= 3. FLEXIBILITY: gas CHP + BESS
# briefs/02 §2,4: CHP payback 2-4y => ~30-35% cash yield while deficit persists; BESS 5-yr
# EUR-fixed Ukrenergo ancillary contracts. Yields collapse after grid normalizes (PEACE),
# persist in FROZEN, rise but with destruction risk in ESCALATION. Equipment terminal 0.35x.
for scn, ylds in {
    "PEACE":      [0.32, 0.32, 0.25, 0.15, 0.12, 0.10, 0.10, 0.09, 0.09, 0.08],
    "FROZEN":     [0.32, 0.32, 0.30, 0.30, 0.28, 0.25, 0.22, 0.20, 0.18, 0.16],
    "ESCALATION": [0.30, 0.28, 0.28, 0.26, 0.24, 0.22, 0.20, 0.18, 0.16, 0.14],
}.items():
    dmg = 0.20 if scn == "ESCALATION" else 0.0   # expected physical-loss drag
    cf = [-1.0]
    for t in range(1, YEARS + 1):
        net = (ylds[t - 1] * (1 - dmg) - INS) * (1 - DIV_TAX)
        cf.append(net + (0.35 if t == YEARS else 0.0))
    add("Flexible generation (CHP+BESS)", scn, cf, "briefs/02 §2,4: payback 2-4y; 5-yr EUR-fixed aFRR contracts")

# ================================================================= 4. WAREHOUSE (small-format, Lviv/Kyiv)
# briefs/05 §6A: net yield-on-cost ~14% small-format (haircut from marketed 14.6-25%);
# USD-pegged rents; terminal at exit cap: PEACE 9% (1.5x), FROZEN 13% (1.05x), ESCAL 0.65x.
for scn, (yoc, term) in {"PEACE": (0.14, 1.50), "FROZEN": (0.13, 1.05), "ESCALATION": (0.10, 0.65)}.items():
    cf = [-1.0]
    for t in range(1, YEARS + 1):
        build_lag = 0.0 if t == 1 else 1.0        # year 1 = construction, no income
        net = (yoc * build_lag - INS) * (1 - DIV_TAX)
        cf.append(net + (term if t == YEARS else 0.0))
    add("Warehouse build-to-lease (small-format)", scn, cf, "briefs/05 §1,6: vacancy 3%, Lviv rents > Kyiv")

# ================================================================= 5. IT OUTSOURCING M&A
# briefs/04 §4,7: buy at 3.5x EBITDA => $286k EBITDA per $1M; 70% payout, 10% dividend tax;
# EBITDA growth & exit multiple by scenario (re-rating to peer 5.9-8.8x on normalization).
for scn, (g, exit_x) in {"PEACE": (0.08, 6.5), "FROZEN": (0.02, 4.0), "ESCALATION": (-0.12, 2.5)}.items():
    e = 1.0 / 3.5
    cf = [-1.0]
    for t in range(1, YEARS + 1):
        e *= 1 + g
        cf.append(0.70 * e * (1 - DIV_TAX) + (e * exit_x if t == YEARS else 0.0))
    add("IT outsourcing acquisition (3.5x EBITDA)", scn, cf, "briefs/04: 3-4x entry vs 5.9-10x peers")

# ================================================================= 6. DEFENSE-TECH VENTURE BASKET
# briefs/03 §2,3,6: LP tickets in MITS/UA1/D3-type funds + Brave1 co-invest; net-of-fees
# TVPI by scenario; J-curve (capital out years 1-3, returns years 6-10).
# ESCALATION is a HEDGE: procurement + European demand rise. PEACE: partial demand cliff
# offset by EU rearmament + export legalization (Jul-2026 framework, 20% levy).
for scn, tvpi in {"PEACE": 2.2, "FROZEN": 2.8, "ESCALATION": 3.0}.items():
    cf = [-1.0] + [0.0] * (YEARS - 5)
    # distributions in years 6..10 (20%,20%,25%,20%,15% of terminal), gains taxed 23%
    gross = [tvpi * w for w in (0.20, 0.20, 0.25, 0.20, 0.15)]
    net = [g - max(0.0, g - 0.2) * SEC_TAX for g in gross]   # tax gains above pro-rata basis
    cf += net
    add("Defense-tech venture basket", scn, cf, "briefs/03: $105M 2025 funding; 2.5-6x rev vs 10-14x EU peers")

# ================================================================= 7. SOVEREIGN EUROBONDS (B-2036 @ ~58)
# briefs/06 §1,7: face = 1/0.58 = 1.724 per $1 invested; coupons 0% to Aug-2027, 3% to 2034,
# 7.75% after; PEACE: hold to maturity (par + step-up coupons); FROZEN: re-restructuring lite
# in 2030 (30% NPV haircut, exit at 60 in 2032); ESCALATION: deep restructuring, recover 32.
FACE = 1 / 0.58
for scn in ["PEACE", "FROZEN", "ESCALATION"]:
    cf = [-1.0]
    for t in range(1, YEARS + 1):
        yr = 2026 + t
        cpn_rate = 0.0 if yr <= 2027 else (0.03 if yr <= 2034 else 0.0775)
        cpn = FACE * cpn_rate
        if scn == "PEACE":
            red = FACE if t == YEARS else 0.0
            cf.append(cpn + red)
        elif scn == "FROZEN":
            if yr < 2030:
                cf.append(cpn)
            elif yr == 2030:
                cf.append(cpn * 0.5)
            elif yr == 2032:
                cf.append(FACE * 0.60)   # exit post-restructuring
            elif yr < 2032:
                cf.append(0.0)
            else:
                cf.append(0.0)
        else:  # ESCALATION
            cf.append(FACE * 0.32 if yr == 2031 else (cpn if yr < 2029 else 0.0))
    # apply securities tax on net gain at end (approximation)
    gain = sum(cf) - 0.0
    if gain > 0:
        # subtract tax proportionally from final positive flow
        for i in range(len(cf) - 1, 0, -1):
            if cf[i] > 0:
                cf[i] -= gain * SEC_TAX
                break
    add("Ukraine eurobonds (Series B-2036 @58)", scn, cf, "briefs/06: +30-60% normalization vs -30-40% re-default")

# ================================================================= 8. OVDP LADDER (UAH, tax-free)
# briefs/06 §3: blended UAH yield ~14% (declining from 15.5% as NBU cuts), zero tax;
# USD return = (1+y)/(1+dep)-1, compounded, principal returned at year 3 (working ladder).
for scn in ["PEACE", "FROZEN", "ESCALATION"]:
    dep = SC[scn]["fx_depreciation_pa"]
    y = 0.14
    cf = [-1.0]
    v = 1.0
    for t in range(1, YEARS + 1):
        v *= (1 + y) / (1 + dep)
        y = max(0.10, y - 0.005)          # NBU easing path
        cf.append(v if t == YEARS else 0.0)
    add("UAH OVDP ladder (tax-free)", scn, cf, "briefs/06 §3: 1-2y 15.1-15.8%, PIT+ML exempt")

# ================================================================= aggregate
df = pd.DataFrame(R)
probs = {k: v["probability"] for k, v in SC.items()}
exp = (df.assign(p=df.scenario.map(probs))
         .groupby("opportunity")
         .apply(lambda x: pd.Series({
             "exp_irr": (x.irr * x.p).sum(),
             "exp_moic": (x.moic * x.p).sum(),
             "bear_moic": x.loc[x.scenario == "ESCALATION", "moic"].iloc[0],
             "bull_moic": x.loc[x.scenario == "PEACE", "moic"].iloc[0],
         }), include_groups=False)
         .sort_values("exp_irr", ascending=False))

wide = df.pivot(index="opportunity", columns="scenario", values="irr")
result = exp.join(wide).round(3)
result.to_csv(OUT / "opportunity_models.csv")
df.round(4).to_csv(OUT / "opportunity_cashflow_detail.csv", index=False)

print("=== Probability-weighted 10y results (per $1M, USD, after tax) ===")
print(result.to_string())
