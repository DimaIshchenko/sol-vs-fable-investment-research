import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const packDir = path.join(process.cwd(), "outputs", "ukraine_10m_investment_pack_2026");
const calcDir = path.join(packDir, "calculations");
const qaDir = path.join(calcDir, "qa", "workbook");
const outputPath = path.join(packDir, "Ukraine_Investment_Model.xlsx");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  const [headers, ...body] = rows;
  return body.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])));
}

function num(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function colLetter(index) {
  let value = index;
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

function setTitle(sheet, range, title, subtitle = null) {
  sheet.getRange(range).merge();
  const start = range.split(":")[0];
  sheet.getRange(start).values = [[title]];
  sheet.getRange(range).format = {
    fill: "#0B1F3A",
    font: { bold: true, color: "#FFFFFF", size: 18 },
    verticalAlignment: "center",
  };
  if (subtitle) {
    const row = Number(start.match(/\d+/)[0]) + 2;
    sheet.getRange(`A${row}:H${row}`).merge();
    sheet.getRange(`A${row}`).values = [[subtitle]];
    sheet.getRange(`A${row}:H${row}`).format = {
      font: { italic: true, color: "#475569", size: 10 },
      wrapText: true,
    };
  }
}

function styleHeader(range) {
  range.format = {
    fill: "#DCE6F1",
    font: { bold: true, color: "#0B1F3A" },
    borders: { preset: "all", style: "thin", color: "#B8C2CC" },
    verticalAlignment: "center",
    wrapText: true,
  };
}

function styleSection(range) {
  range.format = {
    fill: "#0B1F3A",
    font: { bold: true, color: "#FFFFFF" },
    verticalAlignment: "center",
  };
}

function addComment(workbook, sheet, cell, text) {
  workbook.comments.addThread({ cell: sheet.getRange(cell) }, text);
}

const sectorRows = parseCsv(await fs.readFile(path.join(calcDir, "scoring_output.csv"), "utf8"));
const sourceRows = parseCsv(await fs.readFile(path.join(packDir, "sources", "source_register.csv"), "utf8"));
const selectedRows = parseCsv(await fs.readFile(path.join(calcDir, "selected_portfolio.csv"), "utf8"));
const opportunityScenarioRows = parseCsv(await fs.readFile(path.join(calcDir, "opportunity_scenarios.csv"), "utf8"));
const summary = JSON.parse(await fs.readFile(path.join(calcDir, "portfolio_summary.json"), "utf8"));

const workbook = Workbook.create();
workbook.comments.setSelf({ displayName: "User" });
const readMe = workbook.worksheets.add("Read Me");
const sources = workbook.worksheets.add("Sources");
const sector = workbook.worksheets.add("Sector Screen");
const assumptions = workbook.worksheets.add("Opportunity Assumptions");
const cashFlows = workbook.worksheets.add("Cash Flows");
const portfolio = workbook.worksheets.add("Portfolio & Scenarios");
const checks = workbook.worksheets.add("Checks");

for (const sheet of workbook.worksheets.items) sheet.showGridLines = false;

// READ ME
setTitle(readMe, "A1:H2", "Ukraine $10M / 10-Year Investment Model", "As of 2026-07-09 | Official Ukrainian sources; editable analyst assumptions are identified in blue.");
readMe.getRange("A5:B11").values = [
  ["Key output", "Value"],
  ["Probability-weighted gross USD IRR", null],
  ["Probability-weighted gross USD MOIC", null],
  ["Probability-weighted NPV @ 20% ($m)", null],
  ["Base gross USD IRR", null],
  ["Downside gross USD IRR", null],
  ["Upside gross USD IRR", null],
];
styleHeader(readMe.getRange("A5:B5"));
readMe.getRange("B6").formulas = [["='Portfolio & Scenarios'!B6"]];
readMe.getRange("B7").formulas = [["='Portfolio & Scenarios'!B7"]];
readMe.getRange("B8").formulas = [["='Portfolio & Scenarios'!B8"]];
readMe.getRange("B9").formulas = [["='Portfolio & Scenarios'!B9"]];
readMe.getRange("B10").formulas = [["='Portfolio & Scenarios'!B10"]];
readMe.getRange("B11").formulas = [["='Portfolio & Scenarios'!B11"]];
readMe.getRange("B6:B8").format.font = { color: "#008000" };
readMe.getRange("B9:B11").format.font = { color: "#008000" };
readMe.getRange("B6").format.numberFormat = "0.0%";
readMe.getRange("B7").format.numberFormat = "0.0x";
readMe.getRange("B8").format.numberFormat = "$0.0";
readMe.getRange("B9:B11").format.numberFormat = "0.0%";
readMe.getRange("A13:H13").merge();
readMe.getRange("A13").values = [["How to use this workbook"]];
styleSection(readMe.getRange("A13:H13"));
readMe.getRange("A14:H18").values = [
  ["1", "Official observations", "Sector Screen and Sources contain the statistical evidence. Official values are black; formulas are black; cross-sheet links are green.", null, null, null, null, null],
  ["2", "Editable assumptions", "Blue inputs on Opportunity Assumptions control deal economics, macro paths and scenarios. They are analyst estimates, not government forecasts.", null, null, null, null, null],
  ["3", "Returns", "Gross USD equity IRR/MOIC are after modeled portfolio-company tax, before investor-level tax, fees and carry. Base case is unlevered.", null, null, null, null, null],
  ["4", "Territory rule", "Physical assets must be outside officially designated active-hostility and occupied territories; refresh the current order at diligence and closing.", null, null, null, null, null],
  ["5", "Decision use", "This is a sector screen and illustrative deal model, not a substitute for target-level commercial, legal, sanctions, security, tax or technical diligence.", null, null, null, null, null],
];
readMe.getRange("A14:A18").format.font = { bold: true, color: "#3D8DFF" };
readMe.getRange("B14:B18").format.font = { bold: true };
readMe.getRange("C14:H18").merge(true);
readMe.getRange("C14:H18").format.wrapText = true;
readMe.getRange("A20:H20").merge();
readMe.getRange("A20").values = [["Color convention"]];
styleSection(readMe.getRange("A20:H20"));
readMe.getRange("A21:H22").values = [
  ["Blue", "Editable analyst assumption", "Black", "Formula or official observation", "Green", "Cross-sheet formula", "Yellow", "Attention / update item"],
  ["Official sources", "Plain URLs and cell comments", "Scenarios", "25% downside / 50% base / 25% upside", "Hurdle", "20% gross USD IRR", "Reserve", "$1.0m returned at cost in year 10"],
];
readMe.getRange("A21").format.font = { color: "#0000FF", bold: true };
readMe.getRange("C21").format.font = { color: "#000000", bold: true };
readMe.getRange("E21").format.font = { color: "#008000", bold: true };
readMe.getRange("G21").format = { fill: "#FFF2CC", font: { bold: true } };
readMe.getRange("A1:H22").format.font.name = "Arial";
readMe.getRange("A:A").format.columnWidth = 38;
readMe.getRange("B:B").format.columnWidth = 20;
readMe.getRange("C:C").format.columnWidth = 22;
readMe.getRange("D:D").format.columnWidth = 20;
readMe.getRange("E:E").format.columnWidth = 13;
readMe.getRange("F:F").format.columnWidth = 22;
readMe.getRange("G:G").format.columnWidth = 13;
readMe.getRange("H:H").format.columnWidth = 22;
readMe.getRange("A14:H18").format.rowHeight = 42;

// SOURCES
setTitle(sources, "A1:K2", "Official Sources & Audit Trail", "Raw files are archived in sources/raw; each model input maps to a source ID or is labeled as an analyst assumption.");
const sourceHeaders = ["ID", "Publisher", "Dataset / document", "Period", "Units", "Raw file", "URL", "Retrieved", "Model use", "Transformation", "Caveat"];
sources.getRange("A5:K5").values = [sourceHeaders];
styleHeader(sources.getRange("A5:K5"));
const sourceMatrix = sourceRows.map((row) => [
  row.source_id, row.publisher, row.dataset_or_document, row.period_or_as_of, row.units,
  row.raw_file, row.url, row.retrieved, row.model_use, row.transformation, row.caveat,
]);
sources.getRange(`A6:K${5 + sourceMatrix.length}`).values = sourceMatrix;
sources.getRange(`A5:K${5 + sourceMatrix.length}`).format.borders = { preset: "inside", style: "thin", color: "#D9E0E7" };
sources.getRange(`A6:K${5 + sourceMatrix.length}`).format.wrapText = true;
sources.getRange(`A6:A${5 + sourceMatrix.length}`).format.font = { bold: true, color: "#3D8DFF" };
sources.freezePanes.freezeRows(5);
const sourceWidths = [9, 24, 33, 18, 18, 38, 56, 13, 30, 34, 48];
sourceWidths.forEach((width, index) => { sources.getRange(`${colLetter(index + 1)}:${colLetter(index + 1)}`).format.columnWidth = width; });
sources.getRange(`6:${5 + sourceMatrix.length}`).format.rowHeight = 58;

// SECTOR SCREEN
setTitle(sector, "A1:Q2", "Risk-Adjusted Sector Screen", "0-100 score: profitability 20% | real growth 20% | export/import substitution 15% | capital efficiency 15% | structural demand 15% | resilience/data confidence 15%.");
const sectorHeaders = [
  "Rank", "NACE", "Sector", "2025 operating profitability", "2025 profitable enterprises", "2022-24 real turnover CAGR",
  "GOS / latest investment", "Export / import substitution", "Structural demand", "Resilience / data confidence",
  "Profitability score", "Growth score", "Capital efficiency score", "Weighted score", "Official export anchor ($m)", "Evidence", "Selected",
];
sector.getRange("A5:Q5").values = [sectorHeaders];
styleHeader(sector.getRange("A5:Q5"));
const selectedNaces = new Set(selectedRows.map((row) => row.nace));
sectorRows.forEach((row, index) => {
  const excelRow = 6 + index;
  sector.getRange(`A${excelRow}:J${excelRow}`).values = [[
    index + 1, row.nace, row.screen_label,
    num(row.operating_profitability_2025_pct) / 100,
    num(row.profitable_enterprises_2025_pct) / 100,
    num(row.real_turnover_cagr_2022_2024),
    num(row.gross_operating_surplus_to_investment),
    num(row.export_or_import_substitution_score),
    num(row.structural_demand_score),
    num(row.resilience_data_confidence_score),
  ]];
  sector.getRange(`K${excelRow}`).formulas = [[`=MAX(0,MIN(100,((D${excelRow}+5%)/35%*100)*70%+((E${excelRow}-40%)/40%*100)*30%))`]];
  sector.getRange(`L${excelRow}`).formulas = [[`=MAX(0,MIN(100,(F${excelRow}+10%)/30%*100))`]];
  sector.getRange(`M${excelRow}`).formulas = [[`=MAX(0,MIN(100,G${excelRow}/2*100))`]];
  sector.getRange(`N${excelRow}`).formulas = [[`=K${excelRow}*20%+L${excelRow}*20%+H${excelRow}*15%+M${excelRow}*15%+I${excelRow}*15%+J${excelRow}*15%`]];
  sector.getRange(`O${excelRow}:Q${excelRow}`).values = [[
    num(row.official_export_anchor_2024_ths_usd) / 1000,
    row.evidence_years.replace("2022-2025; investment ", "2022-25; inv. "),
    selectedNaces.has(row.nace) ? "YES" : "",
  ]];
  addComment(workbook, sector, `D${excelRow}`, `Source S04: Ukrstat 2025 operating profitability for NACE ${row.nace}.`);
  addComment(workbook, sector, `E${excelRow}`, `Source S04: Ukrstat share of profitable enterprises in 2025 for NACE ${row.nace}.`);
  addComment(workbook, sector, `F${excelRow}`, `Sources S02 and S12: Ukrstat turnover deflated by cumulative NBU 2023-2024 GDP deflator. Approximation; wartime coverage caveat applies.`);
  addComment(workbook, sector, `G${excelRow}`, `Sources S02 and S03: 2024 gross operating surplus divided by latest available enterprise gross investment (generally 2023).`);
  addComment(workbook, sector, `H${excelRow}`, `Analyst score supported by official exports (S06/S07), NBU energy context (S12) and UkraineInvest priority sectors (S17/S18).`);
  addComment(workbook, sector, `I${excelRow}`, `Analyst structural-demand score supported by UkraineInvest official priorities (S17/S18).`);
  addComment(workbook, sector, `J${excelRow}`, `Analyst resilience/data-confidence score; considers S02-S04 territorial caveats and S19 geographic policy.`);
  addComment(workbook, sector, `O${excelRow}`, `Official 2024 category export anchor from S06 or S07; context only, not attributed one-for-one to this NACE sector.`);
});
const sectorEnd = 5 + sectorRows.length;
sector.getRange(`D6:F${sectorEnd}`).format.numberFormat = "0.0%";
sector.getRange(`G6:G${sectorEnd}`).format.numberFormat = "0.0x";
sector.getRange(`H6:N${sectorEnd}`).format.numberFormat = "0.0";
sector.getRange(`O6:O${sectorEnd}`).format.numberFormat = "$#,##0.0";
sector.getRange(`A5:Q${sectorEnd}`).format.borders = { preset: "inside", style: "thin", color: "#D9E0E7" };
sector.getRange(`P6:P${sectorEnd}`).format.wrapText = true;
sector.getRange(`6:${sectorEnd}`).format.rowHeight = 30;
sector.getRange(`Q6:Q${sectorEnd}`).conditionalFormats.add("containsText", { text: "YES", format: { fill: "#D9EAD3", font: { bold: true, color: "#1B5E20" } } });
sector.getRange(`N6:N${sectorEnd}`).conditionalFormats.add("colorScale", { criteria: [
  { type: "lowestValue", color: "#FCE8E6" }, { type: "percentile", value: 50, color: "#FFF2CC" }, { type: "highestValue", color: "#D9EAD3" },
] });
sector.freezePanes.freezeRows(5);
const sectorWidths = [7, 8, 31, 14, 14, 14, 13, 13, 13, 14, 12, 12, 12, 12, 15, 18, 10];
sectorWidths.forEach((width, index) => { sector.getRange(`${colLetter(index + 1)}:${colLetter(index + 1)}`).format.columnWidth = width; });
sector.getRange("5:5").format.rowHeight = 54;

// OPPORTUNITY ASSUMPTIONS
setTitle(assumptions, "A1:P2", "Opportunity & Macro Assumptions", "Blue cells are editable analyst assumptions. Sector scores are linked to the official-data screen in green.");
const oppHeaders = ["ID", "NACE", "Opportunity", "Allocation ($m)", "Sector score", "Year 1 revenue / capital", "Real volume growth", "Export share", "Export demand growth", "Price pass-through", "Initial EBITDA margin", "Target EBITDA margin", "D&A / revenue", "Capex / revenue", "NWC / revenue", "Exit EBITDA multiple"];
assumptions.getRange("A5:P5").values = [oppHeaders];
styleHeader(assumptions.getRange("A5:P5"));
const opportunityById = Object.fromEntries(summary.selected.map((item) => [item.opportunity_id, item]));
const fullOpportunityDefinitions = {
  DUALUSE: { revenueMultiple: 0.95, realGrowth: 0.085, exportShare: 0.72, exportDemandGrowth: 0.085, pricePassThrough: 0.35, initialMargin: 0.13, targetMargin: 0.29, depreciationPct: 0.025, capexPct: 0.045, nwcPct: 0.09, exitMultiple: 7.0 },
  AGRO: { revenueMultiple: 1.80, realGrowth: 0.050, exportShare: 0.65, exportDemandGrowth: 0.045, pricePassThrough: 0.75, initialMargin: 0.12, targetMargin: 0.18, depreciationPct: 0.035, capexPct: 0.045, nwcPct: 0.15, exitMultiple: 5.0 },
  MATERIALS: { revenueMultiple: 1.40, realGrowth: 0.075, exportShare: 0.08, exportDemandGrowth: 0.025, pricePassThrough: 0.85, initialMargin: 0.16, targetMargin: 0.22, depreciationPct: 0.045, capexPct: 0.055, nwcPct: 0.12, exitMultiple: 5.0 },
  ENERGY: { revenueMultiple: 0.60, realGrowth: 0.065, exportShare: 0.00, exportDemandGrowth: 0.00, pricePassThrough: 0.95, initialMargin: 0.35, targetMargin: 0.42, depreciationPct: 0.10, capexPct: 0.055, nwcPct: 0.035, exitMultiple: 6.0 },
};
const assumptionRowById = {};
selectedRows.forEach((item, index) => {
  const excelRow = 6 + index;
  assumptionRowById[item.opportunity_id] = excelRow;
  const def = fullOpportunityDefinitions[item.opportunity_id];
  assumptions.getRange(`A${excelRow}:D${excelRow}`).values = [[item.opportunity_id, item.nace, item.opportunity, num(item.allocation_usd_m)]];
  const screenExcelRow = 6 + sectorRows.findIndex((row) => row.nace === item.nace);
  assumptions.getRange(`E${excelRow}`).formulas = [[`='Sector Screen'!N${screenExcelRow}`]];
  assumptions.getRange(`F${excelRow}:P${excelRow}`).values = [[
    def.revenueMultiple, def.realGrowth, def.exportShare, def.exportDemandGrowth, def.pricePassThrough,
    def.initialMargin, def.targetMargin, def.depreciationPct, def.capexPct, def.nwcPct, def.exitMultiple,
  ]];
  assumptions.getRange(`D${excelRow}`).format.font = { color: "#0000FF" };
  assumptions.getRange(`E${excelRow}`).format.font = { color: "#008000" };
  assumptions.getRange(`F${excelRow}:P${excelRow}`).format.font = { color: "#0000FF" };
  for (const cell of ["D", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"]) {
    addComment(workbook, assumptions, `${cell}${excelRow}`, `Editable analyst assumption for ${item.opportunity}. Official sector anchors: S02-S07 and S12; this value is not an official forecast.`);
  }
});
assumptions.getRange("D6:D9").format.numberFormat = "$0.00";
assumptions.getRange("E6:E9").format.numberFormat = "0.0";
assumptions.getRange("F6:F9").format.numberFormat = "0.00x";
assumptions.getRange("G6:O9").format.numberFormat = "0.0%";
assumptions.getRange("P6:P9").format.numberFormat = "0.0x";
assumptions.getRange("A12:H12").merge();
assumptions.getRange("A12").values = [["Scenario assumptions"]];
styleSection(assumptions.getRange("A12:H12"));
assumptions.getRange("A13:H13").values = [["Scenario", "Probability", "Year 1 revenue factor", "Growth delta", "Margin delta", "Exit factor", "FX depreciation delta", "Retention years"]];
styleHeader(assumptions.getRange("A13:H13"));
const scenarioMatrix = [
  ["Downside", 0.25, 0.75, -0.060, -0.060, 0.55, 0.050, 3],
  ["Base", 0.50, 1.00, 0.000, 0.000, 1.00, 0.000, 2],
  ["Upside", 0.25, 1.12, 0.045, 0.035, 1.28, -0.025, 1],
];
assumptions.getRange("A14:H16").values = scenarioMatrix;
assumptions.getRange("B14:H16").format.font = { color: "#0000FF" };
assumptions.getRange("B14:B16").format.numberFormat = "0%";
assumptions.getRange("C14:G16").format.numberFormat = "0.0%";
assumptions.getRange("C14:C16").format.numberFormat = "0.00x";
assumptions.getRange("F14:F16").format.numberFormat = "0.00x";
assumptions.getRange("A19:E19").values = [["Forecast year", "Inflation", "FX depreciation", "Corporate tax", "USD hurdle"]];
styleHeader(assumptions.getRange("A19:E19"));
for (let year = 1; year <= 10; year += 1) {
  const excelRow = 19 + year;
  assumptions.getRange(`A${excelRow}:E${excelRow}`).values = [[
    2025 + year,
    summary.macroAssumptions.inflation[year - 1],
    summary.macroAssumptions.fxDepreciation[year - 1],
    summary.macroAssumptions.corporateTax,
    summary.macroAssumptions.hurdleRate,
  ]];
  assumptions.getRange(`B${excelRow}:E${excelRow}`).format.font = { color: "#0000FF" };
  addComment(workbook, assumptions, `B${excelRow}`, year <= 3 ? "Source S12: NBU inflation path through 2028." : "Analyst assumption: 5% long-run inflation aligned with the NBU target; not an official forecast beyond the published horizon.");
  addComment(workbook, assumptions, `C${excelRow}`, "Analyst FX depreciation assumption. Source S14 supplies official historical/current rates; NBU does not publish this model path as an FX forecast.");
}
assumptions.getRange("B20:E29").format.numberFormat = "0.0%";
assumptions.getRange("A32:H32").values = [["Opportunity", "Target profile", "Safer-region location", "Structure", "Use of funds", "Milestones", "Downside control", "Exit route"]];
styleHeader(assumptions.getRange("A32:H32"));
selectedRows.forEach((item, index) => {
  const excelRow = 33 + index;
  assumptions.getRange(`A${excelRow}:H${excelRow}`).values = [[
    item.opportunity, item.target_profile,
    item.location, item.structure, item.use_of_funds, item.milestones, item.downside_control, item.exit,
  ]];
});
assumptions.getRange("A33:H36").format.wrapText = true;
assumptions.getRange("33:36").format.rowHeight = 105;
assumptions.freezePanes.freezeRows(5);
const oppWidths = [13, 8, 38, 13, 12, 14, 12, 11, 13, 12, 12, 12, 11, 11, 11, 12];
oppWidths.forEach((width, index) => { assumptions.getRange(`${colLetter(index + 1)}:${colLetter(index + 1)}`).format.columnWidth = width; });
for (const column of ["A", "B", "C", "D", "E", "F", "G", "H"]) assumptions.getRange(`${column}:${column}`).format.columnWidth = Math.max(assumptions.getRange(`${column}:${column}`).format.columnWidth ?? 10, 21);

// CASH FLOWS
setTitle(cashFlows, "A1:M2", "10-Year Opportunity Cash Flows", "USD millions | formula-driven from Opportunity Assumptions | each scenario block shows revenue, EBITDA, FCF, terminal value and equity returns.");
const scenarioRowByName = { Downside: 14, Base: 15, Upside: 16 };
const blockMap = {};
let blockIndex = 0;
for (const item of selectedRows) {
  for (const scenarioName of ["Downside", "Base", "Upside"]) {
    const start = 5 + blockIndex * 18;
    const assumptionRow = assumptionRowById[item.opportunity_id];
    const scenarioRow = scenarioRowByName[scenarioName];
    const key = `${item.opportunity_id}|${scenarioName}`;
    blockMap[key] = {
      start,
      equityRow: start + 13,
      irrRow: start + 14,
      moicRow: start + 15,
      npvRow: start + 16,
    };
    cashFlows.getRange(`A${start}:M${start}`).merge();
    cashFlows.getRange(`A${start}`).values = [[`${item.opportunity} — ${scenarioName}`]];
    styleSection(cashFlows.getRange(`A${start}:M${start}`));
    cashFlows.getRange(`A${start + 1}:M${start + 1}`).values = [["Metric", "Units", 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]];
    styleHeader(cashFlows.getRange(`A${start + 1}:M${start + 1}`));
    const labels = [
      ["Revenue", "$m"], ["USD revenue growth", "%"], ["EBITDA margin", "%"], ["EBITDA", "$m"],
      ["D&A", "$m"], ["EBIT", "$m"], ["Corporate tax", "$m"], ["Capex", "$m"], ["Change in NWC", "$m"],
      ["Free cash flow", "$m"], ["Terminal value", "$m"], ["Equity cash flow", "$m"], ["Gross USD IRR", "%"],
      ["Gross USD MOIC", "x"], ["NPV @ 20%", "$m"],
    ];
    cashFlows.getRange(`A${start + 2}:B${start + 16}`).values = labels;
    const revenueRow = start + 2;
    const growthRow = start + 3;
    const marginRow = start + 4;
    const ebitdaRow = start + 5;
    const depreciationRow = start + 6;
    const ebitRow = start + 7;
    const taxRow = start + 8;
    const capexRow = start + 9;
    const deltaNwcRow = start + 10;
    const fcfRow = start + 11;
    const terminalRow = start + 12;
    const equityRow = start + 13;
    cashFlows.getRange(`C${revenueRow}:C${terminalRow}`).values = Array.from({ length: terminalRow - revenueRow + 1 }, () => [0]);
    cashFlows.getRange(`C${equityRow}`).formulas = [[`=-'Opportunity Assumptions'!$D$${assumptionRow}`]];
    for (let year = 1; year <= 10; year += 1) {
      const column = colLetter(3 + year);
      const previous = colLetter(2 + year);
      const macroRow = 19 + year;
      if (year === 1) {
        cashFlows.getRange(`${column}${revenueRow}`).formulas = [[`='Opportunity Assumptions'!$D$${assumptionRow}*'Opportunity Assumptions'!$F$${assumptionRow}*'Opportunity Assumptions'!$C$${scenarioRow}`]];
        cashFlows.getRange(`${column}${growthRow}`).values = [[null]];
      } else {
        cashFlows.getRange(`${column}${growthRow}`).formulas = [[`=MAX(-20%,'Opportunity Assumptions'!$G$${assumptionRow}+'Opportunity Assumptions'!$D$${scenarioRow}+'Opportunity Assumptions'!$H$${assumptionRow}*'Opportunity Assumptions'!$I$${assumptionRow}+(1-'Opportunity Assumptions'!$H$${assumptionRow})*('Opportunity Assumptions'!$B$${macroRow}*'Opportunity Assumptions'!$J$${assumptionRow}-MAX(0,'Opportunity Assumptions'!$C$${macroRow}+'Opportunity Assumptions'!$G$${scenarioRow})))`]];
        cashFlows.getRange(`${column}${revenueRow}`).formulas = [[`=${previous}${revenueRow}*(1+${column}${growthRow})`]];
      }
      cashFlows.getRange(`${column}${marginRow}`).formulas = [[`=MAX(3%,MIN(55%,'Opportunity Assumptions'!$K$${assumptionRow}+('Opportunity Assumptions'!$L$${assumptionRow}-'Opportunity Assumptions'!$K$${assumptionRow})*MIN(1,(${year}-1)/4)+'Opportunity Assumptions'!$E$${scenarioRow}))`]];
      cashFlows.getRange(`${column}${ebitdaRow}`).formulas = [[`=${column}${revenueRow}*${column}${marginRow}`]];
      cashFlows.getRange(`${column}${depreciationRow}`).formulas = [[`=${column}${revenueRow}*'Opportunity Assumptions'!$M$${assumptionRow}`]];
      cashFlows.getRange(`${column}${ebitRow}`).formulas = [[`=${column}${ebitdaRow}-${column}${depreciationRow}`]];
      cashFlows.getRange(`${column}${taxRow}`).formulas = [[`=MAX(0,${column}${ebitRow})*'Opportunity Assumptions'!$D$${macroRow}`]];
      cashFlows.getRange(`${column}${capexRow}`).formulas = [[`=${column}${revenueRow}*'Opportunity Assumptions'!$N$${assumptionRow}`]];
      cashFlows.getRange(`${column}${deltaNwcRow}`).formulas = [[year === 1 ? "=0" : `=(${column}${revenueRow}-${previous}${revenueRow})*'Opportunity Assumptions'!$O$${assumptionRow}`]];
      cashFlows.getRange(`${column}${fcfRow}`).formulas = [[`=${column}${ebitdaRow}-${column}${taxRow}-${column}${capexRow}-${column}${deltaNwcRow}`]];
      cashFlows.getRange(`${column}${terminalRow}`).formulas = [[year === 10 ? `=${column}${ebitdaRow}*'Opportunity Assumptions'!$P$${assumptionRow}*'Opportunity Assumptions'!$F$${scenarioRow}` : "=0"]];
      cashFlows.getRange(`${column}${equityRow}`).formulas = [[`=IF(${year}<='Opportunity Assumptions'!$H$${scenarioRow},MIN(0,${column}${fcfRow}),${column}${fcfRow})+${column}${terminalRow}`]];
    }
    cashFlows.getRange(`C${start + 14}`).formulas = [[`=IF(AND(MIN(C${equityRow}:M${equityRow})<0,MAX(C${equityRow}:M${equityRow})>0),IRR(C${equityRow}:M${equityRow}),"")`]];
    cashFlows.getRange(`C${start + 15}`).formulas = [[`=SUMIF(C${equityRow}:M${equityRow},">0",C${equityRow}:M${equityRow})/-SUMIF(C${equityRow}:M${equityRow},"<0",C${equityRow}:M${equityRow})`]];
    cashFlows.getRange(`C${start + 16}`).formulas = [[`=NPV('Opportunity Assumptions'!$E$20,D${equityRow}:M${equityRow})+C${equityRow}`]];
    cashFlows.getRange(`C${revenueRow}:M${revenueRow}`).format.numberFormat = "$0.00";
    cashFlows.getRange(`C${growthRow}:M${marginRow}`).format.numberFormat = "0.0%";
    cashFlows.getRange(`C${ebitdaRow}:M${equityRow}`).format.numberFormat = "$0.00";
    cashFlows.getRange(`C${start + 14}`).format.numberFormat = "0.0%";
    cashFlows.getRange(`C${start + 15}`).format.numberFormat = "0.0x";
    cashFlows.getRange(`C${start + 16}`).format.numberFormat = "$0.00";
    cashFlows.getRange(`A${start + 13}:M${start + 13}`).format.borders = { top: { style: "thin", color: "#0B1F3A" } };
    blockIndex += 1;
  }
}
cashFlows.freezePanes.freezeRows(4);
cashFlows.getRange("A:A").format.columnWidth = 24;
cashFlows.getRange("B:B").format.columnWidth = 10;
cashFlows.getRange("C:M").format.columnWidth = 12;

// PORTFOLIO & SCENARIOS
setTitle(portfolio, "A1:P2", "Recommended $10M Portfolio", "Optimizer maximizes probability-weighted NPV at a 20% gross USD hurdle subject to four bets, $3m maximum ticket, $1m reserve and independent demand drivers.");
portfolio.getRange("A5:B12").values = [
  ["Portfolio output", "Value"],
  ["Probability-weighted gross USD IRR", null],
  ["Probability-weighted gross USD MOIC", null],
  ["Probability-weighted NPV @ 20% ($m)", null],
  ["Base gross USD IRR", null],
  ["Downside gross USD IRR", null],
  ["Upside gross USD IRR", null],
  ["Invested capital / reserve ($m)", null],
];
styleHeader(portfolio.getRange("A5:B5"));
portfolio.getRange("A15:P15").values = [["Scenario", "Probability", 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, "IRR", "MOIC", "NPV @ 20%"]];
styleHeader(portfolio.getRange("A15:P15"));
const portfolioScenarioRow = { Downside: 16, Base: 17, Upside: 18, "Probability weighted": 19 };
for (const [scenarioName, excelRow] of Object.entries(portfolioScenarioRow)) {
  portfolio.getRange(`A${excelRow}`).values = [[scenarioName]];
  if (scenarioName !== "Probability weighted") {
    const probability = scenarioMatrix.find((row) => row[0] === scenarioName)[1];
    portfolio.getRange(`B${excelRow}`).values = [[probability]];
    const assumptionScenarioRow = scenarioRowByName[scenarioName];
    portfolio.getRange(`B${excelRow}`).formulas = [[`='Opportunity Assumptions'!$B$${assumptionScenarioRow}`]];
  } else {
    portfolio.getRange(`B${excelRow}`).values = [[1]];
  }
  for (let year = 0; year <= 10; year += 1) {
    const column = colLetter(3 + year);
    if (scenarioName === "Probability weighted") {
      portfolio.getRange(`${column}${excelRow}`).formulas = [[`=${column}16*$B$16+${column}17*$B$17+${column}18*$B$18`]];
    } else {
      const parts = selectedRows.map((item) => {
        const block = blockMap[`${item.opportunity_id}|${scenarioName}`];
        return `'Cash Flows'!${column}${block.equityRow}`;
      });
      const reserveAdjustment = year === 0 ? "-1" : year === 10 ? "+1" : "";
      portfolio.getRange(`${column}${excelRow}`).formulas = [[`=${parts.join("+")}${reserveAdjustment}`]];
    }
  }
  portfolio.getRange(`N${excelRow}`).formulas = [[`=IF(AND(MIN(C${excelRow}:M${excelRow})<0,MAX(C${excelRow}:M${excelRow})>0),IRR(C${excelRow}:M${excelRow}),"")`]];
  portfolio.getRange(`O${excelRow}`).formulas = [[`=SUMIF(C${excelRow}:M${excelRow},">0",C${excelRow}:M${excelRow})/-SUMIF(C${excelRow}:M${excelRow},"<0",C${excelRow}:M${excelRow})`]];
  portfolio.getRange(`P${excelRow}`).formulas = [[`=NPV('Opportunity Assumptions'!$E$20,D${excelRow}:M${excelRow})+C${excelRow}`]];
}
portfolio.getRange("B6").formulas = [["=N19"]];
portfolio.getRange("B7").formulas = [["=O19"]];
portfolio.getRange("B8").formulas = [["=P19"]];
portfolio.getRange("B9").formulas = [["=N17"]];
portfolio.getRange("B10").formulas = [["=N16"]];
portfolio.getRange("B11").formulas = [["=N18"]];
portfolio.getRange("B12").formulas = [["=SUM('Opportunity Assumptions'!D6:D9)&\" / \"&1"]];
portfolio.getRange("B6:B11").format.font = { color: "#008000", bold: true };
portfolio.getRange("B6:B7").format.numberFormat = "0.0%";
portfolio.getRange("B8").format.numberFormat = "$0.0";
portfolio.getRange("B9:B11").format.numberFormat = "0.0%";
portfolio.getRange("B16:B19").format.numberFormat = "0%";
portfolio.getRange("C16:M19").format.numberFormat = "$0.00";
portfolio.getRange("N16:N19").format.numberFormat = "0.0%";
portfolio.getRange("O16:O19").format.numberFormat = "0.0x";
portfolio.getRange("P16:P19").format.numberFormat = "$0.00";
portfolio.getRange("A22:G22").values = [["Opportunity", "Allocation ($m)", "Sector score", "Base IRR", "Base MOIC", "Key official evidence", "Risk control"]];
styleHeader(portfolio.getRange("A22:G22"));
selectedRows.forEach((item, index) => {
  const excelRow = 23 + index;
  const assumptionRow = assumptionRowById[item.opportunity_id];
  const baseBlock = blockMap[`${item.opportunity_id}|Base`];
  const screen = sectorRows.find((row) => row.nace === item.nace);
  portfolio.getRange(`A${excelRow}:C${excelRow}`).formulas = [[
    `='Opportunity Assumptions'!C${assumptionRow}`,
    `='Opportunity Assumptions'!D${assumptionRow}`,
    `='Opportunity Assumptions'!E${assumptionRow}`,
  ]];
  portfolio.getRange(`D${excelRow}`).formulas = [[`='Cash Flows'!C${baseBlock.irrRow}`]];
  portfolio.getRange(`E${excelRow}`).formulas = [[`='Cash Flows'!C${baseBlock.moicRow}`]];
  portfolio.getRange(`F${excelRow}:G${excelRow}`).values = [[
    `NACE ${item.nace}: ${num(screen.operating_profitability_2025_pct).toFixed(1)}% operating profitability; ${num(screen.real_turnover_cagr_2022_2024) >= 0 ? "+" : ""}${(num(screen.real_turnover_cagr_2022_2024) * 100).toFixed(1)}% real turnover CAGR; official score ${num(screen.total_score).toFixed(1)}.`,
    item.downside_control,
  ]];
  portfolio.getRange(`A${excelRow}:E${excelRow}`).format.font = { color: "#008000" };
});
portfolio.getRange("B23:B26").format.numberFormat = "$0.00";
portfolio.getRange("C23:C26").format.numberFormat = "0.0";
portfolio.getRange("D23:D26").format.numberFormat = "0.0%";
portfolio.getRange("E23:E26").format.numberFormat = "0.0x";
portfolio.getRange("F23:G26").format.wrapText = true;
portfolio.getRange("23:26").format.rowHeight = 72;
portfolio.getRange("A28:G28").merge();
portfolio.getRange("A28").values = [["Decision: proceed only to target-level diligence; do not deploy until off-take, end-use, security, insurance and governance conditions are satisfied."]];
portfolio.getRange("A28:G28").format = { fill: "#FFF2CC", font: { bold: true, color: "#7F6000" }, wrapText: true };
portfolio.getRange("A:A").format.columnWidth = 42;
portfolio.getRange("B:E").format.columnWidth = 14;
portfolio.getRange("F:G").format.columnWidth = 42;
portfolio.getRange("H:P").format.columnWidth = 12;

// CHECKS
setTitle(checks, "A1:G2", "Model Checks", "All checks should read OK before using the recommendation.");
checks.getRange("A4:G4").values = [["Check", "Actual", "Expected", "Difference", "Tolerance", "Status", "Notes"]];
styleHeader(checks.getRange("A4:G4"));
const checkRows = [
  ["Total capital", "='Portfolio & Scenarios'!C19*-1", 10, "=B5-C5", 0.0001, "=IF(ABS(D5)<=E5,\"OK\",\"FAIL\")", "Includes $9m investment and $1m reserve"],
  ["Invested capital", "=SUM('Opportunity Assumptions'!D6:D9)", 9, "=B6-C6", 0.0001, "=IF(ABS(D6)<=E6,\"OK\",\"FAIL\")", "Four selected opportunities"],
  ["Reserve", "=10-B6", 1, "=B7-C7", 0.0001, "=IF(ABS(D7)<=E7,\"OK\",\"FAIL\")", "Returned at cost in year 10"],
  ["Scenario probabilities", "=SUM('Opportunity Assumptions'!B14:B16)", 1, "=B8-C8", 0.0001, "=IF(ABS(D8)<=E8,\"OK\",\"FAIL\")", "25% / 50% / 25%"],
  ["Opportunity count", "=COUNTA('Opportunity Assumptions'!A6:A9)", 4, "=B9-C9", 0, "=IF(D9=0,\"OK\",\"FAIL\")", "Required by mandate"],
  ["Maximum ticket", "=MAX('Opportunity Assumptions'!D6:D9)", 3, "=MAX(0,B10-C10)", 0, "=IF(D10=0,\"OK\",\"FAIL\")", "$3m maximum"],
  ["20% hurdle", "='Opportunity Assumptions'!E20", 0.20, "=B11-C11", 0.0001, "=IF(ABS(D11)<=E11,\"OK\",\"FAIL\")", "Gross USD hurdle"],
  ["Base IRR clears hurdle", "='Portfolio & Scenarios'!B9", 0.20, "=B12-C12", 0, "=IF(D12>=0,\"OK\",\"FAIL\")", "Base case only"],
  ["Scenario sign pattern", "=IF(AND(MIN('Portfolio & Scenarios'!C16:M18)<0,MAX('Portfolio & Scenarios'!C16:M18)>0),1,0)", 1, "=B13-C13", 0, "=IF(D13=0,\"OK\",\"FAIL\")", "Required for valid IRR"],
  ["Territory policy", "Applied", "Applied", "=IF(B14=C14,0,1)", 0, "=IF(D14=0,\"OK\",\"FAIL\")", "Refresh S19 at diligence and closing"],
  ["Direct weapons", "Excluded", "Excluded", "=IF(B15=C15,0,1)", 0, "=IF(D15=0,\"OK\",\"FAIL\")", "Civilian dual-use revenue covenant"],
  ["Base leverage/incentive", "Excluded", "Excluded", "=IF(B16=C16,0,1)", 0, "=IF(D16=0,\"OK\",\"FAIL\")", "Potential financing is upside only"],
];
checkRows.forEach((row, index) => {
  const excelRow = 5 + index;
  checks.getRange(`A${excelRow}`).values = [[row[0]]];
  if (String(row[1]).startsWith("=")) checks.getRange(`B${excelRow}`).formulas = [[row[1]]]; else checks.getRange(`B${excelRow}`).values = [[row[1]]];
  checks.getRange(`C${excelRow}`).values = [[row[2]]];
  checks.getRange(`D${excelRow}`).formulas = [[row[3]]];
  checks.getRange(`E${excelRow}`).values = [[row[4]]];
  checks.getRange(`F${excelRow}`).formulas = [[row[5]]];
  checks.getRange(`G${excelRow}`).values = [[row[6]]];
});
checks.getRange("A18:F18").merge();
checks.getRange("A18").values = [["Overall model status"]];
checks.getRange("G18").formulas = [["=IF(COUNTIF(F5:F16,\"FAIL\")=0,\"OK\",\"FAIL\")"]];
styleSection(checks.getRange("A18:F18"));
checks.getRange("G18").format = { fill: "#D9EAD3", font: { bold: true, color: "#1B5E20" }, alignment: "center" };
checks.getRange("F5:F16").conditionalFormats.add("containsText", { text: "OK", format: { fill: "#D9EAD3", font: { bold: true, color: "#1B5E20" } } });
checks.getRange("F5:F16").conditionalFormats.add("containsText", { text: "FAIL", format: { fill: "#F4CCCC", font: { bold: true, color: "#9C0006" } } });
checks.getRange("B11:C12").format.numberFormat = "0.0%";
checks.getRange("A:G").format.columnWidth = 22;
checks.getRange("G:G").format.columnWidth = 42;

// Global formatting touch-ups.
for (const sheet of workbook.worksheets.items) {
  const used = sheet.getUsedRange();
  if (used) used.format.font.name = "Arial";
}

await fs.mkdir(qaDir, { recursive: true });
const previewSpecs = [
  ["Read Me", "A1:H22"],
  ["Sources", `A1:K${5 + sourceMatrix.length}`],
  ["Sector Screen", `A1:Q${sectorEnd}`],
  ["Opportunity Assumptions", "A1:P36"],
  ["Cash Flows", `A1:M${5 + blockIndex * 18}`],
  ["Portfolio & Scenarios", "A1:P28"],
  ["Checks", "A1:G18"],
];
for (const [sheetName, range] of previewSpecs) {
  const blob = await workbook.render({ sheetName, range, scale: sheetName === "Cash Flows" ? 0.7 : 1.1, format: "png" });
  await fs.writeFile(path.join(qaDir, `workbook-${sheetName.replaceAll(" ", "-").replaceAll("&", "and")}.png`), new Uint8Array(await blob.arrayBuffer()));
}

const keyInspect = await workbook.inspect({
  kind: "table",
  range: "'Portfolio & Scenarios'!A5:P28",
  include: "values,formulas",
  tableMaxRows: 30,
  tableMaxCols: 16,
  maxChars: 16000,
});
console.log("PORTFOLIO_INSPECT");
console.log(keyInspect.ndjson);
const errorInspect = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!",
  options: { useRegex: true, maxResults: 300 },
  summary: "final formula error scan",
});
console.log("ERROR_SCAN");
console.log(errorInspect.ndjson);
const checkInspect = await workbook.inspect({
  kind: "table",
  range: "Checks!A4:G18",
  include: "values,formulas",
  tableMaxRows: 20,
  tableMaxCols: 8,
  maxChars: 10000,
});
console.log("CHECKS_INSPECT");
console.log(checkInspect.ndjson);

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(`SAVED ${outputPath}`);
