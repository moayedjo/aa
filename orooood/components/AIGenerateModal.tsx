"use client";

import { useState } from "react";
import { X, Sparkles, FileUp, Wand2, ChevronDown } from "lucide-react";
import { TEMPLATES_BY_CATEGORY } from "@/lib/templates-data";

interface GenerateData {
  topic: string;
  slidesCount: number;
  category: string;
  templateId: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (data: GenerateData) => void;
}

export default function AIGenerateModal({ isOpen, onClose, onGenerate }: Props) {
  const [topic, setTopic] = useState("");
  const [slidesCount, setSlidesCount] = useState(5);
  const [selectedCategory, setSelectedCategory] = useState("عام");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const templates = TEMPLATES_BY_CATEGORY[selectedCategory] || [];

  const handleGenerate = async () => {
    if (!topic || !selectedTemplate) return;
    setIsGenerating(true);
    await new Promise((r) => setTimeout(r, 2000));
    onGenerate({ topic, slidesCount, category: selectedCategory, templateId: selectedTemplate });
    setIsGenerating(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-[#0d585f]/10">
        <div className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-[#0d585f]/10 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-[#0d585f] flex items-center gap-2">
              <Wand2 size={24} />
              توليد عرض تقديمي بالذكاء الاصطناعي
            </h2>
            <p className="text-[#0d585f]/60 mt-1">
              اختر القالب والمجال، ودع AI يبني العرض لك
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#e4f1e1] rounded-lg transition-colors"
          >
            <X size={24} className="text-[#0d585f]" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Topic Input */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-[#0d585f]">
              موضوع العرض التقديمي
            </label>
            <div className="relative">
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="اكتب فكرتك لبناء عرض تقديمي مميز... مثال: تحليل تطبيق سند الرقمي وفق مبادئ ريتشارد ماير"
                className="input-orooood min-h-[120px] resize-none text-lg pb-14"
              />
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <button
                  onClick={() => setIsUploadOpen(!isUploadOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f8faf9] border border-[#0d585f]/10 text-sm text-[#0d585f] hover:bg-[#e4f1e1] transition-colors"
                >
                  <FileUp size={14} />
                  إضافة ملفات
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f8faf9] border border-[#0d585f]/10 text-sm text-[#0d585f]">
                  <Sparkles size={14} />
                  وكيل الذكاء الاصطناعي
                  <ChevronDown size={14} />
                </button>
              </div>
            </div>

            {isUploadOpen && (
              <div className="p-4 rounded-xl bg-[#f8faf9] border border-dashed border-[#0d585f]/20 text-center">
                <p className="text-sm text-[#0d585f]/70 mb-3">
                  يدعم PDF وDOC وXLSX وPPT والصور والفيديو. حتى 50 ملفاً (100MB لكل ملف).
                </p>
                <div className="border-2 border-dashed border-[#0d585f]/20 rounded-lg p-8 hover:bg-[#e4f1e1]/50 transition-colors cursor-pointer">
                  <FileUp size={32} className="mx-auto text-[#0d585f]/40 mb-2" />
                  <p className="text-sm text-[#0d585f]/60">
                    اسحب الملفات هنا أو انقر للاختيار
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-sm font-bold text-[#0d585f]">المجال</label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedTemplate(null);
                }}
                className="input-orooood"
              >
                {Object.keys(TEMPLATES_BY_CATEGORY).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-sm font-bold text-[#0d585f]">
                عدد الشرائح
              </label>
              <input
                type="number"
                min={3}
                max={30}
                value={slidesCount}
                onChange={(e) => setSlidesCount(Number(e.target.value))}
                className="input-orooood"
              />
            </div>
          </div>

          {/* Templates Grid */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-[#0d585f]">
              اختر قالب التصميم
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                    selectedTemplate === template.id
                      ? "border-[#0d585f] ring-2 ring-[#e4f1e1]"
                      : "border-transparent hover:border-[#0d585f]/20"
                  }`}
                >
                  <div
                    className="aspect-[4/3] flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${template.colors.primary}20, ${template.colors.secondary})`,
                    }}
                  >
                    <span
                      className="text-2xl font-bold"
                      style={{ color: template.colors.primary }}
                    >
                      {template.title}
                    </span>
                  </div>
                  <div className="p-3 bg-white text-right">
                    <p className="text-sm font-medium text-[#0d585f]">
                      {template.title}
                    </p>
                    {template.isPro && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-[#0d585f] text-white rounded-full">
                        Pro
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!topic || !selectedTemplate || isGenerating}
            className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                جاري التوليد...
              </>
            ) : (
              <>
                <Wand2 size={20} />
                توليد العرض التقديمي
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
