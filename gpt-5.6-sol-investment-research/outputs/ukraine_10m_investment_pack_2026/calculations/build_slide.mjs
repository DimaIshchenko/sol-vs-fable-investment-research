import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const cwd = process.cwd();
const outDir = path.join(cwd, "outputs", "ukraine_10m_investment_pack_2026");
const qaDir = path.join(outDir, "calculations", "qa");

const COLORS = {
  ink: "#0C203A",
  blue: "#1675D1",
  bluePale: "#EAF3FC",
  bluePaler: "#F5F9FD",
  gray: "#5B6573",
  grid: "#CDD5DF",
  light: "#F4F6F8",
  white: "#FFFFFF",
  reserve: "#FFF5D6",
  reserveInk: "#8A5A00",
  green: "#0B6B3A",
};

async function writeBlob(filePath, blob) {
  await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
}

function addRect(slide, x, y, w, h, fill, lineFill = fill, lineWidth = 0) {
  return slide.shapes.add({
    geometry: "rect",
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: { style: "solid", fill: lineFill, width: lineWidth },
  });
}

function addText(slide, value, x, y, w, h, options = {}) {
  const box = slide.shapes.add({
    geometry: "textbox",
    position: { left: x, top: y, width: w, height: h },
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  box.text = value;
  box.text.style = {
    fontSize: options.fontSize ?? 17,
    fontFamily: "Aptos",
    color: options.color ?? COLORS.ink,
    bold: options.bold ?? false,
    italic: options.italic ?? false,
    alignment: options.alignment ?? "left",
    verticalAlignment: options.verticalAlignment ?? "middle",
  };
  return box;
}

function addMetric(slide, x, width, label, value, accent = false) {
  addText(slide, label, x, 124, width, 17, {
    fontSize: 11.5,
    color: accent ? "#B9DBFF" : "#AFC0D5",
    bold: true,
  });
  addText(slide, value, x, 142, width, 28, {
    fontSize: 20,
    color: COLORS.white,
    bold: true,
  });
}

function addCell(slide, x, y, w, h, fill, textValue, options = {}) {
  addRect(slide, x, y, w, h, fill, COLORS.grid, 0.8);
  addText(slide, textValue, x + (options.padX ?? 10), y + (options.padY ?? 6),
    w - 2 * (options.padX ?? 10), h - 2 * (options.padY ?? 6), options);
}

async function main() {
  await fs.mkdir(qaDir, { recursive: true });
  const presentation = Presentation.create({ slideSize: { width: 1280, height: 720 } });

  const slide = presentation.slides.add();
  slide.background.fill = COLORS.white;

  // Codex Grid evidence-table composition: full-width takeaway, metric band, five evidence rows.
  addRect(slide, 0, 0, 8, 720, COLORS.blue);
  addText(
    slide,
    "Four focused bets can clear a 20% USD hurdle - without underwriting frontline exposure",
    42, 25, 1190, 83,
    { fontSize: 38, color: COLORS.ink, bold: true, verticalAlignment: "top" },
  );

  addRect(slide, 42, 116, 1196, 64, COLORS.ink);
  addMetric(slide, 58, 220, "$10M MANDATE", "$9M deployed + $1M reserve", true);
  addMetric(slide, 305, 210, "PROBABILITY-WEIGHTED", "24.6% IRR  |  6.50x MOIC", true);
  addMetric(slide, 548, 205, "BASE CASE", "22.9% IRR  |  $2.13M NPV");
  addMetric(slide, 782, 214, "SCENARIO RANGE", "3.0%-36.2% gross USD IRR");
  addMetric(slide, 1020, 197, "MODEL BASIS", "Unlevered  |  10 years");

  const tableX = 42;
  const tableY = 194;
  const headerH = 42;
  const rowH = 78;
  const widths = [304, 164, 276, 140, 312];
  const headers = [
    "Opportunity / target profile",
    "Allocation / safer region",
    "Official evidence",
    "Analyst base return",
    "Key risk → underwriting control",
  ];
  let x = tableX;
  headers.forEach((header, index) => {
    addCell(slide, x, tableY, widths[index], headerH, COLORS.ink, header, {
      fontSize: 14.5,
      color: COLORS.white,
      bold: true,
      padX: 10,
      padY: 5,
    });
    x += widths[index];
  });

  const rows = [
    {
      opportunity: "Civilian sensing & autonomy\nInfrastructure, farm and industrial inspection",
      allocation: "$3.0M\nLviv / Kyiv; distributed team",
      evidence: "NACE 72: 19.5% operating profitability; +17.3% real turnover CAGR; score 87.7. [S02-S05]",
      returns: "28.9% IRR\n9.0x MOIC",
      control: "IP / end-use → preferred equity; milestone tranches; IP assignment; civilian-revenue covenant",
    },
    {
      opportunity: "Soy/protein processing\nTraceable ingredients and export-grade by-products",
      allocation: "$3.0M\nVinnytsia / Khmelnytskyi",
      evidence: "NACE 10: 4.7% operating profitability; +3.1% real turnover CAGR; score 72.5; $9.5bn export anchor. [S02-S07]",
      returns: "21.8% IRR\n5.2x MOIC",
      control: "Feedstock / working capital → contracted supply and offtake; borrowing-base controls; equipment lien",
    },
    {
      opportunity: "Low-carbon construction materials\nInsulation, precast or recycled-content products",
      allocation: "$1.5M\nLviv / Ternopil corridor",
      evidence: "NACE 23: 10.6% operating profitability; +8.7% real turnover CAGR; score 76.1. [S02-S05]",
      returns: "21.0% IRR\n4.8x MOIC",
      control: "Ramp / input prices → phased equipment orders; minimum-price clauses; hard-asset security",
    },
    {
      opportunity: "Distributed industrial power & storage SPV\nBehind-the-meter resilience for multiple plants",
      allocation: "$1.5M\nCentral / western industrial sites",
      evidence: "NACE 35 score 65.1; power/storage is an official priority despite a -4.3% real turnover CAGR. [S02-S05, S17]",
      returns: "20.9% IRR\n4.6x MOIC",
      control: "Offtaker / damage → multi-offtaker SPV; modular phases; equipment security; pursue PRI",
    },
    {
      opportunity: "Diligence & follow-on reserve\nRelease only to protect or scale a validated winner",
      allocation: "$1.0M\nHeld in USD until conditions clear",
      evidence: "No forecast return assigned; current FX and territory orders must be refreshed at signing. [S14, S19]",
      returns: "1.0x residual\nreturned in Y10",
      control: "Execution / data gaps → QoE, sanctions, end-use, security, insurance and governance conditions precedent",
      reserve: true,
    },
  ];

  rows.forEach((row, rowIndex) => {
    const y = tableY + headerH + rowIndex * rowH;
    const baseFill = row.reserve ? COLORS.reserve : (rowIndex % 2 === 0 ? COLORS.white : COLORS.light);
    let cx = tableX;
    const values = [row.opportunity, row.allocation, row.evidence, row.returns, row.control];
    values.forEach((value, colIndex) => {
      let fill = baseFill;
      if (!row.reserve && colIndex === 3) fill = COLORS.bluePale;
      addCell(slide, cx, y, widths[colIndex], rowH, fill, value, {
        fontSize: colIndex === 2 || colIndex === 4 ? 14.3 : 15.4,
        color: row.reserve && colIndex === 3 ? COLORS.reserveInk : COLORS.ink,
        bold: colIndex === 0 || colIndex === 3,
        padX: 10,
        padY: 7,
      });
      cx += widths[colIndex];
    });
    addRect(slide, tableX, y, 5, rowH, row.reserve ? "#D99C13" : COLORS.blue);
  });

  addText(
    slide,
    "Gross USD equity returns after modeled company tax; before investor taxes, fees and carry. Analyst scenarios are not official forecasts. Base case is unlevered. Physical assets must remain outside officially designated active-hostility and occupied territories.",
    42, 642, 1125, 35,
    { fontSize: 11.5, color: COLORS.gray, italic: true, verticalAlignment: "top" },
  );
  addText(
    slide,
    "Sources: Ukrstat S02-S11; NBU S12-S14; UkraineInvest S17-S18; consolidated official territory list S19. Retrieved 9-10 Jul 2026. Full calculations and source files accompany this slide.",
    42, 680, 1125, 22,
    { fontSize: 10.5, color: COLORS.gray, verticalAlignment: "top" },
  );
  addText(slide, "01", 1186, 675, 51, 22, {
    fontSize: 12, color: COLORS.gray, bold: true, alignment: "right",
  });

  const png = await presentation.export({ slide, format: "png", scale: 3 });
  await writeBlob(path.join(outDir, "Ukraine_10M_Investment_Thesis.png"), png);

  const preview = await presentation.export({ slide, format: "png", scale: 1 });
  await writeBlob(path.join(qaDir, "slide-01-preview.png"), preview);
  const layout = await slide.export({ format: "layout" });
  await fs.writeFile(path.join(qaDir, "slide-01-layout.json"), await layout.text());

  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(path.join(outDir, "Ukraine_10M_Investment_Thesis.pptx"));
  console.log(`SAVED ${outDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
