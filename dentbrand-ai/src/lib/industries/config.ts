/**
 * Industry vertical configuration.
 *
 * INTERIM (Phase 02): typed config so onboarding can offer industry and
 * service selection. Phase 03 introduces the database-backed
 * industry_verticals / services tables and this file becomes seed data.
 * Service keys stored in workspace_industry_settings.selected_services
 * reference the `key` values below and stay stable across that migration.
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
