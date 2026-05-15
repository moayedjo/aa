"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import TemplateCard from "@/components/TemplateCard";
import { TEMPLATES_BY_CATEGORY, CATEGORIES } from "@/lib/templates-data";
import { Search } from "lucide-react";

const ALL_TEMPLATES = Object.values(TEMPLATES_BY_CATEGORY).flat();

export default function TemplatesPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = ALL_TEMPLATES.filter((t) => {
    const matchSearch =
      !search ||
      t.title.includes(search) ||
      t.category.includes(search);
    const matchCat = !activeCategory || t.category === activeCategory;
    return matchSearch && matchCat;
  });

  const categories = ["الكل", ...Object.keys(TEMPLATES_BY_CATEGORY)];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-[#0d585f] mb-3">
            مكتبة القوالب
          </h1>
          <p className="text-[#0d585f]/60 text-lg">
            أكثر من ١٠٠ قالب عربي احترافي لكل مجال
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-xl mx-auto mb-8">
          <Search
            size={20}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#0d585f]/40"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن قالب..."
            className="input-orooood pr-12"
          />
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {categories.map((cat) => {
            const isActive =
              cat === "الكل" ? activeCategory === null : activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() =>
                  setActiveCategory(cat === "الكل" ? null : cat)
                }
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[#0d585f] text-white"
                    : "bg-[#f8faf9] text-[#0d585f] border border-[#0d585f]/10 hover:bg-[#e4f1e1]"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Templates Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-[#0d585f]/40 text-lg">
              لا توجد قوالب مطابقة للبحث
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
