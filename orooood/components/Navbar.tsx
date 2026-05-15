"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Sparkles } from "lucide-react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "الرئيسية" },
    { href: "/templates", label: "القوالب" },
    { href: "/pricing", label: "الأسعار" },
    { href: "/dashboard", label: "لوحة التحكم" },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#0d585f]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-[#0d585f]">عروض</span>
            <span className="px-2 py-0.5 text-xs font-bold bg-[#e4f1e1] text-[#0d585f] rounded-full border border-[#0d585f]/20">
              AI
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-[#0d585f]/80 hover:text-[#0d585f] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-[#0d585f] hover:text-[#0d585f]/80"
            >
              تسجيل الدخول
            </Link>
            <Link
              href="/dashboard"
              className="btn-primary text-sm flex items-center gap-2"
            >
              <Sparkles size={16} />
              ابدأ مجاناً
            </Link>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-[#0d585f]"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden bg-white border-t border-[#0d585f]/10">
          <div className="px-4 pt-2 pb-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-3 py-2 rounded-lg text-[#0d585f] hover:bg-[#e4f1e1]"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-4 pt-4 border-t border-[#0d585f]/10">
              <Link
                href="/dashboard"
                className="btn-primary w-full text-center block"
              >
                ابدأ مجاناً
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
