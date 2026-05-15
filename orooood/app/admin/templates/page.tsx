"use client";

import { useState } from "react";
import { Upload, X, Palette, Type, Save, ArrowRight } from "lucide-react";
import { CATEGORIES } from "@/lib/templates-data";
import Link from "next/link";

export default function AdminTemplatesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [isPro, setIsPro] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("#0d585f");
  const [secondaryColor, setSecondaryColor] = useState("#e4f1e1");
  const [font, setFont] = useState("Cairo");
  const [isSaving, setIsSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !category) return;
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 1500));
    setSavedCount((c) => c + 1);
    setTitle("");
    setCategory("");
    setFile(null);
    setThumbnail(null);
    setIsSaving(false);
    alert(`تم حفظ القالب "${title}" بنجاح!`);
  };

  return (
    <div className="min-h-screen bg-[#f8faf9]" dir="rtl">
      <div className="bg-white border-b border-[#0d585f]/10 px-8 py-4 flex items-center gap-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-[#0d585f]/60 hover:text-[#0d585f] transition-colors text-sm"
        >
          <ArrowRight size={16} />
          لوحة التحكم
        </Link>
        <span className="text-[#0d585f]/30">/</span>
        <span className="text-[#0d585f] font-medium">رفع القوالب</span>
        {savedCount > 0 && (
          <span className="mr-auto px-3 py-1 rounded-full bg-[#e4f1e1] text-[#0d585f] text-xs font-bold">
            تم رفع {savedCount} قالب
          </span>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-[#0d585f] mb-2">
          رفع قالب جديد
        </h1>
        <p className="text-[#0d585f]/60 mb-8">
          أضف قوالب PPTX جاهزة مع إعدادات الألوان والمجال
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* PPTX File */}
          <div className="card-orooood p-6">
            <label className="block text-sm font-bold text-[#0d585f] mb-3">
              ملف القالب (PPTX)
            </label>
            <div className="border-2 border-dashed border-[#0d585f]/20 rounded-xl p-8 text-center hover:bg-[#f8faf9] transition-colors cursor-pointer relative">
              <input
                type="file"
                accept=".pptx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {file ? (
                <div className="flex items-center justify-center gap-2 text-[#0d585f]">
                  <span className="font-medium">{file.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="p-1 hover:bg-red-100 rounded"
                  >
                    <X size={16} className="text-red-500" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload size={32} className="mx-auto text-[#0d585f]/40 mb-2" />
                  <p className="text-sm text-[#0d585f]/60">
                    اسحب ملف PPTX هنا أو انقر للاختيار
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Thumbnail */}
          <div className="card-orooood p-6">
            <label className="block text-sm font-bold text-[#0d585f] mb-3">
              صورة المعاينة (اختياري)
            </label>
            <div className="border-2 border-dashed border-[#0d585f]/20 rounded-xl p-6 text-center hover:bg-[#f8faf9] transition-colors cursor-pointer relative">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setThumbnail(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {thumbnail ? (
                <div className="flex items-center justify-center gap-2 text-[#0d585f]">
                  <span className="font-medium">{thumbnail.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setThumbnail(null);
                    }}
                    className="p-1 hover:bg-red-100 rounded"
                  >
                    <X size={16} className="text-red-500" />
                  </button>
                </div>
              ) : (
                <p className="text-sm text-[#0d585f]/60">
                  JPG, PNG (مقاس 16:9 موصى به)
                </p>
              )}
            </div>
          </div>

          {/* Basic Info */}
          <div className="card-orooood p-6 space-y-4">
            <div>
              <label className="block text-sm font-bold text-[#0d585f] mb-2">
                عنوان القالب *
              </label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-orooood"
                placeholder="مثال: قالب الشركات الناشئة"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-[#0d585f] mb-2">
                  المجال *
                </label>
                <select
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input-orooood"
                >
                  <option value="">اختر المجال</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3 pt-8">
                <input
                  type="checkbox"
                  id="isPro"
                  checked={isPro}
                  onChange={(e) => setIsPro(e.target.checked)}
                  className="w-5 h-5 rounded border-[#0d585f]/20 accent-[#0d585f]"
                />
                <label
                  htmlFor="isPro"
                  className="text-sm font-medium text-[#0d585f]"
                >
                  قالب Pro (مدفوع)
                </label>
              </div>
            </div>
          </div>

          {/* Theme */}
          <div className="card-orooood p-6 space-y-4">
            <h3 className="font-bold text-[#0d585f] flex items-center gap-2">
              <Palette size={18} />
              إعدادات المظهر
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#0d585f]/70 mb-2">
                  اللون الرئيسي
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-12 h-12 rounded-lg border border-[#0d585f]/20 cursor-pointer"
                  />
                  <span className="text-sm font-mono text-[#0d585f]">
                    {primaryColor}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm text-[#0d585f]/70 mb-2">
                  اللون الثانوي
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-12 h-12 rounded-lg border border-[#0d585f]/20 cursor-pointer"
                  />
                  <span className="text-sm font-mono text-[#0d585f]">
                    {secondaryColor}
                  </span>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div
              className="rounded-xl p-6 text-center"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}20, ${secondaryColor})`,
              }}
            >
              <span
                className="text-2xl font-bold"
                style={{ color: primaryColor }}
              >
                {title || "معاينة القالب"}
              </span>
            </div>

            <div>
              <label className="block text-sm text-[#0d585f]/70 mb-2 flex items-center gap-2">
                <Type size={16} />
                الخط
              </label>
              <select
                value={font}
                onChange={(e) => setFont(e.target.value)}
                className="input-orooood"
              >
                <option value="Cairo">Cairo</option>
                <option value="Tajawal">Tajawal</option>
                <option value="Noto Sans Arabic">Noto Sans Arabic</option>
                <option value="Amiri">Amiri</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving || !title || !category}
            className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save size={20} />
                حفظ القالب
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
