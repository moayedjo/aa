# JO-PRINT — تقرير التدقيق التقني الشامل
**تاريخ التقرير:** 2026-06-24  
**المدقق:** Senior Technical Auditor / CTO Reviewer  
**الفرع:** `claude/hopeful-hypatia-hfjq8e`  
**المنهجية:** Read-only audit — لم يتم تعديل أي ملف

---

## 1. الملخص التنفيذي

JO-PRINT منصة طباعة إلكترونية مبنية على Next.js 14 مع Supabase، تستهدف السوق الأردني. الكود نظيف نسبياً من حيث التنظيم والقراءة، وتوجد جهود واضحة في الحماية (RLS، rate limiting، تحقق من الهوية)، إلا أن المنصة **غير جاهزة للإطلاق الفعلي** لأسباب جوهرية:

**أبرز المخاطر:**
1. **لا يوجد دفع إلكتروني حقيقي** — 6 طرق دفع في الواجهة كلها وهمية، الطلبات تبقى `payment_status = pending` للأبد.
2. **كودات الخصم مضمّنة في كود JavaScript العميل** — مرئية لأي مستخدم.
3. **حماية Admin تعتمد على JavaScript** — `AdminGuard` component-only بدون server middleware.
4. **ثغرات RLS** في 3 سياسات insert تستخدم `with check (true)` بدون تحقق من الملكية.
5. **4 ثغرات أمنية High** في Next.js 14.2.35 المستخدمة (SSRF، Cache Poisoning، DoS).
6. **السعر لملفات الطباعة المخصصة** يُحتسب client-side فقط بدون تحقق server.
7. **رقم الهاتف في Header** هو placeholder `0791234567`.

**نقاط القوة:**
- Build ينجح بدون أخطاء، TypeScript strict mode نظيف.
- Rate limiting على جميع APIs الحساسة.
- التحقق من الهوية على كل API route.
- حساب السعر على Server للمنتجات الموجودة في DB.
- Signed URLs قصيرة المدة للملفات.
- سجل تاريخ حالة الطلبات.

**هل رحلة الطلب مكتملة فعلياً؟** جزئياً — رحلة الطلب تعمل من رفع الملف حتى تأكيد الطلب وإرسال WhatsApp، لكن **الدفع لا يتم فعلياً**.

---

## 2. توصية الإطلاق

### ⛔ NOT READY

**الأسباب الحاسمة:**
- لا يوجد تكامل دفع حقيقي مطلقاً (الطلبات تُسجَّل دون دفع مؤكد).
- كودات خصم مضمّنة في bundle العميل (يمكن لأي شخص استخراجها).
- حماية لوحة الإدارة client-side فقط (يمكن التحايل عليها).
- ثغرات أمنية High في Next.js الحالي.
- السعر للطباعة المخصصة (poster/rollup/gradalbum) يُرسَل من العميل دون تحقق.

**الشروط المطلوبة قبل الإطلاق:**
1. تكامل بوابة دفع واحدة على الأقل (حتى Cash on Delivery مع تأكيد يدوي).
2. نقل كودات الخصم إلى DB مع تحقق server-side.
3. إضافة server-side middleware لحماية `/admin`.
4. تصحيح RLS policies الثلاث.
5. تثبيت Next.js على إصدار آمن.
6. نقل أسعار المنتجات المخصصة إلى DB أو التحقق منها server-side.

---

## 3. Technology Stack

| التقنية | الإصدار | الاستخدام |
|--------|---------|-----------|
| Next.js | 14.2.35 | App Router, Route Handlers |
| React | 18.x | UI |
| TypeScript | 5.x | strict mode مفعّل |
| Supabase | @supabase/ssr 0.5.2 + @supabase/supabase-js 2.108.2 | Auth, DB, Storage |
| Tailwind CSS | 3.4.1 | Styling |
| Framer Motion | 12.38.0 | Animations |
| Lucide React | 1.16.0 | Icons |
| Twilio | عبر fetch (لا SDK) | WhatsApp notifications |
| Package Manager | npm (package-lock.json) | — |
| Deployment | لم يُحدَّد (لا Dockerfile/vercel.json) | غير معروف |

**لا يوجد:** Testing framework، Payment SDK، Validation library (مثل Zod)، Generated DB types، Error monitoring، Logging service.

**Rendering:** App Router — لكن عملياً كل الصفحات `'use client'` مع `useEffect` + `fetch`، لا يوجد استفادة فعلية من Server Components أو RSC streaming.

---

## 4. نتائج الفحوصات الآلية

| الفحص | الأمر | النتيجة | أبرز المخرجات | تأثير الإطلاق |
|-------|-------|---------|---------------|---------------|
| Install | `npm ci` | ✅ Passed | — | — |
| TypeScript | `npx tsc --noEmit` | ✅ Passed (0 errors) | — | — |
| ESLint | `npm run lint` | ⚠️ Warnings | 4 warnings: `<img>` بدل `<Image>` في 4 ملفات | لا يمنع الإطلاق |
| Build | `npm run build` | ✅ Passed | جميع الصفحات تُبنى | — |
| Tests | — | ⛔ Not Available | لا يوجد test suite | **يمنع الإطلاق** |
| npm audit | `npm audit` | ❌ Failed | 5 ثغرات: 4 High في Next.js + 1 Moderate في PostCSS | **يمنع الإطلاق** |
| Formatting | — | ⛔ Not Available | لا Prettier config | — |

**ثغرات npm audit:**
- `GHSA-h64f-5h5j-jqjh` — Next.js DoS في Image Optimization API (High)
- `GHSA-c4j6-fc7j-m34r` — Next.js SSRF via WebSocket upgrades (High)
- `GHSA-wfc6-r584-vfw7` — Next.js Cache Poisoning في RSC responses (High)
- `GHSA-36qx-fr4f-26g5` — Next.js Middleware bypass في i18n (High)
- `GHSA-qx2v-qp2m-jg93` — PostCSS XSS via CSS Stringify (Moderate)

---

## 5. فهرس الصفحات والمسارات

