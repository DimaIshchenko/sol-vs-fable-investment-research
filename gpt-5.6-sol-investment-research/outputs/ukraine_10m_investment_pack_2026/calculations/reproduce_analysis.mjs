import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const packDir = path.resolve(here, "..");
const rawDir = path.join(packDir, "sources", "raw");

const files = {
  perf: "ukrstat_performance_enterprises_selected.json",
  invest: "ukrstat_gross_investment_enterprises.json",
  fin: "ukrstat_financial_results_selected.json",
  balance: "ukrstat_balance_sheet_selected.json",
  services: "ukrstat_service_exports_selected.json",
  goods: "ukrstat_goods_exports_selected.json",
  perfStructure: "ukrstat_performance_enterprises_structure.json",
};

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(rawDir, name), "utf8"));
}

function parseSdmx(name) {
  const root = readJson(name).data;
  const dataSet = root.dataSets[0];
  const structure = root.structures[dataSet.structure ?? 0];
  const seriesDimensions = structure.dimensions.series;
  const timeValues = structure.dimensions.observation[0]?.values ?? [];
  const seriesAttributes = structure.attributes?.series ?? [];
  const rows = [];

  for (const [seriesKey, series] of Object.entries(dataSet.series ?? {})) {
    const indices = seriesKey.split(":").map(Number);
    const dimensions = {};
    indices.forEach((index, position) => {
      dimensions[seriesDimensions[position].id] = seriesDimensions[position].values[index]?.id;
    });

    const attributes = {};
    (series.attributes ?? []).forEach((value, position) => {
      const descriptor = seriesAttributes[position];
      if (!descriptor) return;
      if (typeof value === "number") {
        attributes[descriptor.id] = descriptor.values[value]?.id ?? value;
      } else if (value !== null && value !== undefined) {
        attributes[descriptor.id] = value;
      }
    });

    for (const [timeIndex, observation] of Object.entries(series.observations ?? {})) {
      const numeric = Number(observation[0]);
      if (!Number.isFinite(numeric)) continue;
      rows.push({
        ...dimensions,
        TIME_PERIOD: timeValues[Number(timeIndex)]?.value,
        OBS_VALUE: numeric,
        UNIT: attributes.UNITS_OF_MEASURE ?? "",
        SCALE: attributes.SCALE ?? "",
        NOTES: typeof attributes.NOTES_TS === "object"
          ? attributes.NOTES_TS.en ?? attributes.NOTES_TS.uk ?? ""
          : attributes.NOTES_TS ?? "",
      });
    }
  }
  return rows;
}

