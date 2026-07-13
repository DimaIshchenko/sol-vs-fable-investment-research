# /// script
# dependencies = ["pandas", "numpy", "scipy"]
# ///
"""
04_portfolio.py — $10M allocation + Monte Carlo.

Objective: maximize expected log terminal wealth (max compounded growth with an inherent
ruin penalty) over the three scenarios, subject to real-world capacity caps per opportunity
(documented below, each tied to briefs) and a liquidity floor. A max-expected-value variant
is reported for comparison. Terminal wealth per $1 = scenario MOIC from 03 (interim
distributions counted at face, not reinvested — conservative).

Monte Carlo: 20,000 draws; scenario ~ P(assumptions.json); per-asset lognormal idiosyncratic
noise around the scenario MOIC (sigmas documented below).

Outputs: portfolio.csv, montecarlo_summary.csv
"""
import json
import numpy as np
import pandas as pd
from pathlib import Path
from scipy.optimize import minimize

rng = np.random.default_rng(42)
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "calculations/outputs"
A = json.load(open(OUT / "assumptions.json"))
CAPITAL = 10.0  # $M

m = pd.read_csv(OUT / "opportunity_models.csv").set_index("opportunity")
det = pd.read_csv(OUT / "opportunity_cashflow_detail.csv")
moic = det.pivot(index="opportunity", columns="scenario", values="moic")
scens = ["PEACE", "FROZEN", "ESCALATION"]
p = np.array([A["scenarios"][s]["probability"] for s in scens])

# capacity caps (share of $10M) — why each cap exists:
CAPS = {
    "IT outsourcing acquisition (3.5x EBITDA)": (0.25, "one 100-150p firm + bolt-on ≈ $2-2.5M deal size (briefs/04 §7)"),
    "Farmland (2,000+ ha via LLC)":             (0.30, "~1,600-2,000 ha at $1.5-2.5k/ha; assembly pace ~2 plots/ha avg (briefs/01 §7)"),
    "Flexible generation (CHP+BESS)":           (0.20, "unit sizes €0.2-0.6M CHP / €6-7M BESS-10MW; pipeline & auction risk (briefs/02)"),
    "Solar PV (operating plants)":              (0.15, "secondary-market depth: 1-10MW listings (briefs/02 §8)"),
    "Warehouse build-to-lease (small-format)":  (0.20, "$0.4-2M per site, multi-site feasible (briefs/05 §6)"),
    "Defense-tech venture basket":              (0.15, "LP minimums unpublished; blind-pool + access risk (briefs/03 §3)"),
    "Ukraine eurobonds (Series B-2036 @58)":    (0.30, "liquid; capped for re-default asymmetry (briefs/06 §7)"),
    "UAH OVDP ladder (tax-free)":               (0.30, "liquid; capped for UAH concentration (briefs/06 §3)"),
}
names = list(CAPS)
M = moic.loc[names, scens].values          # assets x scenarios
caps = np.array([CAPS[n][0] for n in names])
LIQ = [names.index("Ukraine eurobonds (Series B-2036 @58)"), names.index("UAH OVDP ladder (tax-free)")]

def neg_elog(w):
    return -(p * np.log(np.maximum(w @ M, 1e-9))).sum()

def neg_ev(w):
    return -(p * (w @ M)).sum()

cons = [{"type": "eq", "fun": lambda w: w.sum() - 1},
        {"type": "ineq", "fun": lambda w: w[LIQ].sum() - 0.15}]          # ≥15% liquid
bounds = [(0.0, c) for c in caps]
w0 = caps / caps.sum()

sol_log = minimize(neg_elog, w0, bounds=bounds, constraints=cons, method="SLSQP")
sol_ev = minimize(neg_ev, w0, bounds=bounds, constraints=cons, method="SLSQP")
w = sol_log.x.round(4)

port = pd.DataFrame({
    "weight": w, "usd_m": (w * CAPITAL).round(2),
    "weight_maxEV": sol_ev.x.round(3),
    "moic_PEACE": M[:, 0], "moic_FROZEN": M[:, 1], "moic_ESCALATION": M[:, 2],
    "cap": caps, "cap_rationale": [CAPS[n][1] for n in names],
}, index=names).sort_values("weight", ascending=False)

W_s = w @ M
exp_moic = float(p @ W_s)
exp_irr_10y = exp_moic ** (1 / 10) - 1
# capital-weighted expected IRR (uses per-opportunity expected IRRs from 03, which
# account for interim cash-flow timing that MOIC ignores)
eirr = pd.read_csv(OUT / "opportunity_models.csv").set_index("opportunity")["exp_irr"]
blended_irr = float(sum(w[i] * eirr[names[i]] for i in range(len(names))))
print("=== Recommended allocation (max expected log-wealth) ===")
print(port[["weight", "usd_m", "moic_PEACE", "moic_FROZEN", "moic_ESCALATION"]].to_string())
print(f"\nScenario portfolio MOICs: PEACE {W_s[0]:.2f} | FROZEN {W_s[1]:.2f} | ESCALATION {W_s[2]:.2f}")
print(f"Expected MOIC {exp_moic:.2f}  (≈{exp_irr_10y:.1%}/yr equivalent on undiscounted distributions)")
print(f"Capital-weighted expected IRR (timing-aware): {blended_irr:.1%}/yr")

# ---------------------------------------------------------------- Monte Carlo
SIGMA = {  # idiosyncratic lognormal sigma per asset (judgment; wider for VC/single-company deals)
    "IT outsourcing acquisition (3.5x EBITDA)": 0.45,
    "Farmland (2,000+ ha via LLC)": 0.25,
    "Flexible generation (CHP+BESS)": 0.35,
    "Solar PV (operating plants)": 0.30,
    "Warehouse build-to-lease (small-format)": 0.30,
    "Defense-tech venture basket": 0.80,
    "Ukraine eurobonds (Series B-2036 @58)": 0.15,
    "UAH OVDP ladder (tax-free)": 0.10,
}
sig = np.array([SIGMA[n] for n in names])
N = 20000
scen_draw = rng.choice(3, size=N, p=p)
shocks = rng.lognormal(mean=-0.5 * sig**2, sigma=sig, size=(N, len(names)))
moics = M[:, scen_draw].T * shocks
wealth = (moics * w).sum(axis=1) * CAPITAL

q = np.percentile(wealth, [5, 25, 50, 75, 95])
mc = pd.DataFrame({
    "metric": ["p5", "p25", "median", "p75", "p95", "mean", "prob_below_10M", "prob_below_6M", "prob_above_25M"],
    "value_usd_m": [*q.round(1), wealth.mean().round(1),
                    round((wealth < 10).mean(), 3), round((wealth < 6).mean(), 3), round((wealth > 25).mean(), 3)],
})
mc.to_csv(OUT / "montecarlo_summary.csv", index=False)
port.round(3).to_csv(OUT / "portfolio.csv", index_label="opportunity")

print("\n=== Monte Carlo (20k paths, $10M start, 10y) ===")
print(mc.to_string(index=False))

# sensitivity: scenario probabilities stress
print("\n=== Probability stress (expected MOIC of chosen weights) ===")
for lbl, pp in {"base 40/40/20": [.4, .4, .2], "bearish 25/45/30": [.25, .45, .30],
                "bullish 55/35/10": [.55, .35, .10]}.items():
    print(f"  {lbl}: {np.array(pp) @ W_s:.2f}x")
