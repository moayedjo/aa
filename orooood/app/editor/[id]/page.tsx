"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Send,
  Plus,
  Globe,
  Monitor,
  Download,
  Code,
  MessageSquare,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Type,
  Image as ImageIcon,
  Layout,
  Wand2,
} from "lucide-react";
import { PresentationData, Slide } from "@/types";
import SlideCanvas from "@/components/SlideCanvas";
import PresentationView from "@/components/PresentationView";
import ExportButtons from "@/components/ExportButtons";

const MOCK_PRESENTATION: PresentationData = {
  id: "1",
  title: "تحليل تطبيق سند الرقمي",
  templateId: "corporate",
  theme: { primary: "#0d585f", secondary: "#e4f1e1", font: "Cairo" },
  speakerNotes: {
    "slide-1":
      "رحّب بالحضور وقدّم نفسك. ركّز على أهمية تصميم تجربة المستخدم.",
    "slide-2":
      "تناول مبادئ ماير الثلاث: التقليل، التنظيم، والتوافق بين الصوت والصورة.",
    "slide-3": "قدّم الأمثلة التطبيقية من التطبيق مع لقطات الشاشة.",
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
        "مبدأ التقليل: تقليل الحمل المعرفي على المتعلم",
        "مبدأ التنظيم: تنظيم المعلومات بشكل مكاني واضح",
        "مبدأ التوافق: توافق الكلام المسموع مع المرئي",
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

interface ChatMessage {
  id: number;
  type: "user" | "ai" | "status";
  text: string;
}

export default function EditorPage() {
  const { id } = useParams();
  const [presentation, setPresentation] =
    useState<PresentationData>(MOCK_PRESENTATION);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      type: "status",
      text: "تم إنشاء العرض بنجاح. يمكنك البدء بتعديل الشرائح أو طلب تعديلات من AI.",
    },
  ]);

  const slide = presentation.slides[currentSlide];

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = {
      id: Date.now(),
      type: "user",
      text: chatInput,
    };
    setMessages((prev) => [...prev, userMsg]);
    setChatInput("");

    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: Date.now() + 1,
        type: "ai",
        text: "تم تعديل الشريحة بنجاح وفق طلبك. هل تريد أي تغييرات إضافية؟",
      };
      setMessages((prev) => [...prev, aiMsg]);
    }, 1200);
  };

  const handleSlideUpdate = (updated: Slide) => {
    const newSlides = [...presentation.slides];
    newSlides[currentSlide] = updated;
    setPresentation({ ...presentation, slides: newSlides });
  };

  const addNewSlide = () => {
    const newSlide: Slide = {
      id: `slide-${Date.now()}`,
      type: "content",
      title: "شريحة جديدة",
      content: ["نقطة أولى", "نقطة ثانية"],
      layout: "default",
    };
    const newSlides = [...presentation.slides, newSlide];
    setPresentation({ ...presentation, slides: newSlides });
    setCurrentSlide(newSlides.length - 1);
  };

  if (isPresentationMode) {
    return (
      <PresentationView
        presentation={presentation}
        initialSlide={currentSlide}
        onClose={() => setIsPresentationMode(false)}
      />
    );
  }

  return (
    <div className="h-screen bg-white flex overflow-hidden" dir="rtl">
      {/* Floating Left Toolbar */}
      <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2 bg-white rounded-2xl shadow-xl border border-[#0d585f]/10 p-2">
        <button
          onClick={addNewSlide}
          className="p-2.5 rounded-xl hover:bg-[#e4f1e1] text-[#0d585f] transition-colors"
          title="إضافة شريحة"
        >
          <Plus size={20} />
        </button>
        <button
          className="p-2.5 rounded-xl hover:bg-[#e4f1e1] text-[#0d585f] transition-colors"
          title="طبقات"
        >
          <Layout size={20} />
        </button>
        <button
          className="p-2.5 rounded-xl hover:bg-[#e4f1e1] text-[#0d585f] transition-colors"
          title="نص"
        >
          <Type size={20} />
        </button>
        <button
          className="p-2.5 rounded-xl hover:bg-[#e4f1e1] text-[#0d585f] transition-colors"
          title="صورة"
        >
          <ImageIcon size={20} />
        </button>
      </div>

      {/* Left Pane: AI Chat (35%) */}
      <div className="w-[380px] shrink-0 bg-[#f8faf9] border-l border-[#0d585f]/10 flex flex-col">
        {/* Chat Header */}
        <div className="px-5 py-4 bg-white border-b border-[#0d585f]/10 flex items-center gap-2">
          <Wand2 size={18} className="text-[#0d585f]" />
          <span className="font-bold text-[#0d585f]">مساعد AI</span>
          <div className="mr-auto w-2 h-2 rounded-full bg-green-500" />
        </div>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => {
            if (msg.type === "status") {
              return (
                <div
                  key={msg.id}
                  className="flex items-start gap-2 text-sm text-[#0d585f]/70 bg-[#e4f1e1]/50 rounded-xl p-3"
                >
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                  {msg.text}
                </div>
              );
            }
            return (
              <div
                key={msg.id}
                className={`flex ${msg.type === "user" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    msg.type === "user"
                      ? "bg-[#0d585f] text-white"
                      : "bg-white border border-[#0d585f]/10 text-[#0d585f]"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })}
        </div>

        {/* Presentation Card */}
        <div className="px-4 pb-2">
          <div className="bg-white rounded-xl p-4 border border-[#0d585f]/10 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#e4f1e1] flex items-center justify-center shrink-0">
                <Monitor size={20} className="text-[#0d585f]" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-[#0d585f] truncate">
                  {presentation.title}
                </h4>
                <p className="text-sm text-[#0d585f]/60">
                  {presentation.slides.length} شريحة
                </p>
                <div className="flex gap-2 mt-2">
                  <ExportButtons presentation={presentation} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Input */}
        <div className="p-4 bg-white border-t border-[#0d585f]/10">
          <div className="relative">
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="اكتب طلبك للمساعد... مثال: غيّر عنوان الشريحة الأولى"
              className="input-orooood min-h-[80px] resize-none pb-10"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <button className="p-1.5 rounded-lg hover:bg-[#e4f1e1] text-[#0d585f]">
                <Globe size={16} />
              </button>
              <button
                onClick={handleSendMessage}
                className="p-2 rounded-lg bg-[#0d585f] text-white hover:bg-[#0d585f]/90 transition-colors"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Pane: Canvas */}
      <div className="flex-1 flex flex-col bg-[#f0f0f0] min-w-0">
        {/* Top Toolbar */}
        <div className="h-14 bg-white border-b border-[#0d585f]/10 flex items-center justify-between px-6 shrink-0">
          <span className="text-sm font-medium text-[#0d585f]/70 truncate max-w-xs">
            {presentation.title}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPresentationMode(true)}
              className="p-2 rounded-lg hover:bg-[#e4f1e1] text-[#0d585f] transition-colors"
              title="وضع العرض"
            >
              <Monitor size={18} />
            </button>
            <button
              className="p-2 rounded-lg hover:bg-[#e4f1e1] text-[#0d585f] transition-colors"
              title="كود"
            >
              <Code size={18} />
            </button>
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isEditMode
                  ? "bg-[#0d585f] text-white"
                  : "bg-[#e4f1e1] text-[#0d585f]"
              }`}
            >
              {isEditMode ? "معاينة" : "تحرير"}
            </button>
          </div>
        </div>

        {/* Slide Thumbnails */}
        <div className="h-20 bg-white border-b border-[#0d585f]/10 flex items-center gap-3 px-6 overflow-x-auto shrink-0">
          {presentation.slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setCurrentSlide(i)}
              className={`shrink-0 h-12 w-20 rounded-lg overflow-hidden border-2 transition-all ${
                i === currentSlide
                  ? "border-[#0d585f] ring-2 ring-[#e4f1e1]"
                  : "border-transparent hover:border-[#0d585f]/30"
              }`}
              style={{
                background: `linear-gradient(135deg, ${presentation.theme.primary}15, ${presentation.theme.secondary})`,
              }}
            >
              <span className="text-xs font-bold" style={{ color: presentation.theme.primary }}>
                {i + 1}
              </span>
            </button>
          ))}
          <button
            onClick={addNewSlide}
            className="shrink-0 h-12 w-20 rounded-lg border-2 border-dashed border-[#0d585f]/20 flex items-center justify-center hover:border-[#0d585f]/40 hover:bg-[#f8faf9] transition-all"
          >
            <Plus size={16} className="text-[#0d585f]/40" />
          </button>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-auto p-8 flex items-center justify-center">
          <div className="relative w-full" style={{ maxWidth: "900px" }}>
            {/* Floating Controls */}
            <div className="absolute -top-9 right-0 flex items-center gap-2">
              <button className="px-3 py-1.5 rounded-lg bg-white border border-[#0d585f]/10 text-xs text-[#0d585f] hover:bg-[#e4f1e1] shadow-sm flex items-center gap-1 transition-colors">
                <MessageSquare size={12} />
                إضافة للمحادثة
              </button>
              <button className="px-3 py-1.5 rounded-lg bg-white border border-[#0d585f]/10 text-xs text-[#0d585f] hover:bg-[#e4f1e1] shadow-sm flex items-center gap-1 transition-colors">
                <RefreshCw size={12} />
                إعادة توليد
              </button>
            </div>

            {/* Slide */}
            <div
              className="bg-white rounded-2xl shadow-2xl overflow-hidden"
              style={{ aspectRatio: "16/9" }}
            >
              <SlideCanvas
                slide={slide}
                theme={presentation.theme}
                isEditMode={isEditMode}
                onUpdate={handleSlideUpdate}
              />
            </div>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="h-12 bg-white border-t border-[#0d585f]/10 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
              disabled={currentSlide === 0}
              className="p-1 rounded hover:bg-[#e4f1e1] disabled:opacity-30 text-[#0d585f] transition-colors"
            >
              <ChevronRight size={20} />
            </button>
            <span className="text-sm text-[#0d585f]/70">
              {currentSlide + 1} / {presentation.slides.length}
            </span>
            <button
              onClick={() =>
                setCurrentSlide(
                  Math.min(presentation.slides.length - 1, currentSlide + 1)
                )
              }
              disabled={currentSlide === presentation.slides.length - 1}
              className="p-1 rounded hover:bg-[#e4f1e1] disabled:opacity-30 text-[#0d585f] transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
          </div>
          <div className="flex items-center gap-4 text-sm text-[#0d585f]/60">
            <span>الإصدار 1</span>
            <button className="hover:text-[#0d585f] transition-colors">
              المصادر
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
