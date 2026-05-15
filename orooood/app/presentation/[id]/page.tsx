"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PresentationView from "@/components/PresentationView";
import { PresentationData } from "@/types";

const MOCK_PRESENTATION: PresentationData = {
  id: "1",
  title: "تحليل تطبيق سند الرقمي",
  templateId: "corporate",
  theme: { primary: "#0d585f", secondary: "#e4f1e1", font: "Cairo" },
  speakerNotes: {
    "slide-1": "رحّب بالحضور وقدّم نفسك.",
    "slide-2": "تناول مبادئ ماير الثلاث بالتفصيل.",
    "slide-3": "قدّم الأمثلة التطبيقية.",
  },
  slides: [
    {
      id: "slide-1",
      type: "title",
      title: "تحليل تطبيق سند الرقمي",
      subtitle: "وفق مبادئ ريتشارد ماير للتعلم المتعدد الوسائط",
      layout: "center",
    },
    {
      id: "slide-2",
      type: "two-column",
      title: "مبادئ التعلم المتعدد الوسائط",
      content: [
        "مبدأ التقليل: تقليل الحمل المعرفي",
        "مبدأ التنظيم: تنظيم المعلومات مكانياً",
        "مبدأ التوافق: توافق الصوت والصورة",
      ],
      layout: "split",
    },
    {
      id: "slide-3",
      type: "content",
      title: "تحليل تجربة المستخدم",
      content: ["سهولة الوصول", "تصميم متجاوب", "تغذية راجعة فورية"],
      layout: "default",
    },
  ],
};

export default function PresentationPage() {
  const { id } = useParams();
  const router = useRouter();

  return (
    <PresentationView
      presentation={MOCK_PRESENTATION}
      onClose={() => router.push(`/editor/${id}`)}
    />
  );
}
