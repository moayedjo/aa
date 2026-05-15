"use client";

import { useEffect, useState } from "react";
import { ChevronRight, ChevronLeft, X } from "lucide-react";
import { PresentationData } from "@/types";
import SlideCanvas from "./SlideCanvas";

interface Props {
  presentation: PresentationData;
  initialSlide?: number;
  onClose: () => void;
}

export default function PresentationView({
  presentation,
  initialSlide = 0,
  onClose,
}: Props) {
  const [current, setCurrent] = useState(initialSlide);
  const [showNotes, setShowNotes] = useState(false);
  const slide = presentation.slides[current];

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        setCurrent((p) => Math.min(p + 1, presentation.slides.length - 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        setCurrent((p) => Math.max(p - 1, 0));
      } else if (e.key === "Escape") {
        onClose();
      } else if (e.key === "n") {
        setShowNotes((v) => !v);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [presentation.slides.length, onClose]);

  return (
    <div className="fixed inset-0 bg-black z-[200] flex flex-col">
      {/* Top bar */}
      <div className="h-10 bg-black/80 flex items-center justify-between px-6 shrink-0">
        <span className="text-white/60 text-sm">{presentation.title}</span>
        <div className="flex items-center gap-4">
          <span className="text-white/50 text-sm">
            {current + 1} / {presentation.slides.length}
          </span>
          <button
            onClick={() => setShowNotes((v) => !v)}
            className="text-white/50 hover:text-white text-xs transition-colors"
          >
            ملاحظات (N)
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X size={18} className="text-white/70" />
          </button>
        </div>
      </div>

      {/* Slide */}
      <div className="flex-1 flex items-center justify-center p-8 min-h-0">
        <div
          className="w-full bg-white rounded-lg shadow-2xl overflow-hidden"
          style={{ maxWidth: "min(90vw, 160vh * 16/9)", aspectRatio: "16/9" }}
        >
          <SlideCanvas
            slide={slide}
            theme={presentation.theme}
            isEditMode={false}
            onUpdate={() => {}}
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="h-16 flex items-center justify-center gap-6 shrink-0">
        <button
          onClick={() => setCurrent((p) => Math.max(p - 1, 0))}
          disabled={current === 0}
          className="p-3 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white transition-colors"
        >
          <ChevronRight size={24} />
        </button>
        <div className="flex gap-2">
          {presentation.slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === current ? "bg-white w-6" : "bg-white/30"
              }`}
            />
          ))}
        </div>
        <button
          onClick={() => setCurrent((p) => Math.min(p + 1, presentation.slides.length - 1))}
          disabled={current === presentation.slides.length - 1}
          className="p-3 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
      </div>

      {/* Speaker Notes */}
      {showNotes && (
        <div className="h-40 bg-[#1a1a2e] text-white/80 p-6 overflow-y-auto shrink-0 border-t border-white/10">
          <p className="text-xs text-white/40 mb-2">ملاحظات المقدم</p>
          <p className="text-base leading-relaxed">
            {presentation.speakerNotes[slide.id] || "لا توجد ملاحظات لهذه الشريحة."}
          </p>
        </div>
      )}
    </div>
  );
}
