"use client";

import { Image as ImageIcon } from "lucide-react";
import { Slide, PresentationData } from "@/types";

interface Props {
  slide: Slide;
  theme: PresentationData["theme"];
  isEditMode: boolean;
  onUpdate: (updated: Slide) => void;
}

export default function SlideCanvas({ slide, theme, isEditMode, onUpdate }: Props) {
  if (isEditMode) {
    return (
      <div className="h-full p-8 flex flex-col gap-4">
        <input
          value={slide.title}
          onChange={(e) => onUpdate({ ...slide, title: e.target.value })}
          className="w-full text-3xl font-bold bg-transparent border-b-2 border-[#0d585f]/20 focus:border-[#0d585f] outline-none text-[#0d585f] pb-2"
          placeholder="عنوان الشريحة"
        />
        {slide.subtitle !== undefined && (
          <input
            value={slide.subtitle || ""}
            onChange={(e) => onUpdate({ ...slide, subtitle: e.target.value })}
            className="w-full text-xl bg-transparent border-b border-[#0d585f]/10 focus:border-[#0d585f] outline-none text-[#0d585f]/70 pb-2"
            placeholder="العنوان الفرعي"
          />
        )}
        <textarea
          value={slide.content?.join("\n") || ""}
          onChange={(e) =>
            onUpdate({ ...slide, content: e.target.value.split("\n") })
          }
          className="flex-1 resize-none bg-[#f8faf9] rounded-xl p-4 text-[#0d585f] outline-none focus:ring-2 focus:ring-[#e4f1e1]"
          placeholder="محتوى الشريحة (كل سطر = نقطة منفصلة)"
        />
      </div>
    );
  }

  return (
    <div
      className="h-full p-12 flex flex-col"
      style={{ color: theme.primary }}
    >
      {slide.type === "title" && (
        <div className="h-full flex flex-col items-center justify-center text-center">
          <div
            className="w-16 h-1 rounded-full mb-8"
            style={{ backgroundColor: theme.primary }}
          />
          <h1 className="text-5xl font-bold mb-6 leading-tight">{slide.title}</h1>
          {slide.subtitle && (
            <p className="text-2xl opacity-75">{slide.subtitle}</p>
          )}
          <div
            className="w-16 h-1 rounded-full mt-8"
            style={{ backgroundColor: theme.secondary, border: `1px solid ${theme.primary}30` }}
          />
        </div>
      )}

      {slide.type === "two-column" && (
        <div className="h-full flex flex-col">
          <h2 className="text-3xl font-bold mb-8 leading-tight">{slide.title}</h2>
          <div className="flex-1 grid grid-cols-2 gap-10 items-center">
            <div
              className="rounded-2xl h-full flex items-center justify-center"
              style={{ backgroundColor: `${theme.secondary}` }}
            >
              <div className="text-center">
                <ImageIcon size={48} className="mx-auto mb-2 opacity-30" style={{ color: theme.primary }} />
                <p className="text-sm opacity-50">صورة توضيحية</p>
              </div>
            </div>
            <ul className="space-y-4">
              {slide.content?.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-lg">
                  <span
                    className="w-2 h-2 rounded-full mt-2.5 shrink-0"
                    style={{ backgroundColor: theme.primary }}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {(slide.type === "content" || slide.type === "bullets") && (
        <div className="h-full flex flex-col justify-center">
          <h2 className="text-4xl font-bold mb-10 leading-tight">{slide.title}</h2>
          <div
            className={`grid gap-6 ${
              (slide.content?.length || 0) <= 3 ? "grid-cols-3" : "grid-cols-2"
            }`}
          >
            {slide.content?.map((item, i) => (
              <div
                key={i}
                className="p-6 rounded-xl text-center"
                style={{
                  backgroundColor: theme.secondary,
                  border: `1px solid ${theme.primary}15`,
                }}
              >
                <span
                  className="block text-3xl font-bold mb-2 opacity-30"
                  style={{ color: theme.primary }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-base font-semibold" style={{ color: theme.primary }}>
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {slide.type === "image" && (
        <div className="h-full flex flex-col items-center justify-center">
          <h2 className="text-4xl font-bold mb-8">{slide.title}</h2>
          <div
            className="w-full flex-1 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: theme.secondary }}
          >
            <ImageIcon size={64} className="opacity-30" style={{ color: theme.primary }} />
          </div>
        </div>
      )}
    </div>
  );
}
