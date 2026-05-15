import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { slides, theme } = await req.json();

    if (!slides || !Array.isArray(slides)) {
      return NextResponse.json({ error: "slides array required" }, { status: 400 });
    }

    // In production: use pptxgenjs on the server to generate a real PPTX
    // Return a download URL or base64-encoded file
    return NextResponse.json({
      message: "لتصدير PPTX، استخدم مكتبة pptxgenjs على جانب العميل أو السيرفر.",
      slidesCount: slides.length,
    });
  } catch {
    return NextResponse.json({ error: "PPTX export failed" }, { status: 500 });
  }
}