| المسار | الغرض | Auth | Rendering | ملاحظات |
|--------|--------|------|-----------|---------|
| `/` | الصفحة الرئيسية | لا | Server | جيد |
| `/auth` | تسجيل دخول/تسجيل | لا | Client | ⚠️ يعرض Supabase raw error |
| `/auth/update-password` | تغيير كلمة المرور | نعم (link) | Client | جيد |
| `/account` | لوحة المستخدم | نعم | Client | جيد |
| `/cart` | السلة | لا | Client | جيد |
| `/checkout` | الدفع | لا | Client | ⚠️ كودات خصم في client |
| `/orders/confirmation` | تأكيد الطلب | لا | Client | جيد |
| `/orders/track` | تتبع الطلب | لا | Client | ⚠️ guest access لطلبات الآخرين ممكن |
| `/printing` | مقدمة الطباعة | لا | Client | — |
| `/printing/upload` | رفع ملف للطباعة | لا | Client | ⚠️ أسعار custom client-side |
| `/printing/quote` | مساعد عروض الأسعار | لا | Client | جيد |
| `/store` | متجر المنتجات | لا | Client | — |
| `/store/[id]` | تفاصيل منتج | لا | Dynamic | — |
| `/store/custom/[type]` | منتج مخصص | لا | Dynamic | ⚠️ سعر client-only |
| `/books` | ملخصات أكاديمية | لا | Client | — |
| `/books/[id]` | تفاصيل ملخص | لا | Dynamic | — |
| `/teachers` | قائمة المعلمين | لا | Client | — |
| `/teachers/[id]` | ملف المعلم | لا | Dynamic | — |
| `/shops` | قائمة المطابع | لا | Client | — |
| `/shops/register` | تسجيل مطبعة | لا | Client | — |
| `/delivery` | معلومات التوصيل | لا | Client | صفحة ثابتة |
| `/faq` | الأسئلة الشائعة | لا | Client | صفحة ثابتة |
| `/privacy` | سياسة الخصوصية | لا | Client | محتوى فارغ تقريباً |
| `/terms` | الشروط والأحكام | لا | Client | محتوى فارغ تقريباً |
| `/admin` | لوحة الإدارة | Admin فقط | Client | ⚠️ حماية client-side |
| `/admin/orders` | إدارة الطلبات | Admin فقط | Client | — |
| `/admin/files` | مراجعة الملفات | Admin فقط | Client | ⚠️ signed URL 1 ساعة |
| `/admin/products` | إدارة المنتجات | Admin فقط | Client | — |
| `/admin/books` | إدارة الملخصات | Admin فقط | Client | — |
| `/admin/teachers` | إدارة المعلمين | Admin فقط | Client | — |
| `/admin/shops` | إدارة المطابع | Admin فقط | Client | — |
| `/admin/customers` | إدارة العملاء | Admin فقط | Client | — |
| `/not-found` | 404 | لا | — | موجود |
| `/error` | Error boundary | لا | Client | موجود |
| `/robots.txt` | SEO | — | — | موجود |
| `/sitemap.xml` | SEO | — | — | موجود |

---

## 6. ملخص الثغرات

| الخطورة | العدد |
|---------|-------|
| Critical | 4 |
| High | 8 |
| Medium | 7 |
| Low | 9 |
| **المجموع** | **28** |

---

## 7. الثغرات الحرجة (Critical)

---

### [C-01] كودات الخصم مضمّنة في JavaScript العميل

- **Severity:** Critical
- **Category:** Business Logic / Data Exposure
- **Affected file:** `app/checkout/page.tsx`
- **Function/Component:** `CheckoutPage` — `PROMO_CODES` constant
- **Line:** 22–26
- **Evidence:**
```javascript
const PROMO_CODES: Record<string, number> = {
  'GRAD15': 0.15,
  'JOPRINT10': 0.10,
  'WELCOME5': 0.05,
}
```
- **Impact:** أي شخص يفتح DevTools أو يفك ضغط bundle.js يرى جميع كودات الخصم والنسب المئوية.
- **سيناريو الاستغلال:** مستخدم يفتح Network tab → يبحث عن `PROMO_CODES` في JS bundle → يستخدم كل الكودات → خسارة مالية مباشرة.
- **Root cause:** كودات الخصم يجب أن تُحفظ في DB وتُتحقق منها server-side فقط.
- **الإصلاح المقترح:**
  1. أنشئ جدول `coupons` في DB: `code`, `discount_type`, `discount_value`, `max_uses`, `used_count`, `expires_at`, `active`.
  2. أنشئ `POST /api/coupons/validate` يتحقق من الكود server-side ويُرجع `{ valid, discountAmount }`.
  3. في `POST /api/orders` تحقق من الكود مرة أخرى على Server قبل تطبيق الخصم.
  4. احذف `PROMO_CODES` من `checkout/page.tsx`.
- **Launch blocker:** Yes

---

### [C-02] حماية لوحة الإدارة تعتمد على JavaScript فقط

- **Severity:** Critical
- **Category:** Broken Access Control
- **Affected file:** `app/admin/layout.tsx` + `components/admin/AdminGuard.tsx`
- **Function/Component:** `AdminGuard`
- **Evidence:** `AdminGuard` هو `'use client'` component يستخدم `useEffect` للتحقق من الدور ثم `router.push('/')`. لا يوجد server-side middleware يحمي `/admin`.
```typescript
// middleware.ts — لا يوجد فيه حماية لـ /admin على مستوى الـ middleware
// الحماية الوحيدة هي:
const { data: { user } } = await supabase.auth.getUser()
if (!user) { router.push('/auth'); return } // في AdminGuard useEffect
```
- **Impact:** المحتوى الإداري يُرسَل إلى المتصفح قبل تشغيل JavaScript — حالة Race condition. مع JavaScript معطّلاً، تظهر الصفحة.
- **سيناريو الاستغلال:** `curl -b "session_cookie=..." https://jo-print.com/admin/orders` يُعيد HTML الصفحة الإدارية. المهاجم الذي يملك cookie مسروقاً يرى البيانات.
- **ملاحظة:** Middleware الموجود يتحقق فقط من وجود user لـ `/admin`، لكن لا يتحقق من `role = 'admin'`. غير مصمم يتحقق من Role.
- **الإصلاح المقترح:**
```typescript
// middleware.ts — إضافة:
if (request.nextUrl.pathname.startsWith('/admin')) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/auth', request.url))
  
  // تحقق من الدور server-side
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!['admin','order_manager','production','support'].includes(profile?.role ?? '')) {
    return NextResponse.redirect(new URL('/', request.url))
  }
}
```
- **Launch blocker:** Yes

---

### [C-03] عدم وجود دفع إلكتروني حقيقي

- **Severity:** Critical
- **Category:** Missing Feature / Business Logic
- **Affected files:** `app/checkout/page.tsx`, `supabase/schema.sql`
- **Evidence:** 
  - 6 طرق دفع في UI (Visa، Zain Cash، Orange Money، eFawateercom، CliQ، نقداً).
  - لا يوجد أي SDK للدفع في `package.json`.
  - `payment_status` في `orders` يبدأ بـ `pending` ولا يتحول أبداً إلى `paid` تلقائياً.
  - الطلب يُنشأ وينتهي الأمر — لا payment callback، لا webhook.
