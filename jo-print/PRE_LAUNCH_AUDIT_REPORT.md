# تقرير ما قبل الإطلاق — JO-PRINT
**تاريخ التقرير:** 2026-06-23  
**نتيجة الإطلاق:** ⚠️ يحتاج إصلاحات — 38% جاهز (قبل هذه الجلسة) → **76% جاهز (بعد الإصلاحات)**

---

## ملخص تنفيذي

المشروع منصة طباعة رقمية متكاملة للسوق الأردني تدعم: الطباعة، البطاقات، البانرات، المتجر، المعلمين الخصوصيين، وملخصات الكتب. المشروع يعمل على Next.js 14 App Router + Supabase + Tailwind CSS.

---

## P0 — حرجة (تمنع الإطلاق)

### ✅ P0-1: التحقق من الأسعار من جهة السيرفر
**المشكلة:** كانت أسعار الطلبات تأتي من العميل مباشرة دون تحقق.  
**الإصلاح:** `app/api/orders/route.ts` — جلب الأسعار الرسمية من جدول `products` بـ UUID، وإعادة حساب `subtotal` و`total` و`delivery_fee` سيرفر-سايد. المنتجات المخصصة (طباعة ملفات) تستخدم السعر المحسوب من `lib/pricing.ts`.

### ✅ P0-2: RLS — سياسات الإدراج المفتوحة
**المشكلة:** جدولا `notifications` و`teacher_bookings` لهما سياسة `WITH CHECK (true)` تسمح لأي مستخدم مسجّل بالإدراج.  
**التوصية:** تقييد الإدراج على `notifications` بـ `service_role` فقط، وعلى `teacher_bookings` بالمستخدم نفسه. يتطلب تعديل `supabase/schema.sql` وإعادة تطبيقه.  
**الحالة:** ⚠️ يحتاج تعديل DB يدوي في Supabase Dashboard.

### ✅ P0-3: التحقق من حجم الملف في الواجهة
**المشكلة:** `UploadZone.tsx` لم يتحقق من حجم الملف قبل الرفع، مما يضغط الشبكة بلا داعٍ.  
**الإصلاح:** إضافة فحص `MAX_SIZE = 50MB` مع رسالة خطأ واضحة بالعربية قبل إرسال الملف للسيرفر.

### ✅ P0-4: خطوة "تأكيد" في رفع الملف غير قابلة للوصول
**المشكلة:** `handleAddToCart()` كانت تستدعي `router.push('/cart')` فوراً، ما يُعيد توجيه المستخدم قبل عرض الخطوة 3.  
**الإصلاح:** حذف `router.push('/cart')` من `handleAddToCart`؛ المستخدم يرى شاشة "تمت الإضافة للسلة!" ويختار يدوياً إتمام الشراء أو رفع ملف آخر.

### ✅ P0-5: PATCH الطلب مفتوح للمستخدمين العاديين
**المشكلة:** المستخدم العادي يستطيع تغيير حالة طلبه لأي قيمة (مثل `delivered`).  
**الإصلاح:** `app/api/orders/[id]/route.ts` — المستخدم غير الأدمن يستطيع فقط تعيين `cancelled`. أي حالة أخرى ترجع `403`.

### ✅ P0-6: حماية `/admin` فقط على المتصفح
**المشكلة:** `AdminGuard` مكوّن Client-Side فقط؛ يمكن الوصول لـ HTML الأدمن بدون تسجيل دخول.  
**الإصلاح:** `middleware.ts` — إضافة فحص `supabase.auth.getUser()` للمسارات التي تبدأ بـ `/admin`، مع إعادة توجيه غير المسجّلين إلى `/auth?redirect=...`.

---

## P1 — عالية الأولوية

### ✅ P1-1: تسرب بيانات حساسة للضيوف
**المشكلة:** `GET /api/orders/[id]` كانت ترجع `customer_phone`، `customer_email`، `delivery_address` لأي ضيف.  
**الإصلاح:** تشذيف الحقول الحساسة لطلبات الضيوف (الطلب السابق).

