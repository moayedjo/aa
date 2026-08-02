/**
 * Industry vertical configuration.
 *
 * Since Phase 03 the runtime source of truth is the database
 * (industry_verticals / services, seeded in migration 0003). This file
 * remains as the seed reference and for the approved font lists; keys here
 * must stay in sync with the seed data.
 */

export interface IndustryService {
  key: string;
  labelEn: string;
  labelAr: string;
}

export interface IndustryVerticalConfig {
  key: string;
  labelEn: string;
  labelAr: string;
  /** Only verticals with available=true are selectable in the MVP. */
  available: boolean;
  services: IndustryService[];
}

export const INDUSTRY_VERTICALS: IndustryVerticalConfig[] = [
  {
    key: "dental",
    labelEn: "Dental clinic",
    labelAr: "عيادة أسنان",
    available: true,
    services: [
      { key: "teeth-whitening", labelEn: "Teeth whitening", labelAr: "تبييض الأسنان" },
      { key: "orthodontics", labelEn: "Orthodontics & braces", labelAr: "تقويم الأسنان" },
      { key: "dental-implants", labelEn: "Dental implants", labelAr: "زراعة الأسنان" },
      { key: "veneers", labelEn: "Veneers & Hollywood smile", labelAr: "الفينير وابتسامة هوليود" },
      { key: "cleaning-checkup", labelEn: "Cleaning & check-ups", labelAr: "تنظيف وفحص دوري" },
      { key: "root-canal", labelEn: "Root canal treatment", labelAr: "علاج العصب" },
      { key: "pediatric-dentistry", labelEn: "Pediatric dentistry", labelAr: "طب أسنان الأطفال" },
      { key: "gum-treatment", labelEn: "Gum treatment", labelAr: "علاج اللثة" },
      { key: "dentures", labelEn: "Dentures & prosthetics", labelAr: "التركيبات والأطقم" },
      { key: "cosmetic-dentistry", labelEn: "Cosmetic dentistry", labelAr: "تجميل الأسنان" },
    ],
  },
];

export const DEFAULT_INDUSTRY_KEY = "dental";

export function getIndustry(key: string): IndustryVerticalConfig | undefined {
  return INDUSTRY_VERTICALS.find((v) => v.key === key);
}

export function isValidServiceKey(industryKey: string, serviceKey: string): boolean {
  return !!getIndustry(industryKey)?.services.some((s) => s.key === serviceKey);
}

/** Approved fonts (names only in Phase 02; loading/export validation are later phases). */
export const APPROVED_ARABIC_FONTS = [
  "Cairo",
  "Tajawal",
  "Almarai",
  "IBM Plex Sans Arabic",
  "Noto Kufi Arabic",
] as const;

export const APPROVED_ENGLISH_FONTS = [
  "Inter",
  "Poppins",
  "Montserrat",
  "Nunito",
  "Roboto",
] as const;
