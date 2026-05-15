"use client";

import { useState } from "react";
import { Download, FileText, Presentation } from "lucide-react";
import { PresentationData } from "@/types";

interface Props {
  presentation: PresentationData;
}

export default function ExportButtons({ presentation }: Props) {
  const [exporting, setExporting] = useState<"pdf" | "pptx" | null>(null);

  const exportPDF = async () => {
    setExporting("pdf");
    try {
      const res = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slides: presentation.slides, theme: presentation.theme }),
      });
      const data = await res.json();
      alert(data.message || "تم التصدير بنجاح");
    } finally {
      setExporting(null);
    }
  };

  const exportPPTX = async () => {
    setExporting("pptx");
    try {
      const res = await fetch("/api/export/pptx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slides: presentation.slides, theme: presentation.theme }),
      });
      const data = await res.json();
      alert(data.message || "تم التصدير بنجاح");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={exportPDF}
        disabled={exporting !== null}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#e4f1e1] text-[#0d585f] text-sm font-medium hover:bg-[#d4e4d1] transition-colors disabled:opacity-50"
      >
        {exporting === "pdf" ? (
          <div className="w-4 h-4 border-2 border-[#0d585f]/30 border-t-[#0d585f] rounded-full animate-spin" />
        ) : (
          <FileText size={16} />
        )}
        PDF
      </button>
      <button
        onClick={exportPPTX}
        disabled={exporting !== null}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0d585f] text-white text-sm font-medium hover:bg-[#0d585f]/90 transition-colors disabled:opacity-50"
      >
        {exporting === "pptx" ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <Download size={16} />
        )}
        PPTX
      </button>
    </div>
  );
}