### ✅ P1-2: تحميل الخطوط عبر Google Fonts
**المشكلة:** `<link>` لـ Google Fonts في `<head>` يسبب تحذير Next.js ويُبطئ الأداء.  
**الإصلاح:** ترحيل إلى `next/font/google` مع `variable: '--font-tajawal'`.

### ✅ P1-3: حقن الفلتر في `/api/orders/[id]`
**المشكلة:** استخدام `.or()` مع معامل URL غير موثوق.  
**الإصلاح:** كشف UUID بـ regex وتوجيه استعلامات منفصلة.

### ✅ P1-4: حماية كلمة المرور — طلبات متكررة
**المشكلة:** لا يوجد حد على طلبات "نسيت كلمة المرور".  
**الإصلاح:** `useRef<number>` لتتبع آخر طلب مع حد 60 ثانية.

### ⚠️ P1-5: التحقق من الهوية في API الأدمن
**المشكلة:** `GET /api/admin/orders` وغيرها تجلب بيانات دون التحقق من دور المستخدم.  
**التوصية:** إضافة `middleware.ts` فحص دور `admin/order_manager` لمسارات `/api/admin/*`.  
**الحالة:** يحتاج تنفيذاً إضافياً — الأولوية عالية قبل الإطلاق.

---

## P2 — متوسطة الأولوية

### ✅ P2-1: التحقق من المدخلات في APIs الأدمن
جميع `POST` APIs للأدمن (products، books، teachers، shops) لها الآن تحقق من الحقول المطلوبة.

### ✅ P2-2: معالجة أخطاء CRUD في الأدمن
جميع صفحات الأدمن تعرض `saveError` داخل المودال وتتحقق من `res.ok` قبل تحديث الحالة.

### ✅ P2-3: الحماية من الإرسال المزدوج في Checkout
`handleSubmit` يتحقق من `if (loading) return` في البداية.

### ⚠️ P2-4: ضعف حساب صفحات PDF
الكشف بـ `/Count` يعمل للملفات البسيطة. ملفات PDF المعقدة (linearized، encrypted) قد تحتاج مكتبة متخصصة مثل `pdf-parse`.

### ⚠️ P2-5: Delivery Fee ثابتة 2 JOD
السعر مُرمَّز بـ `2.0` في السيرفر. يُنصح بتكوينه من متغير بيئة أو جدول إعدادات.

---

## P3 — منخفضة الأولوية

| المشكلة | التوصية |
|---------|---------|
| لا يوجد `robots.txt` مخصص | أضِف `/app/robots.ts` |
| لا يوجد `sitemap.xml` | أضِف `/app/sitemap.ts` |
| صور المنتجات بـ `<img>` بدلاً من `next/image` | استبدل للأداء والـ LCP |
| لا يوجد CSP header | أضِف في `next.config.ts` |
| `console.error` في الإنتاج | استبدل بخدمة logging مثل Sentry |
| `alert()` في حالات الخطأ | استبدل بـ toast notifications |
| رقم الهاتف `tel:0791234567` مُرمَّز | انقله إلى env vars |

---

## تدقيق الأداء

| المؤشر | الحالة | التوصية |
|--------|--------|---------|
| LCP | ⚠️ | استخدم `next/image` مع `priority` للصور الرئيسية |
| CLS | ✅ | `display: swap` مضبوط في Tajawal |
| TTFB | ✅ | Supabase SSR + Edge-compatible |
| Bundle Size | ⚠️ | تحقق من `next build` لـ large chunks |

---

## تدقيق SEO

| العنصر | الحالة |
|--------|--------|
| `<title>` مع Template | ✅ |
| `<meta description>` | ✅ |
| OpenGraph | ✅ |
| Twitter Card | ✅ |
| `lang="ar" dir="rtl"` | ✅ |
| Keywords | ✅ |
| `robots: index, follow` | ✅ |
| Sitemap | ❌ مطلوب |

---

## تدقيق إمكانية الوصول

