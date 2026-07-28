"use client";

/* eslint-disable @next/next/no-img-element -- signed URLs are short-lived; next/image adds no value here */

import type { WizardBrandState } from "@/components/onboarding/wizard";

const SAMPLE = {
  en: {
    headline: "A brighter smile starts here",
    body: "Book your check-up today and let our team take care of the rest.",
    cta: "Book now",
  },
  ar: {
    headline: "ابتسامة أجمل تبدأ من هنا",
    body: "احجز فحصك الدوري اليوم ودع فريقنا يعتني بالباقي.",
    cta: "احجز الآن",
  },
} as const;

/**
 * Approximate social-post preview driven by the in-progress Brand Kit.
 * Renders RTL for Arabic. Fonts render with system fallbacks until font
 * loading arrives in later phases.
 */
export function LivePreview({ brand }: { brand: WizardBrandState }) {
  const lang = brand.defaultLanguage;
  const sample = SAMPLE[lang];
  const isRtl = lang === "ar";
  const fontFamily = isRtl
    ? `'${brand.arabicFont || "Tajawal"}', 'Noto Sans Arabic', sans-serif`
    : `'${brand.englishFont || "Inter"}', sans-serif`;

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      lang={lang}
      className="flex aspect-[4/5] w-full max-w-[320px] flex-col justify-between overflow-hidden rounded-xl border p-5 shadow-sm"
      style={{
        backgroundColor: brand.backgroundColor,
        color: brand.textColor,
        fontFamily,
      }}
    >
      <div className="flex items-center gap-2">
        {brand.logoSignedUrl ? (
          <img
            src={brand.logoSignedUrl}
            alt="Logo"
            className="h-10 w-10 rounded object-contain"
          />
        ) : (
          <div
            aria-hidden
            className="flex h-10 w-10 items-center justify-center rounded text-sm font-bold text-white"
            style={{ backgroundColor: brand.primaryColor }}
          >
            {(brand.businessName || "D").charAt(0)}
          </div>
        )}
        <span className="text-sm font-semibold">
          {brand.businessName || "Your clinic"}
        </span>
      </div>

      <div className="space-y-2">
        <h3
          className="text-2xl font-bold leading-snug"
          style={{ color: brand.primaryColor }}
        >
          {sample.headline}
        </h3>
        <p className="text-sm opacity-90">{sample.body}</p>
        <span
          className="inline-block rounded-full px-4 py-1.5 text-sm font-semibold text-white"
          style={{ backgroundColor: brand.accentColor }}
        >
          {sample.cta}
        </span>
      </div>

      <div
        className="flex items-center justify-between border-t pt-2 text-xs opacity-80"
        style={{ borderColor: brand.secondaryColor }}
      >
        <span>{brand.phone || "+000 000 0000"}</span>
        <span>{brand.website ? brand.website.replace(/^https?:\/\//, "") : "clinic.com"}</span>
      </div>
    </div>
  );
}