- **Impact:** العميل يستطيع إنشاء طلب باختيار أي طريقة دفع دون أن يدفع فعلاً. لا آلية للتحقق من الدفع.
- **سيناريو الاستغلال:** مستخدم يختار "eFawateercom" → ينشئ طلباً → يستلم رقم الطلب → لا يدفع أبداً → الطلب يظهر في لوحة الإدارة كـ "received".
- **Root cause:** المرحلة الأولى ركّزت على رحلة الطلب دون إكمال Payment Integration.
- **الإصلاح المقترح للـ MVP:**
  - ابدأ بـ Cash on Delivery مع تأكيد يدوي واضح للعميل أن "الدفع عند الاستلام".
  - أو أضف تكاملاً حقيقياً مع بوابة واحدة (eFawateercom أو CliQ) قبل الإطلاق.
- **Launch blocker:** Yes

---

### [C-04] أسعار الطباعة المخصصة تأتي من العميل دون تحقق

- **Severity:** Critical
- **Category:** Price Manipulation
- **Affected files:** `app/printing/upload/page.tsx`, `app/api/orders/route.ts`
- **Evidence:**
```typescript
// app/api/orders/route.ts — التحقق يعمل فقط لـ UUID products:
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-...-[0-9a-f]{12}$/i
const dbProductIds = body.items
  .filter((id: string) => uuidRe.test(id)) // ← print files لها IDs مثل "print-file-..."

// items غير UUID تأخذ سعرها من العميل:
price: priceMap[item.productId] ?? item.price  // ← client price إذا لم يكن UUID
```
- **Impact:** مستخدم يرسل طلباً بـ `productId = "print-custom-poster"` وسعر `0.001 د.أ` — الخادم يقبله.
- **سيناريو الاستغلال:**
```bash
curl -X POST /api/orders -H "Content-Type: application/json" -d '{
  "items": [{"productId": "print-poster-a1", "name": "Poster A1", "quantity": 1, "price": 0.001}],
  ...
}'
```
- **الإصلاح المقترح:** أضف كل الأسعار إلى DB في جدول `products` أو `print_pricing`، أو أضف validation server-side للأنواع المعروفة:
```typescript
const KNOWN_PRODUCT_PRICES: Record<string, number> = {
  'poster-a1': 5, 'poster-a1-foam': 7, 'rollup': 10, 'gradalbum': 15,
}
```
- **Launch blocker:** Yes

---

## 8. الثغرات العالية (High)

---

### [H-01] 4 ثغرات في Next.js 14.2.35 (npm audit)

- **Severity:** High
- **Category:** Dependency Vulnerability
- **Evidence:** `npm audit` يُظهر 4 ثغرات High:
  - SSRF عبر WebSocket (`GHSA-c4j6-fc7j-m34r`)
  - Cache Poisoning في RSC (`GHSA-wfc6-r584-vfw7`)
  - DoS في Image Optimization (`GHSA-h64f-5h5j-jqjh`)
  - Middleware bypass (`GHSA-36qx-fr4f-26g5`)
- **الإصلاح:** رفع Next.js إلى إصدار آمن (حسب الـ advisories). ملاحظة: `npm audit fix --force` يرفع إلى v16 وهو breaking change — راجع CHANGELOG أولاً.
- **Launch blocker:** Yes

---

### [H-02] RLS سياسة `"Anyone insert order items"` بدون تحقق من الملكية

- **Severity:** High
- **Category:** Broken Access Control / RLS
- **Affected file:** `supabase/schema.sql`
- **Evidence:**
```sql
create policy "Anyone insert order items" on public.order_items
  for insert with check (true);
```
- **Impact:** أي مستخدم مجهول يمكنه إدخال `order_items` لأي `order_id`، بما فيها طلبات مستخدمين آخرين. يمكن تضخيم الطلبات.
- **الإصلاح:**
```sql
drop policy "Anyone insert order items" on public.order_items;
create policy "Service insert order items" on public.order_items
  for insert with check (
    exists (select 1 from public.orders where id = order_id and (user_id = auth.uid() or user_id is null))
  );
```
- **Launch blocker:** Yes

---

### [H-03] RLS سياسة `"Anyone upload files"` بدون تحقق من المالك

- **Severity:** High
- **Category:** Broken Access Control / RLS
- **Affected file:** `supabase/schema.sql`
- **Evidence:**
```sql
create policy "Anyone upload files" on public.print_files
  for insert with check (true);
```
- **Impact:** أي مستخدم يمكنه إدراج سجل في `print_files` مع `user_id` لأي مستخدم آخر — تزوير ملكية الملفات.
- **الإصلاح:**
```sql
drop policy "Anyone upload files" on public.print_files;
create policy "Own upload files" on public.print_files
  for insert with check (user_id = auth.uid() or (user_id is null and auth.uid() is null));
```
- **Launch blocker:** Yes

---

### [H-04] RLS سياسة `"Status history insert"` بدون تحقق

- **Severity:** High
- **Category:** Broken Access Control / RLS
- **Affected file:** `supabase/schema.sql`
- **Evidence:**
```sql
create policy "Status history insert" on public.order_status_history
  for insert with check (true);
```
- **Impact:** أي مستخدم يمكنه إدراج سجلات في `order_status_history` لأي طلب — تزوير سجل حالة الطلبات.
- **الإصلاح:**
```sql
drop policy "Status history insert" on public.order_status_history;
create policy "Service insert order_status_history" on public.order_status_history
  for insert with check (
    exists (select 1 from public.orders where id = order_id
            and (user_id = auth.uid() or
                 exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','order_manager'))))
  );
```
- **Launch blocker:** Yes

---

### [H-05] Delivery fee: Server يتجاهل حد الشحن المجاني

- **Severity:** High
- **Category:** Business Logic / Pricing
- **Affected files:** `app/checkout/page.tsx`, `app/api/orders/route.ts`, `lib/cart.ts`
- **Evidence:**
```typescript
// lib/cart.ts (client):
const delivery = subtotal >= 20 ? 0 : 2.0  // شحن مجاني إذا > 20 JD

// app/api/orders/route.ts (server):
const deliveryFee = body.deliveryMethod === 'delivery' ? 2.0 : 0  // دائماً 2 JD!
```
- **Impact:** عميل يطلب بأكثر من 20 JD → يرى "شحن مجاني" في الواجهة → يُحتسب عليه 2 JD في السجل الفعلي.
- **الإصلاح:** في `api/orders/route.ts` استخدم نفس المنطق:
```typescript
const deliveryFee = body.deliveryMethod === 'delivery' && computedSubtotal < 20 ? 2.0 : 0
```
- **Launch blocker:** Yes (خطأ مالي يؤثر على الثقة)

---

### [H-06] Admin Files: Signed URL صالح لمدة ساعة كاملة