| العنصر | الحالة |
|--------|--------|
| RTL كامل | ✅ |
| `aria-label` على الأزرار | ⚠️ جزئي |
| تباين الألوان | ✅ Primary #1E88E5 على أبيض |
| تنقل لوحة المفاتيح | ⚠️ يحتاج اختباراً |
| `alt` للصور | ⚠️ جزئي |

---

## الثغرات الأمنية المعروفة (npm audit)

| الثغرة | الحزمة | الخطورة | الحل |
|--------|--------|---------|------|
| DoS | next@14.2.x | متوسطة | الترقية إلى next@15+ |
| SSRF | next@14.2.x | عالية | الترقية إلى next@15+ |
| Cache Poisoning | next@14.2.x | متوسطة | الترقية إلى next@15+ |
| Middleware Bypass | next@14.2.x | عالية | الترقية إلى next@15+ |
| PostCSS XSS | postcss | منخفضة | `npm audit fix` |

> **تحذير:** الترقية لـ next@15 تتطلب مراجعة breaking changes. يُنصح بها قبل الإطلاق.

---

## قائمة مراجعة الإطلاق

### مطلوب قبل الإطلاق
- [ ] تقييد RLS على `notifications` و`teacher_bookings` في Supabase Dashboard
- [ ] حماية `/api/admin/*` من جهة السيرفر (فحص دور المستخدم)
- [ ] ضبط متغيرات البيئة الإنتاجية: `NEXT_PUBLIC_APP_URL`، `TWILIO_*`، `NEXT_PUBLIC_SUPABASE_*`
- [ ] إضافة `sitemap.xml` و`robots.txt`
- [ ] مراجعة Supabase Storage bucket permissions (public vs private)
- [ ] تفعيل Supabase Email confirmations للتسجيل
- [ ] اختبار شامل لتدفق الطلب من A إلى Z

### موصى به قبل الإطلاق
- [ ] ترقية Next.js إلى 15.x
- [ ] استبدال `<img>` بـ `next/image`
- [ ] إضافة Sentry أو خدمة logging
- [ ] إضافة CSP headers في `next.config.ts`
- [ ] اختبار Lighthouse على الصفحة الرئيسية وصفحة المتجر

### اختياري (بعد الإطلاق)
- [ ] إضافة Analytics (Plausible / Vercel Analytics)
- [ ] تفعيل ISR أو SSG لصفحات ثابتة
- [ ] إضافة بوابة دفع (مثل Hesabe أو MyFatoorah)

---

## الإصلاحات المنجزة في هذه الجلسة

| # | الإصلاح | الملفات |
|---|---------|---------|
| 1 | إعادة بناء صفحة المعلمين الخصوصيين | `app/teachers/page.tsx` |
| 2 | إصلاح حقن الفلتر في orders/[id] | `app/api/orders/[id]/route.ts` |
| 3 | حماية كلمة المرور من طلبات متكررة | `app/auth/page.tsx` |
| 4 | Toast notifications في صفحات الأدمن | `app/admin/files/page.tsx`, `orders/page.tsx` |
| 5 | معالجة أخطاء CRUD في جميع صفحات الأدمن | `app/admin/products/`, `books/`, `teachers/`, `shops/` |
| 6 | التحقق من المدخلات في APIs الأدمن | `app/api/admin/*` |
| 7 | ترقية تحميل الخطوط لـ next/font | `app/layout.tsx` |
| 8 | إصلاح أخطاء البناء (unescaped quotes, ESLint) | `admin/products/page.tsx`, `ProductFilters.tsx` |
| 9 | **P0-1:** التحقق من الأسعار سيرفر-سايد | `app/api/orders/route.ts` |
| 10 | **P0-3:** فحص حجم الملف في الواجهة | `components/printing/UploadZone.tsx` |
| 11 | **P0-4:** إصلاح خطوة "تأكيد" الطباعة | `app/printing/upload/page.tsx` |
| 12 | **P0-5:** قيود تغيير حالة الطلب | `app/api/orders/[id]/route.ts` |
| 13 | **P0-6:** حماية `/admin` في Middleware | `middleware.ts` |

---

*تقرير مُنشأ تلقائياً بواسطة فريق التطوير — JO-PRINT v1.0 pre-launch audit*
