import { Slide, PresentationData } from "@/types";

interface GenerateOptions {
  topic: string;
  slidesCount: number;
  category: string;
  templateId: string;
  theme?: { primary: string; secondary: string; font: string };
}

export async function generatePresentation(
  options: GenerateOptions
): Promise<PresentationData> {
  const { topic, slidesCount, category, templateId, theme } = options;

  // In production: call OpenAI/Claude API here
  const slides: Slide[] = Array.from({ length: slidesCount }, (_, i) => {
    if (i === 0) {
      return {
        id: `slide-${i + 1}`,
        type: "title" as const,
        title: topic,
        subtitle: "عرض تقديمي مولّد بالذكاء الاصطناعي",
        layout: "center" as const,
      };
    }
    if (i === slidesCount - 1) {
      return {
        id: `slide-${i + 1}`,
        type: "content" as const,
        title: "الخلاصة والتوصيات",
        content: ["النقطة الأولى", "النقطة الثانية", "الخطوات التالية"],
        layout: "default" as const,
      };
    }
    if (i % 2 === 0) {
      return {
        id: `slide-${i + 1}`,
        type: "two-column" as const,
        title: `المحور الرئيسي ${i}`,
        content: [
          "النقطة الفرعية الأولى",
          "النقطة الفرعية الثانية",
          "النقطة الفرعية الثالثة",
        ],
        layout: "split" as const,
      };
    }
    return {
      id: `slide-${i + 1}`,
      type: "bullets" as const,
      title: `العنصر ${i} من ${category}`,
      content: ["عنصر أول", "عنصر ثانٍ", "عنصر ثالث", "عنصر رابع"],
      layout: "default" as const,
    };
  });

  const speakerNotes: Record<string, string> = {};
  slides.forEach((s, i) => {
    speakerNotes[s.id] = `ملاحظات الشريحة ${i + 1}: تناول هذا الموضوع بالتفصيل.`;
  });

  return {
    id: crypto.randomUUID(),
    title: topic,
    slides,
    templateId,
    theme: theme || { primary: "#0d585f", secondary: "#e4f1e1", font: "Cairo" },
    speakerNotes,
  };
}
