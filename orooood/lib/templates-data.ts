import { Template } from "@/types";

export const TEMPLATES_BY_CATEGORY: Record<string, Template[]> = {
  عام: [
    {
      id: "freestyle",
      title: "حر",
      category: "عام",
      thumbnailUrl: "/templates/freestyle.jpg",
      isPro: false,
      colors: { primary: "#0d585f", secondary: "#e4f1e1" },
      fonts: { heading: "Cairo", body: "Cairo" },
    },
    {
      id: "bold-blue",
      title: "أزرق جريء",
      category: "عام",
      thumbnailUrl: "/templates/bold.jpg",
      isPro: true,
      colors: { primary: "#1e3a8a", secondary: "#dbeafe" },
      fonts: { heading: "Cairo", body: "Cairo" },
    },
    {
      id: "minimal",
      title: "بسيط",
      category: "عام",
      thumbnailUrl: "/templates/minimal.jpg",
      isPro: false,
      colors: { primary: "#374151", secondary: "#f3f4f6" },
      fonts: { heading: "Cairo", body: "Cairo" },
    },
  ],
  أعمال: [
    {
      id: "corporate",
      title: "شركات",
      category: "أعمال",
      thumbnailUrl: "/templates/corp.jpg",
      isPro: false,
      colors: { primary: "#0d585f", secondary: "#e4f1e1" },
      fonts: { heading: "Cairo", body: "Cairo" },
    },
    {
      id: "startup",
      title: "ناشئة",
      category: "أعمال",
      thumbnailUrl: "/templates/startup.jpg",
      isPro: true,
      colors: { primary: "#7c3aed", secondary: "#ede9fe" },
      fonts: { heading: "Cairo", body: "Cairo" },
    },
  ],
  تسويق: [
    {
      id: "marketing",
      title: "تسويقي",
      category: "تسويق",
      thumbnailUrl: "/templates/marketing.jpg",
      isPro: true,
      colors: { primary: "#be185d", secondary: "#fce7f3" },
      fonts: { heading: "Cairo", body: "Cairo" },
    },
    {
      id: "social",
      title: "اجتماعي",
      category: "تسويق",
      thumbnailUrl: "/templates/social.jpg",
      isPro: false,
      colors: { primary: "#0ea5e9", secondary: "#e0f2fe" },
      fonts: { heading: "Cairo", body: "Cairo" },
    },
  ],
  أكاديمي: [
    {
      id: "academic",
      title: "أكاديمي",
      category: "أكاديمي",
      thumbnailUrl: "/templates/academic.jpg",
      isPro: false,
      colors: { primary: "#0d585f", secondary: "#e4f1e1" },
      fonts: { heading: "Cairo", body: "Cairo" },
    },
    {
      id: "research",
      title: "بحثي",
      category: "أكاديمي",
      thumbnailUrl: "/templates/research.jpg",
      isPro: false,
      colors: { primary: "#1d4ed8", secondary: "#dbeafe" },
      fonts: { heading: "Cairo", body: "Cairo" },
    },
  ],
  صحة: [
    {
      id: "health",
      title: "طبي",
      category: "صحة",
      thumbnailUrl: "/templates/health.jpg",
      isPro: true,
      colors: { primary: "#059669", secondary: "#d1fae5" },
      fonts: { heading: "Cairo", body: "Cairo" },
    },
  ],
  حكومي: [
    {
      id: "gov",
      title: "حكومي",
      category: "حكومي",
      thumbnailUrl: "/templates/gov.jpg",
      isPro: false,
      colors: { primary: "#1e3a5f", secondary: "#dde8f5" },
      fonts: { heading: "Cairo", body: "Cairo" },
    },
  ],
};

export const CATEGORIES = [
  { id: "health", name: "قطاع الصحة", icon: "🏥" },
  { id: "gov", name: "الجهات الحكومية", icon: "🏛️" },
  { id: "edu", name: "التعليم", icon: "🎓" },
  { id: "startup", name: "الشركات الناشئة", icon: "💼" },
  { id: "realestate", name: "البناء والعقارات", icon: "🏗️" },
  { id: "finance", name: "المال والأعمال", icon: "💰" },
];
