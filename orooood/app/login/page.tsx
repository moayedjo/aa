"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setIsLoading(false);
    window.location.href = "/dashboard";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#e4f1e1]/50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <span className="text-3xl font-bold text-[#0d585f]">عروض</span>
          <span className="px-2 py-0.5 text-xs font-bold bg-[#e4f1e1] text-[#0d585f] rounded-full border border-[#0d585f]/20">
            AI
          </span>
        </Link>

        <div className="card-orooood p-8">
          <h1 className="text-2xl font-bold text-[#0d585f] text-center mb-2">
            {isRegister ? "إنشاء حساب جديد" : "تسجيل الدخول"}
          </h1>
          <p className="text-[#0d585f]/60 text-center mb-8 text-sm">
            {isRegister
              ? "انضم إلى آلاف المستخدمين العرب"
              : "مرحباً بعودتك إلى منصة عروض"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-[#0d585f] mb-2">
                  الاسم الكامل
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="أدخل اسمك"
                  className="input-orooood"
                  required={isRegister}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#0d585f] mb-2">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="input-orooood"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0d585f] mb-2">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-orooood pl-12"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0d585f]/40 hover:text-[#0d585f]"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {!isRegister && (
              <div className="text-left">
                <button
                  type="button"
                  className="text-sm text-[#0d585f]/60 hover:text-[#0d585f] transition-colors"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles size={18} />
                  {isRegister ? "إنشاء الحساب" : "دخول"}
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-sm text-[#0d585f]/70 hover:text-[#0d585f] transition-colors"
            >
              {isRegister ? (
                <>لديك حساب بالفعل؟ <span className="font-bold">سجّل الدخول</span></>
              ) : (
                <>ليس لديك حساب؟ <span className="font-bold">أنشئ حساباً</span></>
              )}
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-[#0d585f]/10">
            <p className="text-xs text-center text-[#0d585f]/40">
              بالمتابعة، أنت توافق على{" "}
              <span className="underline cursor-pointer">شروط الاستخدام</span>
              {" "}و{" "}
              <span className="underline cursor-pointer">سياسة الخصوصية</span>
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-[#0d585f]/50 mt-6">
          صنع بـ AI للعالم العربي 🇸🇦
        </p>
      </div>
    </div>
  );
}
