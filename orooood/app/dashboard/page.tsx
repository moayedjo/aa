"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  FileText,
  Settings,
  Crown,
  Sparkles,
  ChevronLeft,
  BarChart3,
  User,
  Trash2,
} from "lucide-react";
import AIGenerateModal from "@/components/AIGenerateModal";
import Navbar from "@/components/Navbar";

interface Presentation {
  id: string;
  title: string;
  date: string;
  status: "completed" | "draft";
  slides: number;
}

export default function DashboardPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [presentations, setPresentations] = useState<Presentation[]>([
    {
      id: "1",
      title: "تحليل تطبيق سند الرقمي",
      date: "2026-05-10",
      status: "completed",
      slides: 12,
    },
    {
      id: "2",
      title: "مشروع R.O.D File",
      date: "2026-05-12",
      status: "draft",
      slides: 5,
    },
  ]);

  const user = {
    name: "مؤيد آل نعمة",
    role: "مصمم جرافيكي أول",
    location: "أبوظبي",
    plan: "Pro",
    usedThisMonth: 2,
    limit: 30,
  };

  const handleGenerate = (data: {
    topic: string;
    slidesCount: number;
    category: string;
    templateId: string;
  }) => {
    const newPresentation: Presentation = {
      id: Date.now().toString(),
      title: data.topic,
      date: new Date().toISOString().split("T")[0],
      status: "completed",
      slides: data.slidesCount,
    };
    setPresentations([newPresentation, ...presentations]);
  };

  const handleDelete = (id: string) => {
    setPresentations(presentations.filter((p) => p.id !== id));
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#0d585f]">
            مرحباً، {user.name.split(" ")[0]}
          </h1>
          <p className="text-[#0d585f]/60 mt-1">
            مشاريعك الحالية لعام 2026 — {presentations.length} عروض
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <div className="card-orooood p-6 text-center">
              <div className="w-20 h-20 rounded-full bg-[#e4f1e1] mx-auto mb-4 flex items-center justify-center border-2 border-[#0d585f]/20">
                <User size={32} className="text-[#0d585f]" />
              </div>
              <h3 className="font-bold text-[#0d585f]">{user.name}</h3>
              <p className="text-sm text-[#0d585f]/60">{user.role}</p>
              <p className="text-xs text-[#0d585f]/40 mt-1">{user.location}</p>
              <div className="mt-4 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#0d585f] text-white text-xs font-bold">
                <Crown size={12} />
                {user.plan}
              </div>
            </div>

            <div className="card-orooood p-4 space-y-1">
              <Link
                href="/dashboard"
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#e4f1e1] text-[#0d585f] font-medium"
              >
                <FileText size={18} />
                عروضي
              </Link>
              <Link
                href="/templates"
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#f8faf9] text-[#0d585f]/70 transition-colors"
              >
                <Sparkles size={18} />
                القوالب
              </Link>
              <Link
                href="/pricing"
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#f8faf9] text-[#0d585f]/70 transition-colors"
              >
                <BarChart3 size={18} />
                الأسعار
              </Link>
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#f8faf9] text-[#0d585f]/70 transition-colors">
                <Settings size={18} />
                الإعدادات
              </button>
            </div>

            {/* Usage */}
            <div className="card-orooood p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#0d585f]/70">الاستخدام الشهري</span>
                <span className="font-bold text-[#0d585f]">
                  {user.usedThisMonth}/{user.limit}
                </span>
              </div>
              <div className="h-2 bg-[#e4f1e1] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0d585f] rounded-full transition-all"
                  style={{
                    width: `${(user.usedThisMonth / user.limit) * 100}%`,
                  }}
                />
              </div>
              {user.usedThisMonth >= user.limit && (
                <p className="text-xs text-red-500 mt-2">
                  وصلت للحد الأقصى. قم بالترقية إلى Ultra.
                </p>
              )}
            </div>
          </div>

          {/* Main */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#0d585f]">
                عروضي التقديمية
              </h2>
              <button
                onClick={() => setIsModalOpen(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus size={18} />
                إنشاء عرض جديد
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {presentations.map((pres) => (
                <div key={pres.id} className="card-orooood p-5 group relative">
                  <button
                    onClick={() => handleDelete(pres.id)}
                    className="absolute top-4 left-4 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all"
                  >
                    <Trash2 size={14} className="text-red-400" />
                  </button>

                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-[#e4f1e1] flex items-center justify-center">
                      <FileText size={24} className="text-[#0d585f]" />
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        pres.status === "completed"
                          ? "bg-[#e4f1e1] text-[#0d585f]"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {pres.status === "completed" ? "مكتمل" : "مسودة"}
                    </span>
                  </div>

                  <h3 className="font-bold text-[#0d585f] mb-1">
                    {pres.title}
                  </h3>
                  <div className="flex items-center justify-between text-sm text-[#0d585f]/60">
                    <span>{pres.slides} شريحة</span>
                    <span>{pres.date}</span>
                  </div>

                  <Link
                    href={`/editor/${pres.id}`}
                    className="mt-4 flex items-center gap-1 text-sm font-medium text-[#0d585f] group-hover:gap-2 transition-all"
                  >
                    تحرير
                    <ChevronLeft size={16} />
                  </Link>
                </div>
              ))}

              <button
                onClick={() => setIsModalOpen(true)}
                className="border-2 border-dashed border-[#0d585f]/20 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 hover:border-[#0d585f]/40 hover:bg-[#f8faf9] transition-all min-h-[200px]"
              >
                <div className="w-12 h-12 rounded-full bg-[#e4f1e1] flex items-center justify-center">
                  <Plus size={24} className="text-[#0d585f]" />
                </div>
                <span className="font-medium text-[#0d585f]/70">
                  عرض تقديمي جديد
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <AIGenerateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGenerate={handleGenerate}
      />
    </div>
  );
}
