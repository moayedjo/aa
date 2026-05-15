import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { slides, theme } = await req.json();

    if (!slides || !Array.isArray(slides)) {
      return NextResponse.json({ error: "slides array required" }, { status: 400 });
    }

    // In production: use Puppeteer/Playwright for server-side PDF generation
    // Or return instructions for client-side html2canvas + jsPDF export
    return NextResponse.json({
      message: "لتصدير PDF، استخدم زر التصدير في المحرر (html2canvas + jsPDF على جانب العميل).",
      slidesCount: slides.length,
    });
  } catch {
    return NextResponse.json({ error: "PDF export failed" }, { status: 500 });
  }
}
