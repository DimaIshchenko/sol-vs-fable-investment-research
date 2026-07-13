from pathlib import Path

from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


ROOT = Path.cwd()
PACK = ROOT / "outputs" / "ukraine_10m_investment_pack_2026"
PNG = PACK / "Ukraine_10M_Investment_Thesis.png"
PDF = PACK / "Ukraine_10M_Investment_Thesis.pdf"


def main() -> None:
    # One 16:9 PowerPoint page at 13.333 x 7.5 inches.
    page = (13.333 * 72, 7.5 * 72)
    pdf = canvas.Canvas(str(PDF), pagesize=page, pageCompression=1)
    pdf.setTitle("Ukraine $10M / 10-Year Investment Thesis")
    pdf.setAuthor("Investment research analysis based on official Ukrainian sources")
    pdf.setSubject("Illustrative private-investment portfolio for Ukraine")
    pdf.drawImage(ImageReader(str(PNG)), 0, 0, width=page[0], height=page[1])
    pdf.showPage()
    pdf.save()
    print(f"SAVED {PDF}")


if __name__ == "__main__":
    main()
