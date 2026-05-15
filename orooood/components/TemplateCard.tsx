"use client";

import Link from "next/link";
import { Crown } from "lucide-react";
import { Template } from "@/types";

interface Props {
  template: Template;
  onSelect?: (id: string) => void;
}

export default function TemplateCard({ template, onSelect }: Props) {
  const content = (
    <div className="card-orooood overflow-hidden group cursor-pointer">
      <div
        className="aspect-video flex items-center justify-center relative"
        style={{
          background: `linear-gradient(135deg, ${template.colors.primary}20, ${template.colors.secondary})`,
        }}
      >
        <span
          className="text-3xl font-bold"
          style={{ color: template.colors.primary }}
        >
          {template.title}
        </span>
        {template.isPro && (
          <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full bg-[#0d585f] text-white text-xs font-bold">
            <Crown size={12} />
            Pro
          </div>
        )}
        <div className="absolute inset-0 bg-[#0d585f]/0 group-hover:bg-[#0d585f]/5 transition-colors" />
      </div>
      <div className="p-4">
        <h3 className="font-bold text-[#0d585f]">{template.title}</h3>
        <p className="text-sm text-[#0d585f]/60 mt-1">{template.category}</p>
        <div className="flex items-center gap-2 mt-3">
          <div
            className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: template.colors.primary }}
          />
          <div
            className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: template.colors.secondary }}
          />
          <span className="text-xs text-[#0d585f]/50 mr-1">
            {template.fonts.heading}
          </span>
        </div>
      </div>
    </div>
  );

  if (onSelect) {
    return (
      <button onClick={() => onSelect(template.id)} className="text-right w-full">
        {content}
      </button>
    );
  }

  return (
    <Link href={`/editor/new?template=${template.id}`}>{content}</Link>
  );
}
