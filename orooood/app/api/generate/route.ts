import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { topic, slidesCount = 5, category, templateId } = await req.json();

    if (!topic) {
      return NextResponse.json({ error: "topic is required" }, { status: 400 });
    }

    // In production: verify user tokens via Supabase, then call OpenAI/Claude API
    const generatedSlides = Array.from(
      { length: Math.min(slidesCount, 30) },
      (_, i) => {
        if (i === 0) {
          return {
            id: `slide-${i + 1}`,
            type: "title",
            title: topic,
            subtitle: "عرض تقديمي مولّد بالذكاء الاصطناعي",
            layout: "center",
          };
        }
        if (i === slidesCount - 1) {
          return {
            id: `slide-${i + 1}`,
            type: "content",
            title: "الخلاصة والتوصيات",
            content: ["النقطة الرئيسية الأولى", "النقطة الرئيسية الثانية", "الخطوات التالية"],
            layout: "default",
          };
        }
        return {
          id: `slide-${i + 1}`,
          type: i % 2 === 0 ? "two-column" : "bullets",
          title: `المحور الرئيسي ${i}`,
          content: [
            "النقطة الفرعية الأولى",
            "النقطة الفرعية الثانية",
            "النقطة الفرعية الثالثة",
          ],
          layout: i % 2 === 0 ? "split" : "default",
        };
      }
    );

    const speakerNotes: Record<string, string> = {};
    generatedSlides.forEach((s, i) => {
      speakerNotes[s.id] = `ملاحظات الشريحة ${i + 1}: تناول هذا المحور بالتفصيل.`;
    });

    // In production: deduct tokens + save to DB
    return NextResponse.json({
      success: true,
      presentation: {
        id: crypto.randomUUID(),
        title: topic,
        slides: generatedSlides,
        templateId,
        category,
        status: "completed",
        speakerNotes,
        theme: { primary: "#0d585f", secondary: "#e4f1e1", font: "Cairo" },
      },
    });
  } catch {
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