function codeMap(structureName, listId) {
  const list = readJson(structureName).data.codelists.find((item) => item.id === listId);
  return new Map((list?.codes ?? []).map((code) => [
    code.id,
    code.names?.en ?? code.name ?? code.names?.uk ?? code.id,
  ]));
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function writeCsv(fileName, rows, columns = null) {
  const finalColumns = columns ?? [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const lines = [finalColumns.map(csvEscape).join(",")];
  for (const row of rows) lines.push(finalColumns.map((column) => csvEscape(row[column])).join(","));
  fs.writeFileSync(path.join(here, fileName), `${lines.join("\n")}\n`);
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function latestValue(rows, indicator, nace, targetYear = null) {
  const filtered = rows.filter((row) => row.INDICATOR === indicator && row.NACE === nace);
  if (!filtered.length) return null;
  if (targetYear !== null) return filtered.find((row) => Number(row.TIME_PERIOD) === targetYear)?.OBS_VALUE ?? null;
  return filtered.sort((a, b) => Number(b.TIME_PERIOD) - Number(a.TIME_PERIOD))[0]?.OBS_VALUE ?? null;
}

function latestYear(rows, indicator, nace) {
  const years = rows
    .filter((row) => row.INDICATOR === indicator && row.NACE === nace)
    .map((row) => Number(row.TIME_PERIOD))
    .filter(Number.isFinite);
  return years.length ? Math.max(...years) : null;
}

function safeRatio(numerator, denominator) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
  return numerator / denominator;
}

function irr(cashFlows) {
  const npvAt = (rate) => cashFlows.reduce((total, value, year) => total + value / ((1 + rate) ** year), 0);
  let low = -0.99;
  let high = 10;
  let lowNpv = npvAt(low);
  let highNpv = npvAt(high);
  if (lowNpv * highNpv > 0) return null;
  for (let i = 0; i < 240; i += 1) {
    const mid = (low + high) / 2;
    const midNpv = npvAt(mid);
    if (Math.abs(midNpv) < 1e-10) return mid;
    if (lowNpv * midNpv <= 0) {
      high = mid;
      highNpv = midNpv;
    } else {
      low = mid;
      lowNpv = midNpv;
    }
  }
  return (low + high) / 2;
}

function npv(rate, cashFlows) {
  return cashFlows.reduce((total, value, year) => total + value / ((1 + rate) ** year), 0);
}

const perfRows = parseSdmx(files.perf);
const investRows = parseSdmx(files.invest);
const finRows = parseSdmx(files.fin);
const balanceRows = parseSdmx(files.balance);
const serviceRows = parseSdmx(files.services);
const goodsRows = parseSdmx(files.goods);
const naceNames = codeMap(files.perfStructure, "CL_NACE_UA");

const serviceValue = (serviceCode, year = 2024) => serviceRows.find((row) => row.SERVICE_TYPE === serviceCode && Number(row.TIME_PERIOD) === year)?.OBS_VALUE ?? 0;
const goodsValue = (goodsCode, year = 2024) => goodsRows.find((row) => row.GOODS === goodsCode && Number(row.TIME_PERIOD) === year)?.OBS_VALUE ?? 0;

const officialExportValues = {
  agroProcessing: goodsValue("030000000000") + goodsValue("040000000000"),
  constructionMaterials: goodsValue("130000000000"),
  machineryElectrical: goodsValue("160000000000"),
  transportEquipment: goodsValue("170000000000"),
  transportServices: serviceValue("03"),
  ictServices: serviceValue("09"),
  businessServices: serviceValue("10"),
};

const candidateDefinitions = [
  { nace: "10", label: "Food manufacturing", exportScore: 90, exportAnchor: "agroProcessing", structuralScore: 92, resilienceScore: 84, driver: "Export agro-processing" },
  { nace: "23", label: "Construction materials", exportScore: 74, exportAnchor: "constructionMaterials", structuralScore: 98, resilienceScore: 80, driver: "Reconstruction materials" },
  { nace: "27", label: "Electrical equipment", exportScore: 86, exportAnchor: "machineryElectrical", structuralScore: 98, resilienceScore: 82, driver: "Energy resilience equipment" },
  { nace: "28", label: "Machinery and equipment", exportScore: 82, exportAnchor: "machineryElectrical", structuralScore: 88, resilienceScore: 76, driver: "Industrial localization" },
  { nace: "33", label: "Machinery repair and installation", exportScore: 66, exportAnchor: "machineryElectrical", structuralScore: 85, resilienceScore: 82, driver: "Industrial maintenance" },
  { nace: "35", label: "Electricity and energy supply", exportScore: 95, exportAnchor: null, structuralScore: 100, resilienceScore: 76, driver: "Distributed energy" },
  { nace: "38", label: "Waste recovery and treatment", exportScore: 82, exportAnchor: null, structuralScore: 92, resilienceScore: 82, driver: "Waste-to-value / biomethane" },
  { nace: "42", label: "Civil engineering", exportScore: 70, exportAnchor: null, structuralScore: 96, resilienceScore: 70, driver: "Infrastructure reconstruction" },
  { nace: "52", label: "Warehousing and transport support", exportScore: 88, exportAnchor: "transportServices", structuralScore: 94, resilienceScore: 82, driver: "EU-linked logistics" },
  { nace: "62", label: "Computer programming and consultancy", exportScore: 100, exportAnchor: "ictServices", structuralScore: 92, resilienceScore: 92, driver: "Export software / cyber" },
  { nace: "63", label: "Information services", exportScore: 96, exportAnchor: "ictServices", structuralScore: 88, resilienceScore: 90, driver: "Digital information services" },
  { nace: "72", label: "Research and development", exportScore: 90, exportAnchor: "businessServices", structuralScore: 94, resilienceScore: 86, driver: "Civilian dual-use R&D" },
];

const twoYearDeflator = 1.199 * 1.12; // NBU: 2023 and 2024 GDP deflator growth.
const normalizedRows = [];

for (const definition of candidateDefinitions) {
  const turnover2022 = latestValue(perfRows, "EP_39", definition.nace, 2022);
  const turnover2024 = latestValue(perfRows, "EP_39", definition.nace, 2024);
  const valueAdded2024 = latestValue(perfRows, "EP_14", definition.nace, 2024);
  const employment2024 = latestValue(perfRows, "EP_29", definition.nace, 2024);
  const grossOperatingSurplus2024 = latestValue(perfRows, "EP_02", definition.nace, 2024);
  const investmentYear = latestYear(investRows, "EP_23", definition.nace);
  const grossInvestment = latestValue(investRows, "EP_23", definition.nace, investmentYear);
  const profitability2025 = latestValue(finRows, "SBS_PRF_ENTACT_OPR", definition.nace, 2025);
  const allActivityProfitability2025 = latestValue(finRows, "SBS_PRF_ENTACT_ALL", definition.nace, 2025);
  const profitableShare2025 = latestValue(finRows, "SBS_ENT_PRF", definition.nace, 2025);
  const revenue2025 = latestValue(finRows, "SBS_REV", definition.nace, 2025);
  const currentAssets2025 = latestValue(balanceRows, "SBS_AST_CUR", definition.nace, 2025);
  const currentPayables2025 = latestValue(balanceRows, "SBS_PAY_CUR", definition.nace, 2025);
  const inventory2025 = latestValue(balanceRows, "SBS_INV", definition.nace, 2025);
  const realTurnoverCagr = turnover2022 && turnover2024
    ? ((turnover2024 / turnover2022) / twoYearDeflator) ** 0.5 - 1
    : null;
  const capitalEfficiency = safeRatio(grossOperatingSurplus2024, grossInvestment);
  const valueAddedPerEmployee = safeRatio(valueAdded2024, employment2024);
  const workingCapitalIntensity = revenue2025
    ? safeRatio((currentAssets2025 ?? 0) - (currentPayables2025 ?? 0), revenue2025)
    : null;
  const inventoryIntensity = revenue2025 ? safeRatio(inventory2025, revenue2025) : null;

  const profitScore = (
    clamp(((profitability2025 ?? 0) + 5) / 35 * 100) * 0.70
    + clamp(((profitableShare2025 ?? 40) - 40) / 40 * 100) * 0.30
  );
  const growthScore = clamp(((realTurnoverCagr ?? -0.10) + 0.10) / 0.30 * 100);
  const capitalEfficiencyScore = clamp((capitalEfficiency ?? 0) / 2 * 100);
  const totalScore = (
    profitScore * 0.20
    + growthScore * 0.20
    + definition.exportScore * 0.15
    + capitalEfficiencyScore * 0.15
    + definition.structuralScore * 0.15
    + definition.resilienceScore * 0.15
  );

  normalizedRows.push({
    nace: definition.nace,
    sector: naceNames.get(definition.nace) ?? definition.label,
    screen_label: definition.label,
    demand_driver: definition.driver,
    turnover_2022_ths_uah: turnover2022,
    turnover_2024_ths_uah: turnover2024,
    real_turnover_cagr_2022_2024: realTurnoverCagr,
    operating_profitability_2025_pct: profitability2025,
    all_activity_profitability_2025_pct: allActivityProfitability2025,
    profitable_enterprises_2025_pct: profitableShare2025,
    gross_operating_surplus_2024_ths_uah: grossOperatingSurplus2024,
    gross_investment_latest_ths_uah: grossInvestment,
    gross_investment_year: investmentYear,
    gross_operating_surplus_to_investment: capitalEfficiency,
    value_added_2024_ths_uah: valueAdded2024,
    employment_2024_persons: employment2024,
    value_added_per_employee_ths_uah: valueAddedPerEmployee,
    working_capital_intensity_2025: workingCapitalIntensity,
    inventory_intensity_2025: inventoryIntensity,
    official_export_anchor_2024_ths_usd: definition.exportAnchor ? officialExportValues[definition.exportAnchor] : 0,
    profitability_score: profitScore,
    growth_score: growthScore,
    export_or_import_substitution_score: definition.exportScore,
    capital_efficiency_score: capitalEfficiencyScore,
    structural_demand_score: definition.structuralScore,
    resilience_data_confidence_score: definition.resilienceScore,
    total_score: totalScore,
    evidence_years: `2022-2025; investment ${investmentYear ?? "n/a"}`,
  });
}

normalizedRows.sort((a, b) => b.total_score - a.total_score);
normalizedRows.forEach((row, index) => { row.rank = index + 1; });

const opportunityDefinitions = [
  {
    id: "DUALUSE",
    nace: "72",
    name: "Civilian dual-use sensing & autonomy platform",
    target: "Profitable Ukrainian R&D business developing drones, sensors and autonomy software for infrastructure inspection, agriculture, mapping and industrial safety; no weapons activity.",
    location: "Kyiv/Lviv/Ivano-Frankivsk engineering hubs; export-led and nationally scalable",
    structure: "Preferred equity; board seat; founder vesting; IP assignment; civilian-revenue covenant",
    useOfFunds: "Product certification, localized components, EU sales, test equipment and selective tuck-ins",
    milestones: "60%+ civilian hard-currency revenue; EBITDA margin >20%; two EU channel partners",
    downsideControl: "Tranched funding, IP security, end-use compliance, key-person insurance, civilian revenue floor",
    exit: "Strategic sale to European industrial-technology, inspection or autonomy platform",
    revenueMultiple: 0.95,
    realGrowth: 0.085,
    exportShare: 0.72,
    exportDemandGrowth: 0.085,
    pricePassThrough: 0.35,
    initialMargin: 0.13,
    targetMargin: 0.29,
    depreciationPct: 0.025,
    capexPct: 0.045,
    nwcPct: 0.09,
    exitMultiple: 7.0,
    demandDriver: "Civilian dual-use R&D",
  },
  {
    id: "ENERGY",
    nace: "35",
    name: "Distributed industrial power & storage SPV",
    target: "Portfolio of rooftop solar, battery storage and gas/biomass backup serving creditworthy food, logistics and light-industrial off-takers.",
    location: "Lviv, Zakarpattia, Vinnytsia, Ternopil and Khmelnytskyi oblasts",
    structure: "Asset SPV; 7-10 year take-or-pay PPAs; step-in rights; insured equipment",
    useOfFunds: "Generation, BESS, interconnection, controls and reserve equipment",
    milestones: "Contract 80% of capacity before build; phased commissioning; DSCR-ready reporting",
    downsideControl: "Multiple off-takers, modular phases, equipment security, political-risk insurance pursuit",
    exit: "Yield platform sale to infrastructure/energy investor after operating track record",
    revenueMultiple: 0.60,
    realGrowth: 0.065,
    exportShare: 0.00,
    exportDemandGrowth: 0.00,
    pricePassThrough: 0.95,
    initialMargin: 0.35,
    targetMargin: 0.42,
    depreciationPct: 0.10,
    capexPct: 0.055,
    nwcPct: 0.035,
    exitMultiple: 6.0,
    demandDriver: "Energy resilience",
  },
  {
    id: "AGRO",
    nace: "10",
    name: "Soy/protein processing & traceable ingredients",
    target: "Mid-sized crusher/extruder producing high-protein meal, food ingredients and oil from traceable Ukrainian crops for EU buyers.",
    location: "Vinnytsia, Khmelnytskyi, Ternopil or Lviv oblast",
    structure: "Preferred growth equity; feedstock/off-take conditions precedent; inventory controls",
    useOfFunds: "Processing line, storage, quality lab, energy resilience and working capital",
    milestones: "Secure 70% feedstock; EU traceability compliance; contracted export channel",
    downsideControl: "Borrowing-base controls, hedged/contracted feedstock, equipment collateral",
    exit: "Sale to regional agribusiness or food-ingredient consolidator",
    revenueMultiple: 1.80,
    realGrowth: 0.050,
    exportShare: 0.65,
    exportDemandGrowth: 0.045,
    pricePassThrough: 0.75,
    initialMargin: 0.12,
    targetMargin: 0.18,
    depreciationPct: 0.035,
    capexPct: 0.045,
    nwcPct: 0.15,
    exitMultiple: 5.0,
    demandDriver: "Export agro-processing",
  },
  {
    id: "MATERIALS",
    nace: "23",
    name: "Low-carbon construction materials plant",
    target: "Expansion of a western/central Ukrainian producer of dry mixes, insulation, precast components or recycled aggregate with reconstruction contracts.",
    location: "Lviv, Rivne, Zhytomyr, Vinnytsia or Khmelnytskyi oblast",
    structure: "Preferred equity with equipment security, procurement controls and customer concentration limits",
    useOfFunds: "Modern line, heat/power resilience, molds, recycled feedstock and working capital",
    milestones: "Two anchor contractors; 65% utilization; product certification; positive unit margins",
    downsideControl: "Phased equipment orders, hard-asset collateral, minimum-price clauses",
    exit: "Strategic sale to regional building-products group or management buyout",
    revenueMultiple: 1.40,
    realGrowth: 0.075,
    exportShare: 0.08,
    exportDemandGrowth: 0.025,
    pricePassThrough: 0.85,
    initialMargin: 0.16,
    targetMargin: 0.22,
    depreciationPct: 0.045,
    capexPct: 0.055,
    nwcPct: 0.12,
    exitMultiple: 5.0,
    demandDriver: "Reconstruction materials",
  },
  {
    id: "LOGISTICS",
    nace: "52",
    name: "EU-border cold-chain & contract logistics",
    target: "Brownfield cold-storage and contract-logistics operator linking Ukrainian food exporters with Poland, Slovakia, Hungary and Romania.",
    location: "Lviv, Volyn, Zakarpattia or Chernivtsi oblast",
    structure: "Asset-backed preferred equity; anchor-customer contracts; capex draw controls",
    useOfFunds: "Cold rooms, handling equipment, WMS, backup power and working capital",
    milestones: "60% pre-leased capacity; 3+ anchor customers; EU food-handling certification",
    downsideControl: "Brownfield assets, customer diversification, indexed tariffs, equipment security",
    exit: "Sale to regional logistics platform, infrastructure investor or strategic operator",
    revenueMultiple: 0.85,
    realGrowth: 0.060,
    exportShare: 0.42,
    exportDemandGrowth: 0.045,
    pricePassThrough: 0.80,
    initialMargin: 0.22,
    targetMargin: 0.28,
    depreciationPct: 0.055,
    capexPct: 0.050,
    nwcPct: 0.08,
    exitMultiple: 5.5,
    demandDriver: "EU-linked logistics",
  },
  {
    id: "BIOMETHANE",
    nace: "38",
    name: "Agri-waste biogas / biomethane cluster",
    target: "Modular plants using manure and food-processing waste, with contracted feedstock and heat/power or biomethane off-take.",
    location: "Vinnytsia, Khmelnytskyi, Ternopil or Poltava oblast outside listed risk areas",
    structure: "Project SPV; feedstock/off-take conditions precedent; equipment and receivables security",
    useOfFunds: "Digesters, upgrading, interconnection, storage and commissioning reserves",
    milestones: "Contract feedstock and 80% off-take before construction; phased commissioning",
    downsideControl: "Modular construction, performance guarantees, digestate value recovery",
    exit: "Sale to energy/utility investor after stable production and certification",
    revenueMultiple: 0.55,
    realGrowth: 0.060,
    exportShare: 0.25,
    exportDemandGrowth: 0.050,
    pricePassThrough: 0.90,
    initialMargin: 0.32,
    targetMargin: 0.39,
    depreciationPct: 0.085,
    capexPct: 0.055,
    nwcPct: 0.04,
    exitMultiple: 6.0,
    demandDriver: "Waste-to-value / biomethane",
  },
];

const macro = {
  inflation: [0.075, 0.060, 0.050, 0.050, 0.050, 0.050, 0.050, 0.050, 0.050, 0.050],
  fxDepreciation: [0.070, 0.060, 0.050, 0.050, 0.050, 0.050, 0.050, 0.050, 0.050, 0.050],
  corporateTax: 0.18,
  hurdleRate: 0.20,
};

const scenarios = [
  { name: "Downside", probability: 0.25, revenueFactor: 0.75, growthDelta: -0.060, marginDelta: -0.060, exitFactor: 0.55, fxDelta: 0.050, retentionYears: 3 },
  { name: "Base", probability: 0.50, revenueFactor: 1.00, growthDelta: 0.000, marginDelta: 0.000, exitFactor: 1.00, fxDelta: 0.000, retentionYears: 2 },
  { name: "Upside", probability: 0.25, revenueFactor: 1.12, growthDelta: 0.045, marginDelta: 0.035, exitFactor: 1.28, fxDelta: -0.025, retentionYears: 1 },
];

function modelOpportunity(definition, scenario, ticket = 1) {
  const rows = [];
  const cashFlows = [-ticket];
  let revenue = ticket * definition.revenueMultiple * scenario.revenueFactor;
  let priorRevenue = revenue;

  for (let year = 1; year <= 10; year += 1) {
    const inflation = macro.inflation[year - 1];
    const fxDepreciation = Math.max(0, macro.fxDepreciation[year - 1] + scenario.fxDelta);
    const domesticShare = 1 - definition.exportShare;
    const usdGrowth = Math.max(
      -0.20,
      definition.realGrowth
        + scenario.growthDelta
        + definition.exportShare * definition.exportDemandGrowth
        + domesticShare * (inflation * definition.pricePassThrough - fxDepreciation),
    );
    if (year > 1) revenue *= 1 + usdGrowth;
    const marginRamp = Math.min(1, (year - 1) / 4);
    const ebitdaMargin = clamp(
      definition.initialMargin + (definition.targetMargin - definition.initialMargin) * marginRamp + scenario.marginDelta,
      0.03,
      0.55,
    );
    const ebitda = revenue * ebitdaMargin;
    const depreciation = revenue * definition.depreciationPct;
    const ebit = ebitda - depreciation;
    const tax = Math.max(0, ebit) * macro.corporateTax;
    const capex = revenue * definition.capexPct;
    const deltaNwc = year === 1 ? 0 : (revenue - priorRevenue) * definition.nwcPct;
    const fcf = ebitda - tax - capex - deltaNwc;
    const distributedFcf = year <= scenario.retentionYears ? Math.min(0, fcf) : fcf;
    const terminalValue = year === 10 ? ebitda * definition.exitMultiple * scenario.exitFactor : 0;
    const equityCashFlow = distributedFcf + terminalValue;
    cashFlows.push(equityCashFlow);
    rows.push({
      opportunity_id: definition.id,
      opportunity: definition.name,
      scenario: scenario.name,
      probability: scenario.probability,
      year,
      revenue_usd_m: revenue,
      usd_revenue_growth: year === 1 ? null : usdGrowth,
      ebitda_margin: ebitdaMargin,
      ebitda_usd_m: ebitda,
      corporate_tax_usd_m: tax,
      capex_usd_m: capex,
      delta_nwc_usd_m: deltaNwc,
      free_cash_flow_usd_m: fcf,
      terminal_value_usd_m: terminalValue,
      equity_cash_flow_usd_m: equityCashFlow,
    });
    priorRevenue = revenue;
  }

  const proceeds = cashFlows.slice(1).filter((value) => value > 0).reduce((sum, value) => sum + value, 0);
  const contributions = -cashFlows.filter((value) => value < 0).reduce((sum, value) => sum + value, 0);
  return {
    rows,
    cashFlows,
    irr: irr(cashFlows),
    moic: contributions ? proceeds / contributions : null,
    npv: npv(macro.hurdleRate, cashFlows),
  };
}

const opportunityResults = [];
for (const opportunity of opportunityDefinitions) {
  const sector = normalizedRows.find((row) => row.nace === opportunity.nace);
  const scenarioResults = scenarios.map((scenario) => ({ scenario, result: modelOpportunity(opportunity, scenario, 1) }));
  const expectedCashFlows = Array.from({ length: 11 }, (_, year) => scenarioResults.reduce(
    (sum, item) => sum + item.result.cashFlows[year] * item.scenario.probability,
    0,
  ));
  const expectedNpv = scenarioResults.reduce((sum, item) => sum + item.result.npv * item.scenario.probability, 0);
  const weightedMoic = scenarioResults.reduce((sum, item) => sum + (item.result.moic ?? 0) * item.scenario.probability, 0);
  opportunityResults.push({
    ...opportunity,
    sectorScore: sector?.total_score ?? 0,
    sectorRank: sector?.rank ?? null,
    expectedNpvPerDollar: expectedNpv,
    expectedIrr: irr(expectedCashFlows),
    expectedMoic: weightedMoic,
    scenarioResults,
  });
}

function combinations(items, size, start = 0, prefix = [], output = []) {
  if (prefix.length === size) {
    output.push(prefix.slice());
    return output;
  }
  for (let index = start; index < items.length; index += 1) {
    prefix.push(items[index]);
    combinations(items, size, index + 1, prefix, output);
    prefix.pop();
  }
  return output;
}

function allocate(combo) {
  const minTicket = 1.5;
  const maxTicket = 3.0;
  const target = 9.0;
  const increment = 0.25;
  const allocations = combo.map(() => minTicket);
  let remaining = target - minTicket * combo.length;
  const order = combo
    .map((item, index) => ({ index, objective: item.expectedNpvPerDollar * (0.75 + item.sectorScore / 400) }))
    .sort((a, b) => b.objective - a.objective);
  while (remaining > 1e-9) {
    let placed = false;
    for (const item of order) {
      if (allocations[item.index] + increment <= maxTicket + 1e-9) {
        allocations[item.index] += increment;
        remaining -= increment;
        placed = true;
        break;
      }
    }
    if (!placed) break;
  }
  const objective = combo.reduce((sum, item, index) => (
    sum + allocations[index] * item.expectedNpvPerDollar * (0.75 + item.sectorScore / 400)
  ), 0);
  return { allocations, objective };
}

let best = null;
for (const combo of combinations(opportunityResults.filter((item) => item.sectorScore >= 45), 4)) {
  const drivers = new Set(combo.map((item) => item.demandDriver));
  if (drivers.size < 3) continue;
  const allocation = allocate(combo);
  if (!best || allocation.objective > best.objective) best = { combo, ...allocation };
}

if (!best) throw new Error("No feasible four-opportunity portfolio found.");

const selected = best.combo.map((opportunity, index) => ({
  ...opportunity,
  allocation: best.allocations[index],
})).sort((a, b) => b.allocation - a.allocation || b.expectedNpvPerDollar - a.expectedNpvPerDollar);

const portfolioScenarioRows = [];
const portfolioScenarioCashFlows = {};
for (const scenario of scenarios) {
  const flows = Array(11).fill(0);
  for (const item of selected) {
    const modeled = modelOpportunity(item, scenario, item.allocation);
    modeled.cashFlows.forEach((value, year) => { flows[year] += value; });
  }
  flows[0] -= 1.0; // Reserve is committed but modeled as returned at cost in year 10.
  flows[10] += 1.0;
  portfolioScenarioCashFlows[scenario.name] = flows;
  const scenarioIrr = irr(flows);
  const positive = flows.slice(1).filter((value) => value > 0).reduce((sum, value) => sum + value, 0);
  const negative = -flows.filter((value) => value < 0).reduce((sum, value) => sum + value, 0);
  portfolioScenarioRows.push({
    scenario: scenario.name,
    probability: scenario.probability,
    gross_usd_irr: scenarioIrr,
    gross_usd_moic: positive / negative,
    npv_at_20pct_usd_m: npv(macro.hurdleRate, flows),
  });
}

const expectedPortfolioFlows = Array.from({ length: 11 }, (_, year) => scenarios.reduce(
  (sum, scenario) => sum + portfolioScenarioCashFlows[scenario.name][year] * scenario.probability,
  0,
));
const expectedPortfolioIrr = irr(expectedPortfolioFlows);
const expectedPositive = expectedPortfolioFlows.slice(1).filter((value) => value > 0).reduce((sum, value) => sum + value, 0);
const expectedNegative = -expectedPortfolioFlows.filter((value) => value < 0).reduce((sum, value) => sum + value, 0);

const opportunityScenarioRows = [];
const cashFlowRows = [];
for (const opportunity of opportunityResults) {
  for (const item of opportunity.scenarioResults) {
    opportunityScenarioRows.push({
      opportunity_id: opportunity.id,
      opportunity: opportunity.name,
      nace: opportunity.nace,
      sector_score: opportunity.sectorScore,
      sector_rank: opportunity.sectorRank,
      scenario: item.scenario.name,
      probability: item.scenario.probability,
      gross_usd_irr: item.result.irr,
      gross_usd_moic: item.result.moic,
      npv_at_20pct_per_1_usd: item.result.npv,
    });
    cashFlowRows.push(...item.result.rows);
  }
}

const selectedRows = selected.map((item) => ({
  opportunity_id: item.id,
  opportunity: item.name,
  nace: item.nace,
  allocation_usd_m: item.allocation,
  sector_score: item.sectorScore,
  sector_rank: item.sectorRank,
  probability_weighted_irr: item.expectedIrr,
  probability_weighted_moic: item.expectedMoic,
  probability_weighted_npv_per_usd: item.expectedNpvPerDollar,
  target_profile: item.target,
  location: item.location,
  structure: item.structure,
  use_of_funds: item.useOfFunds,
  milestones: item.milestones,
  downside_control: item.downsideControl,
  exit: item.exit,
}));

const portfolioCashFlowRows = [];
for (const scenario of scenarios) {
  portfolioScenarioCashFlows[scenario.name].forEach((value, year) => {
    portfolioCashFlowRows.push({ scenario: scenario.name, probability: scenario.probability, year, equity_cash_flow_usd_m: value });
  });
}
expectedPortfolioFlows.forEach((value, year) => {
  portfolioCashFlowRows.push({ scenario: "Probability weighted", probability: 1, year, equity_cash_flow_usd_m: value });
});

const scoreColumns = [
  "rank", "nace", "screen_label", "demand_driver", "operating_profitability_2025_pct",
  "profitable_enterprises_2025_pct", "real_turnover_cagr_2022_2024",
  "gross_operating_surplus_to_investment", "official_export_anchor_2024_ths_usd",
  "profitability_score", "growth_score", "export_or_import_substitution_score",
  "capital_efficiency_score", "structural_demand_score", "resilience_data_confidence_score",
  "total_score", "evidence_years",
];

writeCsv("normalized_sector_data.csv", normalizedRows);
writeCsv("scoring_output.csv", normalizedRows, scoreColumns);
writeCsv("opportunity_scenarios.csv", opportunityScenarioRows);
writeCsv("opportunity_cash_flows.csv", cashFlowRows);
writeCsv("selected_portfolio.csv", selectedRows);
writeCsv("portfolio_scenarios.csv", portfolioScenarioRows);
writeCsv("portfolio_cash_flows.csv", portfolioCashFlowRows);

writeCsv("data_dictionary.csv", [
  { field: "total_score", definition: "Weighted 0-100 sector screen", source_or_formula: "20% profitability + 20% real growth + 15% export/import substitution + 15% capital efficiency + 15% structural demand + 15% resilience/data confidence" },
  { field: "real_turnover_cagr_2022_2024", definition: "Approximate real annual turnover growth", source_or_formula: "Ukrstat turnover; deflated by cumulative NBU 2023-2024 GDP deflator" },
  { field: "gross_operating_surplus_to_investment", definition: "Sector cash-generation proxy", source_or_formula: "Ukrstat gross operating surplus / latest gross investment" },
  { field: "gross_usd_irr", definition: "Gross equity IRR after portfolio-company tax, before investor tax/fees", source_or_formula: "Modeled annual USD equity cash flows" },
  { field: "gross_usd_moic", definition: "Positive equity proceeds divided by contributions", source_or_formula: "Modeled annual USD equity cash flows" },
  { field: "npv_at_20pct", definition: "Net present value at the selected 20% USD hurdle", source_or_formula: "SUM(CF_t/(1+20%)^t)" },
  { field: "official_export_anchor_2024_ths_usd", definition: "Associated official category export value", source_or_formula: "Ukrstat goods or service exports, 2024; not attributed one-for-one to the NACE sector" },
  { field: "analyst_assumption", definition: "Editable operating, scenario, or deal-structure assumption", source_or_formula: "Clearly separated from official observations; not represented as an official forecast" },
]);

const summary = {
  asOfDate: "2026-07-09",
  modelCurrency: "USD millions",
  hurdleRate: macro.hurdleRate,
  totalCapital: 10,
  investedCapital: 9,
  reserve: 1,
  optimizerObjective: best.objective,
  selected: selectedRows,
  portfolioScenarios: portfolioScenarioRows,
  probabilityWeighted: {
    grossUsdIrr: expectedPortfolioIrr,
    grossUsdMoic: expectedPositive / expectedNegative,
    npvAt20PctUsdM: npv(macro.hurdleRate, expectedPortfolioFlows),
    cashFlows: expectedPortfolioFlows,
  },
  macroAssumptions: macro,
  scenarioWeights: Object.fromEntries(scenarios.map((scenario) => [scenario.name, scenario.probability])),
  officialExportAnchors: officialExportValues,
  dataCaveat: "Ukrstat enterprise series exclude temporarily occupied territories and parts of territories where military actions are/were conducted; comparisons spanning 2022 require caution.",
};
fs.writeFileSync(path.join(here, "portfolio_summary.json"), `${JSON.stringify(summary, null, 2)}\n`);

console.log(JSON.stringify({
  selected: selectedRows.map((row) => ({
    opportunity: row.opportunity,
    allocation: row.allocation_usd_m,
    sectorScore: row.sector_score,
    expectedIrr: row.probability_weighted_irr,
    expectedMoic: row.probability_weighted_moic,
  })),
  portfolioScenarios: portfolioScenarioRows,
  probabilityWeighted: summary.probabilityWeighted,
}, null, 2));