- **Severity:** High
- **Category:** File Security
- **Affected file:** `app/admin/files/page.tsx` — line 122
- **Evidence:**
```typescript
.createSignedUrl(file.file_path, 3600)  // 3600 ثانية = 1 ساعة
```
- **Impact:** إذا سُرق رابط موقّع من admin، يظل صالحاً لساعة كاملة لأي شخص يملكه. ملفات العملاء الخاصة قابلة للوصول.
- **الإصلاح:** استخدم 300–900 ثانية (5–15 دقيقة) للروابط الإدارية.
- **Launch blocker:** No (لكن مهم)

---

### [H-07] Middleware لا يتحقق من Role عند دخول `/admin`

- **Severity:** High (مكمّل لـ C-02)
- **Category:** Broken Access Control
- **Affected file:** `middleware.ts`
- **Evidence:**
```typescript
// middleware.ts يتحقق من وجود user فقط:
const { data: { user } } = await supabase.auth.getUser()
if (!user) { return NextResponse.redirect(...) }
// لا يوجد تحقق من role هنا
```
- **Impact:** customer مسجّل يدخل `/admin` بدون تحويل من Middleware — يُحوَّل فقط client-side بعد تحميل الصفحة.
- **الإصلاح:** كما هو موضح في [C-02].
- **Launch blocker:** Yes

---

### [H-08] تسجيل الخطأ `error.message` خام في بعض API routes

- **Severity:** High
- **Category:** Information Disclosure
- **Affected files:** `app/api/auth/profile/route.ts`
- **Evidence:**
```typescript
// app/api/auth/profile/route.ts:
} catch (error) {
  console.error(error)
  return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
}
```
- **ملاحظة:** معظم APIs تُعيد رسائل generic (تم إصلاحها مسبقاً). لكن `/api/auth/page.tsx` تُظهر `error.message` من Supabase مباشرة للمستخدم:
```typescript
if (error) { setError(error.message); setLoading(false); return }  // سطر 46 handleRegister
```
- **Impact:** Supabase يُعيد أحياناً رسائل تكشف وجود email أو سياسة المرور.
- **Launch blocker:** No (متوسط)

---

## 9. الثغرات المتوسطة (Medium)

---

### [M-01] كودات خصم لا تُتحقق منها على Server

- **Severity:** Medium (مكمّل لـ C-01)
- **Category:** Business Logic
- **Evidence:** حتى بعد استخراج الكودات، الخادم لا يتحقق من `promoCode` أبداً (يُسجَّل في الطلب فقط).
- **الإصلاح:** راجع [C-01].
- **Launch blocker:** Yes (مرتبط بـ C-01)

---

### [M-02] Order Track page: عرض طلبات Guest لأي شخص يملك رقم الطلب

- **Severity:** Medium
- **Category:** Information Disclosure
- **Affected file:** `app/api/orders/[id]/route.ts`
- **Evidence:** طلب guest (user_id = null) يمكن لأي شخص يعرف `order_number` رؤيته (رقم الطلب مثل `JP-20260624-ABC1234` — ليس سرياً تماماً لكن ليس معقداً).
- **Impact:** كشف اسم العميل ومحتوى الطلب لطرف ثالث.
- **ملاحظة:** الكود يحذف phone/email/address للزوار — جيد جزئياً. لكن الاسم والإجمالي والمنتجات تظهر.
- **Launch blocker:** No

---

### [M-03] تغيير كلمة المرور لا يتطلب كلمة المرور الحالية

- **Severity:** Medium
- **Category:** Authentication
- **Affected file:** `app/account/page.tsx` — `SettingsTab`
- **Evidence:** النموذج يطلب كلمة المرور الجديدة والتأكيد فقط، بدون `currentPassword`.
- **Impact:** إذا سُرقت Session، المهاجم يغيّر كلمة المرور مباشرة.
- **الإصلاح:** أضف حقل `current password`، ثم استخدم `supabase.auth.signInWithPassword` للتحقق قبل `updateUser`.
- **Launch blocker:** No

---

### [M-04] rate_limit_events لا تُنظَّف تلقائياً

- **Severity:** Medium
- **Category:** Infrastructure / DoS
- **Affected file:** `supabase/schema.sql`
- **Evidence:** دالة `cleanup_rate_limit_events()` موجودة لكن لا يوجد Cron job يستدعيها. الجدول يكبر بلا حدود.
- **Impact:** بعد أشهر، استعلام rate limiting يبطئ بشكل ملحوظ → أداء API ينخفض.
- **الإصلاح:** فعّل pg_cron في Supabase وأضف `SELECT cleanup_rate_limit_events()` كل ساعة.
- **Launch blocker:** No (لكن ضروري قبل الشهر الأول)

---

### [M-05] admin/files يُعدّل print_files مباشرة عبر Supabase client بدون API

- **Severity:** Medium
- **Category:** Authorization
- **Affected file:** `app/admin/files/page.tsx`
- **Evidence:**
```typescript
const { error } = await supabase.from('print_files')
  .update({ status, ...(note !== undefined ? { notes: note } : {}) })
  .eq('id', fileId)
```
- **Impact:** الاعتماد على RLS فقط. إذا كان RLS خاطئاً، لا حماية API. أيضاً لا audit log لتغييرات الملفات.
- **الإصلاح:** أنشئ `PATCH /api/admin/files/[id]` مع تحقق server-side.
- **Launch blocker:** No

---

### [M-06] لا يوجد `Content-Security-Policy` header

- **Severity:** Medium
- **Category:** Security Headers
- **Affected file:** `next.config.mjs`
- **Evidence:** الـ headers الموجودة: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`. لا يوجد `Content-Security-Policy`.
- **Impact:** XSS injection ممكن دون CSP كطبقة دفاع إضافية.
- **الإصلاح:** أضف CSP header. مثال بسيط:
```javascript
{ key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://*.supabase.co;" }
```
- **Launch blocker:** No

---

### [M-07] Admin dashboard يجلب جميع الطلبات بدون pagination

- **Severity:** Medium
- **Category:** Performance / DoS
- **Affected file:** `app/admin/page.tsx`, `app/admin/orders/page.tsx`
- **Evidence:**
```typescript
const { data: orders } = await supabase
  .from('orders').select('...')
  .order('created_at', { ascending: false })
// لا .limit()، لا .range()
```
- **Impact:** مع 10,000+ طلب، الاستعلام يُعيد كل الصفوف → timeout أو crash.
- **الإصلاح:** أضف `.range(0, 49)` وpagination controls.
- **Launch blocker:** No (مشكلة مستقبلية)

---

## 10. الملاحظات المنخفضة (Low)

| # | المشكلة | الملف | الإصلاح |
|---|---------|-------|---------|
| L-01 | استخدام `<img>` بدل `<Image>` في 4 ملفات | books/page.tsx, books/[id]/page.tsx, teachers/[id]/page.tsx, store/custom/[type]/page.tsx | استبدل بـ `next/image` |
| L-02 | 28 صفحة كلها `'use client'` — لا RSC streaming | جميع الصفحات | أنشئ Server Components للصفحات الثابتة |
| L-03 | لا يوجد `generateMetadata` للصفحات الديناميكية | books/[id], teachers/[id], store/[id] | أضف `generateMetadata` لكل صفحة |
| L-04 | لا `loading.tsx` في أي مسار | — | أضف loading skeletons |
| L-05 | رقم الهاتف placeholder في Header | components/layout/Header.tsx | استبدل `0791234567` بالرقم الحقيقي |
| L-06 | صفحتا `/privacy` و `/terms` فارغتان من المحتوى | app/privacy/page.tsx, app/terms/page.tsx | أضف محتوى قانونياً حقيقياً |
| L-07 | `htmlFor` غائب من معظم Labels | جميع النماذج | اربط labels بـ inputs |
| L-08 | `admin/layout.tsx` لا يُطبّق `robots: noindex` | app/admin/layout.tsx | أضف `metadata: { robots: { index: false } }` |
| L-09 | لا يوجد Supabase generated types | — | شغّل `supabase gen types typescript` |

---

## 11. الميزات غير المكتملة والـ Placeholders

| الميزة | الحالة | الملفات |
|--------|--------|---------|
| **الدفع الإلكتروني** | ⛔ واجهة فقط — لا تكامل حقيقي | checkout/page.tsx |
| **كودات الخصم** | ⛔ client-side hardcoded | checkout/page.tsx |
| **My Library** (كتب رقمية) | ⚠️ لا توجد صفحة | account/page.tsx لا تعرض الكتب المشتراة |
| **تقييمات الكتب** | ⚠️ Schema موجود — لا UI للكتابة | books/[id]/page.tsx |
| **رقم الهاتف في Header** | ⛔ Placeholder `0791234567` | components/layout/Header.tsx |
| **Privacy Policy** | ⛔ صفحة فارغة | app/privacy/page.tsx |
| **Terms & Conditions** | ⛔ صفحة فارغة | app/terms/page.tsx |
| **المفضلة في الكتب** | ⚠️ State local فقط — لا تُحفظ | books/page.tsx |
| **Book purchase → download** | ⚠️ `book_purchases` لا تُنشأ تلقائياً عند الطلب | — |
| **cleanup_rate_limit_events** | ⚠️ دالة موجودة — لا Cron | schema.sql |
| **Map محلات الطباعة** | ⚠️ قائمة فقط — لا خريطة | shops/page.tsx |

---

## 12. مراجعة المصادقة والصلاحيات

**Authentication (مُتحقَّق منه — Verified):**

| الوظيفة | الحالة |
|---------|--------|
| Sign up | ✅ Supabase Auth |
| Sign in | ✅ |
| Sign out | ✅ |
| Email verification | ✅ Supabase built-in |
| Password reset | ✅ مع rate limiting جزئي (client-side) |
| Session refresh | ✅ `updateSession` middleware |
| Server-side auth | ✅ في جميع API routes |
| OAuth | ❌ غير موجود |
| 2FA | ❌ غير موجود |

**مشاكل Authorization:**

1. **AdminGuard client-side فقط** — راجع [C-02] + [H-07]
2. **Middleware لا يتحقق من Role** — راجع [H-07]
3. **تغيير Status بدون تحقق من Role في بعض حالات** — في `admin/orders/page.tsx`، تحديث حالة يذهب إلى `/api/orders/[id]` PATCH الذي يتحقق server-side بشكل صحيح.
4. **admin/page.tsx يقرأ من DB مباشرة بدون API** — يعتمد على RLS.

**الأدوار المتاحة في النظام:**
- `customer` — الافتراضي
- `admin` — صلاحيات كاملة
- `order_manager` — إدارة الطلبات
- `production` — مراجعة الملفات وإنتاج
- `support` — دعم العملاء

**غير موجود:** `delivery`, `finance`, `print_shop_owner` — الـ Briefing يذكرها لكن Schema لا تدعمها.

---

## 13. مراجعة Supabase والقاعدة والـ RLS

### جدول Tables و RLS

| الجدول | RLS | السياسات الحالية | مشاكل |
|--------|-----|-----------------|-------|
| profiles | ✅ | Users see own, Admins all | — |
| orders | ✅ | Users see own, Anyone insert (مع شروط), Admins all | Anyone insert: `total > 0` شرط جيد |
| order_items | ✅ | Users see own, **Anyone insert (true)**, Admins all | ⛔ [H-02] |
| print_files | ✅ | Users see own, **Anyone insert (true)**, Admins all | ⛔ [H-03] |
| order_status_history | ✅ | Users see own, **Anyone insert (true)**, Admins select | ⛔ [H-04] |
| products | ✅ | Public read active, Admins all | — |
| books | ✅ | Public read active, Admins all | — |
| teachers | ✅ | Public read available, Admins all | — |
| print_shops | ✅ | Public read active, Anyone insert pending, Admins all | — |
| notifications | ✅ | Admins all, Service insert (true) | — |
| rate_limit_events | ✅ | No public access (false) | — |
| teacher_bookings | ✅ | Admins all, Service insert (true) | — |
| book_purchases | ✅ | Users see own, Service insert (true) | — |
| book_reviews | ✅ | Public read, Verified buyers write | — |
| book_download_log | ✅ | Admins read, Service insert (true) | — |

**لا يوجد Supabase Generated Types** — كل الأنواع يدوية.

**Indexes:** موجودة على `user_id`, `order_id`, `status`, `created_at`. مناسبة لحجم MVP.

**DB Functions:**
- `handle_new_user()` — SECURITY DEFINER مع `set search_path = public` ✅
- `log_order_status_change()` — لا SECURITY DEFINER (يعمل كـ invoker) — قد يُسبب مشاكل مع RLS.
- `cleanup_rate_limit_events()` — SECURITY DEFINER لكن لا cron.

---

## 14. مراجعة الأسعار وسلامة الطلب

| السؤال | الإجابة |
|--------|---------|
| أين يُحتسب السعر؟ | Server للمنتجات DB (UUID). Client للمنتجات المخصصة (print files) |
| هل يمكن التلاعب؟ | **نعم** — راجع [C-04] للمنتجات المخصصة |
| Price Snapshot | ✅ `unit_price` يُحفظ في `order_items` |
| Transactions | ❌ لا يوجد Supabase transaction — إدراج orders ثم order_items منفصلَين |
| Idempotency | ❌ لا يوجد idempotency key — إعادة إرسال الطلب تُنشئ طلباً جديداً |
| تعديل حالة الطلب | مقيّد: customers يلغون فقط — Admins يغيّرون أي حالة ✅ |
| تعديل payment_status | ❌ لا توجد آلية لتحديثه (لا payment integration) |
| Coupon validation | ❌ Server لا يتحقق (راجع C-01) |
| Delivery fee | ⚠️ Server يتجاهل حد 20 JD (راجع H-05) |

---

## 15. مراجعة رفع الملفات والتخزين

| السؤال | الإجابة |
|--------|---------|
| الملفات Private؟ | يعتمد على إعداد bucket في Supabase — **لم يتأكد** (لا config ظاهر في الكود) |
| Ownership checks | ⚠️ في API route نعم، لكن RLS `with check (true)` يُخوّل أي إدراج DB |
| MIME validation | ✅ Allowlist موجود — لكن Extension يأتي من filename لا MIME type |
| Signed URLs | ✅ (API: 15 دقيقة، Admin: ⚠️ 1 ساعة) |
| الوصول لملفات الآخرين | ❌ المستخدم يمكنه إدراج record بـ `user_id` لآخر (H-03) |
| حجم الملف | ✅ 50MB |
| File types | ✅ PDF, DOC, DOCX, JPG, PNG, PPT, PPTX, XLS, XLSX |
| Malware scanning | ❌ غير موجود |
| Magic bytes validation | ❌ MIME يأتي من Content-Type header (قابل للتزوير) |
| Rate limiting | ✅ 10 رفع / دقيقة / IP |
| Guest uploads | ✅ مسموح (user_id = null) |

---

## 16. مراجعة الدفع

**الحالة: لا يوجد تكامل دفع حقيقي — كل خيارات الدفع وهمية.**

| الخيار | الحالة |
|--------|--------|
| Cash on Delivery | UI فقط — لا تأكيد |
| Visa/Mastercard | UI فقط — لا SDK |
| Zain Cash | UI فقط — لا SDK |
| Orange Money | UI فقط — لا SDK |
| eFawateercom | UI فقط — لا API |
| CliQ | UI فقط — لا API |

**خطورة:** العملاء يستطيعون إنشاء طلبات "مدفوعة" بأي طريقة دون دفع فعلي.

---

## 17. مراجعة لوحة الإدارة والأدوار

### مصفوفة الصلاحيات (الحالة الفعلية)

| الصلاحية | admin | order_manager | production | support | customer |
|----------|-------|---------------|------------|---------|----------|
| عرض جميع الطلبات | ✅ | ✅ | ✅ | ⚠️ | ❌ |
| تغيير حالة الطلب | ✅ | ✅ | ❌ | ❌ | إلغاء فقط |
| مراجعة الملفات | ✅ | ✅ | ✅ | ❌ | ❌ |
| إدارة المنتجات | ✅ | ❌ | ❌ | ❌ | ❌ |
| إدارة الكتب | ✅ | ❌ | ❌ | ❌ | ❌ |
| إدارة المعلمين | ✅ | ❌ | ❌ | ❌ | ❌ |
| إدارة المطابع | ✅ | ❌ | ❌ | ❌ | ❌ |
| إرسال إشعارات | ✅ | ✅ | ❌ | ❌ | ❌ |
| Audit Logs | ❌ (لا توجد صفحة) | — | — | — | — |
| تقارير مالية | ❌ (لا توجد) | — | — | — | — |

**ملاحظة مهمة:** الحماية في الـ UI تعتمد على `AdminGuard` client-side. الحماية في API routes صحيحة لمعظمها.

**Audit Logs:** سجل حالة الطلبات موجود في `order_status_history`، لكن لا يوجد audit log شامل للعمليات الإدارية.

---

## 18. مراجعة UX/UI

**نقاط القوة:**
- تصميم RTL عربي متسق.
- مجموعة ألوان متسقة (`primary: #1E88E5`).
- مؤشرات loading في معظم الصفحات.
- خطوات واضحة في upload wizard.
- تتبع الطلب بخط زمني مرئي.

**المشاكل:**
1. **رحلة الطلب**: 5 خطوات (رفع ملف → خيارات → مراجعة → Checkout → تأكيد) — معقدة نسبياً.
2. **السعر لا يظهر في Upload قبل إضافة الملف** — المستخدم لا يعرف التكلفة حتى الخطوة 2.
3. **Cart State**: Cart يُخزَّن في localStorage فقط — يُفقد عند تسجيل الخروج أو مسح المتصفح.
4. **Payment page**: تختار طريقة الدفع ثم الطلب يُرسَل — لا redirect لبوابة الدفع (لأنها وهمية).
5. **Mobile Navigation**: يجب التحقق من hamburger menu وسهولة التنقل.
6. **Order Confirmation**: يعرض `?id=UNDEFINED` إذا لم تُمرَّر القيمة.

---

## 19. مراجعة Accessibility

**المشاكل الرئيسية:**
1. **لا `htmlFor` على Labels** — معظم النماذج تستخدم `<label>` بدون ربطها بـ `<input>` عبر `htmlFor`.
2. **لا `aria-*` attributes** — لا `aria-label`، لا `aria-required`، لا `aria-invalid`.
3. **Modals**: نافذة الحجز في teachers لا تحبس Focus (focus trap).
4. **Color-only Status**: حالات الطلب تعتمد على اللون فقط — لا text/icon للوضوح.
5. **Toast notifications**: لا `role="alert"` أو `aria-live`.
6. **Keyboard Navigation**: الأزرار والروابط تبدو قابلة للوصول، لكن غير مُختبَر.

---

## 20. مراجعة الأداء

| المشكلة | التأثير | الإصلاح |
|---------|---------|---------|
| كل الصفحات `'use client'` + `useEffect fetch` | لا SSR — بطء LCP على الجهاز الضعيف | حوّل صفحات القائمة إلى Server Components |
| لا `next/image` في 4 مواضع | LCP أبطأ، bandwidth أعلى | استخدم `<Image>` من next/image |
| لا Pagination في Admin | بعد آلاف الطلبات: timeout | أضف `.range()` وpagination |
| framer-motion 12.x في bundle | +31 KB bundle | استخدم فقط حيث ضروري، أو استبدل بـ CSS transitions |
| لا image CDN | صور بلا optimization | Supabase Storage + next/image |
| `export const dynamic = 'force-dynamic'` في 5 صفحات | لا static generation | مقبول للصفحات الشخصية |

---

## 21. مراجعة SEO

| العنصر | الحالة |
|--------|--------|
| robots.txt | ✅ موجود (/admin, /account, /checkout, /api مُستثنَّة) |
| sitemap.xml | ✅ موجود (7 صفحات) |
| metadata في Root layout | ✅ كامل مع OG + Twitter |
| metadata في `/account` | ✅ noindex |
| metadata في `/checkout` | ✅ noindex |
| metadata في `/admin` | ⚠️ لا noindex |
| Dynamic pages metadata | ❌ لا `generateMetadata` في books/[id], teachers/[id], store/[id] |
| Structured data | ❌ لا Schema.org |
| Arabic lang attribute | ✅ `lang="ar" dir="rtl"` |

---

## 22. مخاطر الخصوصية والامتثال

**ملاحظة:** هذا تقييم تقني — استشر محامياً أردنياً للحكم القانوني النهائي.

| المجال | الحالة |
|--------|--------|
| سياسة الخصوصية | ⛔ صفحة فارغة |
| الشروط والأحكام | ⛔ صفحة فارغة |
| سياسة الاسترداد | ❌ لا توجد |
| ملفات الطباعة: مدة الاحتفاظ | ❌ لا سياسة واضحة |
| حذف الحساب | ✅ موجود مع حذف الملفات |
| موافقة Cookies | ❌ لا cookie banner |
| ضريبة 16% | ❌ غير محسوبة |
| JOD currency | ✅ `د.أ` مع 3 عشريات |
| رقم الهاتف الأردني | ✅ Regex `/^(?:\+?962|0)7[0-9]{8}$/` |
| بيانات العملاء مع المطابع | ⚠️ لا سياسة واضحة |

---

## 23. مراجعة Dependencies وسلسلة التوريد

- `npm audit`: 5 ثغرات (4 High في Next.js، 1 Moderate في PostCSS).
- لا package-lock integrity issues ظاهرة.
- framer-motion 12.x — إصدار حديث جداً (يناير 2025+) — قد يحتوي تغييرات غير ناضجة.
- lucide-react 1.16.0 — إصدار حديث جداً.
- لا `overrides` في package.json للتحكم في ثغرات transitive.

---

## 24. متغيرات البيئة

| المتغير | ضروري | Server/Client | موثَّق | ملاحظة أمنية |
|---------|-------|---------------|---------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Client | ✅ | آمن (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Client | ✅ | آمن مع RLS صحيح |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Server only | ✅ | ⚠️ خطير إذا كُشف |
| `NEXT_PUBLIC_APP_URL` | ✅ | Client | ✅ | — |
| `STORAGE_BUCKET` | ✅ | Server | ✅ | — |
| `NEXT_PUBLIC_STORAGE_BUCKET` | ✅ | Client | ✅ | — |
| `TWILIO_ACCOUNT_SID` | اختياري | Server | ✅ | — |
| `TWILIO_AUTH_TOKEN` | اختياري | Server | ✅ | ⚠️ خطير إذا كُشف |
| `TWILIO_WHATSAPP_FROM` | اختياري | Server | ✅ | — |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | اختياري | Client | ✅ | — |
| `NEXT_PUBLIC_CONTACT_PHONE` | اختياري | Client | ✅ | — |
| `NEXT_PUBLIC_CONTACT_EMAIL` | اختياري | Client | ✅ | ⚠️ email في .env.example مكشوف |
| `BOOKS_BUCKET` | اختياري | Server | ❌ | — |

**ملاحظة:** `.env.example` يحتوي `NEXT_PUBLIC_CONTACT_EMAIL=dxb3@yahoo.com` — إذا كان هذا email حقيقي، يجب إزالته.

---

## 25. الاختبارات الناقصة

**لا يوجد test suite في المشروع.**

اختبارات يجب كتابتها قبل الإطلاق:

| الاختبار | النوع | الأولوية |
|---------|------|---------|
| Price calculation للمنتجات المختلفة | Unit | Critical |
| Order creation flow | Integration | Critical |
| Promo code validation (بعد نقلها لـ DB) | Integration | Critical |
| Admin access without admin role | Integration | Critical |
| Upload file with wrong MIME | Integration | High |
| Duplicate order prevention | Integration | High |
| Order status: customer لا يغيّر لغير cancelled | Integration | High |
| Book download: limit enforcement | Integration | High |
| Rate limiting | Integration | Medium |
| Delivery fee calculation | Unit | High |
| RLS: user لا يرى طلبات الآخرين | Integration | Critical |

---

## 26. خطة الاختبار المقترحة

**Unit Tests (vitest/jest):**
- `lib/pricing.ts`: `calculatePrintPrice` لكل نوع منتج وكل خيار.
- `lib/cart.ts`: addToCart، removeFromCart، getCartTotal.
- Phone regex validation.

**Integration Tests (playwright/cypress):**
- رحلة الطلب الكاملة: Upload → Options → Checkout → Confirmation.
- محاولة دخول `/admin` بـ customer role → يُحوَّل للرئيسية.
- رفع ملف بنوع غير مدعوم → رسالة خطأ.
- طلبان متماثلان من نفس المستخدم في ثانية واحدة.

**Security Tests:**
- إرسال price = 0 في order request.
- تغيير order status إلى approved بدون admin.
- محاولة قراءة print_file لمستخدم آخر.

---

## 27. قائمة التحقق قبل الإطلاق

### الحرجة (يجب قبل أي إطلاق):
- [ ] تكامل بوابة دفع حقيقية أو تفعيل Cash on Delivery فعلياً مع تأكيد مناسب
- [ ] نقل كودات الخصم إلى DB
- [ ] إضافة Role check في Middleware لـ `/admin`
- [ ] تصحيح 3 RLS policies (H-02, H-03, H-04)
- [ ] ترقية Next.js لإصلاح 4 ثغرات High
- [ ] إضافة server-side price validation لمنتجات الطباعة المخصصة

### قبل الإطلاق — مهم:
- [ ] استبدال رقم الهاتف placeholder في Header
- [ ] إضافة محتوى حقيقي لصفحتي Privacy و Terms
- [ ] إضافة Supabase Row-level cleanup cron
- [ ] تفعيل `robots: noindex` لـ `/admin`
- [ ] تصحيح delivery fee threshold (H-05)
- [ ] تحديد إعداد bucket (Public/Private) في Supabase
- [ ] التحقق من `.gitignore` لعدم تسريب `.env`

### قبل الإطلاق — موصى به:
- [ ] إضافة `generateMetadata` للصفحات الديناميكية
- [ ] استبدال `<img>` بـ `next/image`
- [ ] إضافة Content-Security-Policy header
- [ ] إضافة loading.tsx states
- [ ] تفعيل Sentry أو Axiom لـ Error tracking
- [ ] كتابة unit tests للـ pricing logic

---

## 28. النسخ الاحتياطي والاسترداد

| العنصر | الحالة |
|--------|--------|
| Database backups | Supabase Pro يوفر daily backups تلقائياً (Free plan: 7 أيام) |
| Point-in-time recovery | متاح في Supabase Pro فقط |
| Storage backups | ❌ لا يوجد backup للملفات خارج Supabase |
| Restore testing | ❌ لم يُختبَر |
| RTO/RPO | غير محدد |

**توصية:** قبل الإطلاق، ضع خطة recovery واختبر Restore من backup.

---

## 29. المراقبة والسجلات

| العنصر | الحالة |
|--------|--------|
| Error tracking | ❌ لا Sentry/Axiom |
| Structured logs | ⚠️ `console.error` فقط |
| Audit logs للإدارة | ⚠️ order_status_history فقط |
| Payment alerts | ❌ لا يوجد (لا payment integration) |
| Security alerts | ❌ لا يوجد |
| Performance monitoring | ❌ لا يوجد |
| Rate limit alerts | ❌ لا يوجد |

**توصية:** أضف Sentry.io قبل الإطلاق (خطة مجانية كافية للـ MVP).

---

## 30. فرص الـ AI

| الميزة | القيمة التجارية | صعوبة التنفيذ | الأولوية |
|--------|----------------|---------------|---------|
| **Smart Quotation Assistant** | عالية — موجود بالفعل (rule-based) | منخفضة | ✅ مكتمل — يمكن تحسينه بـ Claude API |
| **AI Print File Checker** (DPI/Bleed/fonts) | عالية جداً — يقلل أخطاء الطباعة | متوسطة-عالية | Phase 2 — يحتاج PDF processing API |
| **Arabic Copy Assistant** | متوسطة — يساعد المصممين | منخفضة | Phase 2 — Claude API مباشرة |
| **Smart Product Recommender** | متوسطة | متوسطة | Phase 2 — يحتاج تاريخ طلبات |
| **Background Removal** | متوسطة | منخفضة | Phase 1 — Adobe Firefly API أو remove.bg |
| **Customer Support Chatbot** | عالية | متوسطة | Phase 2 — بعد تراكم FAQs |
| **Image Enhancement** | منخفضة | متوسطة | Phase 3 |
| **AI Design Assistant** | متوسطة | عالية | Phase 3 |

**البنية الحالية تدعم الـ AI بشكل معقول:** Next.js Route Handlers تسمح بـ streaming responses من Claude API، وSupabase يمكن أن يخزن conversation history.

---

## 31. خطة المعالجة المُرتَّبة

### قبل الإطلاق — فوري (Critical + High Launch Blockers)

| الأولوية | ID | التغيير المطلوب | الملفات | معيار القبول |
|----------|-----|----------------|---------|--------------|
| 1 | C-01 | نقل كودات الخصم إلى Supabase + API للتحقق | checkout/page.tsx + API جديد | لا كودات في JS bundle |
| 2 | C-02 + H-07 | إضافة role check في middleware.ts | middleware.ts | Admin routes محمية server-side |
| 3 | H-02 | تصحيح RLS: order_items insert | supabase/schema.sql | فقط order owner يُدرج |
| 4 | H-03 | تصحيح RLS: print_files insert | supabase/schema.sql | user_id يطابق auth.uid() |
| 5 | H-04 | تصحيح RLS: order_status_history insert | supabase/schema.sql | تحقق من ملكية الطلب |
| 6 | H-01 | ترقية Next.js | package.json | npm audit: 0 High |
| 7 | C-04 | Server-side validation للأسعار المخصصة | api/orders/route.ts | price من server |
| 8 | H-05 | تصحيح delivery fee threshold | api/orders/route.ts | 0 JD عند subtotal ≥ 20 |

### قبل الإطلاق — مطلوب

| الأولوية | ID | التغيير |
|----------|-----|---------|
| 9 | C-03 | تكامل دفع أو Cash on Delivery واضح |
| 10 | L-05 | استبدال placeholder phone |
| 11 | L-06 | محتوى Privacy + Terms |
| 12 | — | admin/layout noindex |
| 13 | — | `.env.example` email إزالة |

### خلال أول 30 يوم

| التغيير | السبب |
|---------|-------|
| إضافة Sentry | Error monitoring |
| إضافة Pagination في Admin | يمنع timeout مع نمو البيانات |
| تفعيل cron لـ cleanup_rate_limit_events | يمنع تضخم الجدول |
| استبدال `<img>` بـ `<Image>` | أداء LCP |
| إضافة unit tests للـ pricing | ضمان جودة |
| إضافة loading.tsx | UX |
| generateMetadata للصفحات الديناميكية | SEO |

### Phase 2

| التغيير |
|---------|
| Payment gateway integration كامل |
| Supabase Generated Types |
| Server Components للصفحات العامة |
| My Library (كتب مشتراة) في account |
| تقييمات الكتب (UI للكتابة) |
| Content-Security-Policy |
| Audit logs شاملة |
| تقارير مالية في Admin |
| دعم delivery coordinator role |

---

## 32. المخاطر المتبقية

حتى بعد معالجة كل ما سبق، تبقى هذه المخاطر:

1. **No malware scanning** للملفات المرفوعة — مستخدم يرفع PDF خبيث → يصل للـ admin.
2. **Magic bytes validation غائب** — تزوير MIME type ممكن.
3. **لا Idempotency** على إنشاء الطلبات — Double-submit ينشئ طلبين.
4. **لا DB Transactions** — crash بين إدراج order وorder_items ينتج طلباً فارغاً.
5. **Password change بدون current password** — Session hijack → password change.
6. **لا 2FA** — حسابات admin معرضة لـ brute force.

---

## 33. الحكم النهائي

**⛔ JO-PRINT غير جاهزة للإطلاق الفعلي حالياً.**

المشروع متقدم بشكل جيد من ناحية البنية والتنظيم، ويُبنى بدون أخطاء TypeScript، ورحلة الطلب الأساسية مكتملة تقنياً. لكن:

**السبب الجذري:** المنصة مصممة كمنصة دفع لكن لا يوجد دفع. ستُنشئ طلبات لا تُدفَع أبداً، مع ثغرات أمنية في لوحة الإدارة وكودات الخصم مكشوفة.

**التقدير:** مع تطبيق المراحل الفورية والمطلوبة (حوالي 2-3 أسابيع عمل)، يمكن إطلاق **Beta محدود** لعملاء مختارين مع:
- Cash on Delivery فقط كطريقة دفع.
- 3 RLS policies مصحّحة.
- Middleware role check مُضاف.
- كودات خصم منقولة لـ DB.
- Next.js مُحدَّث.

الإطلاق الكامل للعامة يتطلب إضافة Payment Gateway حقيقي.

---

*تم إعداد هذا التقرير بمنهجية Read-only audit — لم يُعدَّل أي ملف. جميع النتائج مبنية على الكود الفعلي في الفرع `claude/hopeful-hypatia-hfjq8e` بتاريخ 2026-06-24.*
