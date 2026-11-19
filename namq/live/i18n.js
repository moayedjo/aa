/* نمق — طبقة اللغة الإنجليزية للمحرّر وصفحة الاشتراك و«تنسيق حفلات».
   تُحمَّل في <head> قبل محتوى الصفحة: تترجم نصوص الواجهة فور ظهورها (بما فيها ما يبنيه JavaScript لاحقًا).
   التصاميم نفسها (اللوحة canvas وحقول الإدخال) تبقى عربية دائمًا. أي عنصر عليه data-notr يُترك كما هو. */
(function () {
  var KEY = "namq-lang", L = "ar";
  try { L = localStorage.getItem(KEY) === "en" ? "en" : "ar"; } catch (e) { /* الافتراضي عربي */ }
  var de = document.documentElement;
  if (L === "en") { de.lang = "en"; de.dir = "ltr"; }

  var D = {
    /* عام */
    "‹ نمق": "‹ Namq", "تصاميم جاهزة، بلمستك": "Ready designs, your touch", "نموذج تجريبي": "Demo", "نسخة تجريبية": "Demo",
    "جارٍ التحميل…": "Loading…", "تراجع": "Undo", "تشغيل": "Play", "إيقاف": "Pause", "+ نص": "+ Text", "تصدير": "Export", "التصدير": "Export",
    "نوع القالب": "Template type", "ثابت": "Static", "متحرك": "Animated", "معاينة التصميم": "Design preview", "الملف المصدَّر": "Exported file",
    "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6",
    /* المحرّر */
    "محرّر نمق — نموذج تجريبي": "Namq editor — demo",
    "MP4 — عبر خادم التصدير (غير مربوط هنا)": "MP4 — via export server (not connected here)",
    "أصول هذا النموذج (الخلفية والفيديو) تجريبية مولّدة بالكود، والخطوط مفتوحة المصدر (OFL) من Google Fonts. ليست منتجات نهائية.": "This demo's assets (background and video) are code-generated samples; fonts are open source (OFL) from Google Fonts. Not final products.",
    "إظهار": "Show", "إخفاء": "Hide", "حذف": "Delete", "(اختياري)": "(optional)", "تنسيق النص": "Text style",
    "اسحب النص في المعاينة لتحريكه": "Drag the text in the preview to move it", "اسحب الرمز في المعاينة لتحريكه": "Drag the monogram in the preview to move it",
    "النص أطول من المساحة المخصصة له حتى بعد تصغيره. اختصر النص أو صغّر الخط من «تنسيق النص» — لن نقصّه تلقائيًا.": "The text is longer than its space even after shrinking. Shorten it or reduce the size in “Text style” — we won't cut it automatically.",
    "الخط": "Font", "اللون": "Color", "لون مخصص": "Custom color", "الحجم": "Size", "المحاذاة": "Alignment", "يمين": "Right", "وسط": "Center", "يسار": "Left",
    "إرجاع التنسيق الأصلي": "Reset style", "استبدال الصورة": "Replace photo", "رفع صورة من الجهاز": "Upload a photo", "حذف الصورة": "Remove photo",
    "تكبير داخل الإطار — واسحب الصورة في المعاينة لضبط القص": "Zoom inside the frame — drag the photo in the preview to adjust the crop",
    "السحب في المعاينة يحرّك": "Dragging in the preview moves", "الصورة داخل الإطار": "The photo inside the frame", "الإطار نفسه": "The frame itself",
    "حجم الشعار": "Logo size", "حجم الإطار": "Frame size", "إرجاع المكان والحجم": "Reset position and size",
    "حرف العريس": "Groom's letter", "حرف العروس": "Bride's letter", "التقارب": "Overlap", "الارتفاع": "Offset", "استعادة الوضع الأصلي": "Reset",
    "الحرفان يُرسمان بالخط المختار كما هو. اضبط التقارب والارتفاع حتى يعجبك التداخل.": "The two letters use the chosen font as is. Adjust overlap and offset until you like the result.",
    "جارٍ التجهيز…": "Preparing…", "تعذّر التنزيل في هذا المتصفح.": "Download isn't possible in this browser.",
    "متوفر بمقاسات أخرى:": "Also available in:", "متوفر بمقاسات أخرى": "Also available in", "المقاس الحالي": "Current size",
    /* أسماء عناصر القوالب */
    "السطر الافتتاحي": "Opening line", "الصورة": "Photo", "العنوان": "Title", "الأسماء": "Names", "التفاصيل": "Details", "السطر الثاني": "Second line",
    "المرسل": "From", "رمز العروسين": "Couple monogram", "الشعار": "Logo", "سطر علوي": "Top line", "الخصم": "Discount", "صورة المنتج": "Product photo",
    /* الاشتراك */
    "اشتراك نمق — كل القوالب بلا حدود": "Namq subscription — every template, unlimited", "الاشتراك": "Subscription",
    "الشراء المنفرد لكل قالب متاح دائمًا من صفحة القوالب. الدفع غير مفعّل بعد في هذه النسخة التجريبية.": "You can always buy single templates from the templates page. Payment isn't enabled yet in this demo.",
    "لا توجد باقات اشتراك متاحة حاليًا.": "No subscription plans are available right now.", "جارٍ التحويل إلى الدفع…": "Redirecting to checkout…", "اشترك": "Subscribe",
    "سنويًا": "per year", "شهريًا": "per month", "أسبوعيًا": "per week",
    "اشتراك شهري": "Monthly plan", "اشتراك سنوي": "Yearly plan",
    "كل القوالب الثابتة والمتحركة، يتجدد شهريًا.": "All static and animated templates, renews monthly.",
    "كل القوالب الثابتة والمتحركة، يتجدد سنويًا.": "All static and animated templates, renews yearly.",
    "جميع القوالب الحالية والجديدة": "All current and new templates", "تخصيص وتصدير غير محدود طوال الاشتراك": "Unlimited customizing and exporting during the plan",
    "إلغاء التجديد في أي وقت": "Cancel renewal anytime",
    /* تنسيق حفلات */
    "تنسيق حفلات — نمق": "Event kits — Namq", "تنسيق حفلات": "Event kits",
    "أدخل بيانات حفلتك مرة واحدة، ونجهّز لك مجموعة كاملة جاهزة للتنزيل والطباعة: دعوات بأسماء المعازيم، ستوري، بطاقة للطباعة، لوحة ترحيب، بطاقات الطاولات وملصقات التوزيعات.": "Enter your event details once and get a complete set ready to download and print: invitations with each guest's name, stories, a printable card, a welcome sign, table cards and favor stickers.",
    "المناسبة": "Occasion", "الطابع": "Style", "بيانات الحفل": "Event details", "المعازيم": "Guests", "التصاميم المطلوبة": "Designs to include", "ملفاتك": "Your files",
    "عرس": "Wedding", "زفاف وحفل عرس": "Wedding celebration", "خطوبة": "Engagement", "حفل خطوبة أو ملكة": "Engagement or katb al-kitab",
    "عيد ميلاد": "Birthday", "للصغار والكبار": "For kids and adults", "مولود جديد": "New baby", "حفل استقبال المولود": "Baby welcome party",
    "وردي وذهبي": "Rose & gold", "عاجي وزيتوني": "Ivory & olive", "كحلي وذهبي": "Navy & gold", "سماوي ناعم": "Soft sky", "زهري ناعم": "Soft blush", "مرح وملوّن": "Playful colors",
    "خط الأسماء": "Names font", "تلقائي حسب الطابع": "Automatic (from style)", "رقعة — Aref Ruqaa": "Ruqaa — Aref Ruqaa", "نسخ — Amiri": "Naskh — Amiri", "كوفي — Reem Kufi": "Kufi — Reem Kufi", "حديث — Tajawal": "Modern — Tajawal",
    "إضافة البسملة": "Add Basmala", "الداعون": "Hosts", "عبارة الدعوة": "Invitation line", "الاسم": "Name", "الاسم الثاني": "Second name", "سطر إضافي": "Extra line",
    "التاريخ": "Date", "الوقت": "Time", "المكان": "Venue", "ملاحظة (اختياري)": "Note (optional)", "للتأكيد والاستفسار (اختياري)": "RSVP contact (optional)",
    "العبارة الختامية": "Closing line", "عبارة الشكر (للملصقات وستوري الشكر)": "Thank-you line (stickers and thank-you story)", "هاشتاق الحفل (اختياري)": "Event hashtag (optional)",
    "ما يسبق اسم المدعو": "Text before each guest's name", "اسم العريس": "Groom's name", "اسم العروس": "Bride's name", "اسم الخاطب": "Groom's name", "اسم المخطوبة": "Bride's name",
    "اسم صاحب/ة الحفل": "Birthday person's name", "سطر العمر": "Age line", "اسم المولود": "Baby's name",
    "ارفع ملف Excel أو CSV فيه عمود «الاسم» (واختياريًا عمود «اللقب»)، أو الصق الأسماء، اسمًا في كل سطر. نجهّز دعوة باسم كل مدعو.": "Upload an Excel or CSV file with a “Name” column (and optionally a “Title” column), or paste names, one per line. We make an invitation with each guest's name.",
    "رفع ملف الأسماء": "Upload guest list", "تنزيل نموذج الملف": "Download sample file", "مسح القائمة": "Clear list",
    "الأسماء تبقى على جهازك: القراءة والتصميم يتمان داخل المتصفح، ولا تُرسل القائمة لأي خادم.": "Names stay on your device: reading and designing happen in your browser, and the list is never sent to a server.",
    "لم تُضف أسماء بعد — الدعوات بالأسماء وبطاقات الأماكن تحتاج القائمة.": "No names yet — named invitations and place cards need the list.", "عدد المعازيم:": "Guests:",
    "لم نجد أسماء في الملف. تأكد أن الأسماء في العمود الأول أو في عمود عنوانه «الاسم».": "No names found. Put names in the first column or in a column titled “Name”.",
    "صيغة xls القديمة غير مدعومة. احفظ الملف بصيغة xlsx أو CSV ثم ارفعه.": "The old .xls format isn't supported. Save as .xlsx or CSV and upload again.",
    "هذا المتصفح لا يقرأ ملفات Excel. احفظ الملف بصيغة CSV أو الصق الأسماء.": "This browser can't read Excel files. Save as CSV or paste the names.",
    "تعذّرت قراءة الملف. احفظه بصيغة xlsx أو CSV، أو الصق الأسماء.": "Couldn't read the file. Save it as .xlsx or CSV, or paste the names.",
    "عدد الطاولات": "Number of tables", "عدد الملصقات": "Number of stickers",
    "دعوة ستوري": "Story invitation", "1080×1920 · PNG · للواتساب والإنستغرام": "1080×1920 · PNG · for WhatsApp and Instagram",
    "دعوة بوست": "Post invitation", "بطاقة دعوة للطباعة": "Printable invitation card",
    "دعوات بأسماء المعازيم — للواتساب": "Named invitations — for WhatsApp", "صورة لكل مدعو · JPG": "One image per guest · JPG",
    "دعوات بأسماء المعازيم — للطباعة": "Named invitations — for print", "A5 · ملف PDF واحد، صفحة لكل مدعو": "A5 · one PDF, a page per guest",
    "لوحة ترحيب": "Welcome sign", "A3 · PDF · للمدخل": "A3 · PDF · for the entrance",
    "بطاقات أماكن الجلوس بالأسماء": "Named place cards", "A4 · ١٠ بطاقات في الصفحة مع علامات القص": "A4 · 10 cards per page with crop marks",
    "أرقام الطاولات": "Table numbers", "A4 · ٤ بطاقات في الصفحة": "A4 · 4 cards per page",
    "ملصقات التوزيعات": "Favor stickers", "دوائر ٥ سم · A4 · ١٥ في الصفحة": "5 cm circles · A4 · 15 per page",
    "ستوري شكر بعد الحفل": "Thank-you story after the event", "— تحتاج قائمة المعازيم": "— needs the guest list",
    "ستوري": "Story", "بوست": "Post", "بطاقة A5": "A5 card", "دعوة باسم": "Named invite", "لوحة الترحيب": "Welcome sign", "بطاقات الأماكن": "Place cards", "الطاولات": "Tables", "الملصقات": "Stickers", "شكر": "Thank you",
    "المعاينة": "Preview", "A5 — 148×210 مم": "A5 — 148×210 mm", "A3 — 297×420 مم": "A3 — 297×420 mm", "معاينة بأول اسم في القائمة": "Previewing the first name on the list",
    "اسم تجريبي — أضف المعازيم في الخطوة ٤": "Sample name — add guests in step 4", "ورقة A4 — اقطع على العلامات الرمادية": "A4 sheet — cut along the grey marks",
    "ورقة A4 — ٤ طاولات": "A4 sheet — 4 tables", "ورقة A4 — ملصقات دائرية ٥ سم": "A4 sheet — 5 cm round stickers",
    "جهّز المجموعة ونزّلها": "Build & download the set", "اختر تصميمًا واحدًا على الأقل": "Choose at least one design", "جارٍ ضغط الملفات…": "Zipping files…",
    "تنزيل الكل (ZIP)": "Download all (ZIP)", "تنزيل": "Download",
  };
  var R = [
    [/^(\d+) تصاميم$/, "$1 designs"],
    [/^جارٍ تجهيز: (.+)$/, "Preparing: $1"],
    [/^دعوات الواتساب: (\d+) \/ (\d+)$/, "WhatsApp invitations: $1 / $2"],
    [/^دعوات الطباعة: (\d+) \/ (\d+)$/, "Print invitations: $1 / $2"],
    [/^بطاقات الأماكن: (\d+) \/ (\d+)$/, "Place cards: $1 / $2"],
    [/^جاهزة: (\d+) ملفات \(([\d.]+) م\.ب\)\. .*$/, "Ready: $1 files ($2 MB). If the download didn't start, tap “Download all” or download each file."],
    [/^تعذّر التجهيز: (.*) — .*$/, "Couldn't build the set: $1 — try fewer guests or another browser."],
    [/^· ([\d.]+) م\.ب$/, "· $1 MB"], [/^· (\d+) ك\.ب$/, "· $1 KB"],
    [/^· (\d+) صورة — داخل ملف ZIP$/, "· $1 images — inside the ZIP"],
    [/^تم تجهيز (\S+) \((\d+) ك\.ب\)\..*الصورة لحفظها\.$/, "$1 is ready ($2 KB). If the download didn't start, long-press the image to save it."],
    [/^تم تجهيز (\S+) \((\d+) ك\.ب\)\..*$/, "$1 is ready ($2 KB). If the download didn't start, this browser blocks downloads from this page."],
    [/^فشل التصدير: (.*) — أعد المحاولة\.$/, "Export failed: $1 — please try again."],
    [/^أكمل الحقل الإجباري: (.+)$/, "Fill in the required field: $1"],
    [/^النص في «(.+)» أطول من مساحته\. عدّله قبل التصدير\.$/, "The text in “$1” is longer than its space. Edit it before exporting."],
    [/^نسخة تجريبية: التصدير مفتوح مؤقتًا إلى حين تفعيل الدفع\. المقاس النهائي (\d+)×(\d+) بكسل.*$/, "Demo: export is open until payment is enabled. Final size $1×$2 px, independent of the preview. The PDF here is an RGB raster image on a page of the same size — not a professional print file."],
    [/^نسخة تجريبية: التصدير مفتوح مؤقتًا إلى حين تفعيل الدفع\. PNG وPDF يُصدَّران من المشهد المرجعي للقالب \(الثانية ([\d.]+)\)\..*$/, "Demo: export is open until payment is enabled. PNG and PDF are exported from the template's reference frame (second $1). MP4 is rendered on an export server with the same engine — not connected on this page."],
    [/^نص مضاف (\d+)$/, "Added text $1"],
    [/^(.*) · ثابت( · .*)?$/, "$1 · Static$2"], [/^(.*) · متحرك( · .*)?$/, "$1 · Animated$2"],
    [/^([\d.,]+) د\.إ$/, "AED $1"],
  ];
  function t(s) {
    if (L !== "en" || s == null) return s;
    var k = String(s).trim(); if (!k) return s;
    if (Object.prototype.hasOwnProperty.call(D, k)) return String(s).replace(k, D[k]);
    for (var i = 0; i < R.length; i++) if (R[i][0].test(k)) {
      var v = k.replace(R[i][0], R[i][1]);
      v = v.replace(/\$\d/g, "");
      return String(s).replace(k, v.replace(/[^\x00-\x7F«»“”—–…×·‹›]+/g, function (m) { return D[m] || m; }));
    }
    return s;
  }
  var ATTRS = ["aria-label", "placeholder", "title", "alt"];
  function skip(el) { return !el || (el.closest && el.closest("[data-notr],script,style,textarea")); }
  function walk(n) {
    if (n.nodeType === 3) { if (skip(n.parentNode)) return; var v = t(n.data); if (v !== n.data) n.data = v; return; }
    if (n.nodeType !== 1 || skip(n)) return;
    if (n.hasAttribute("data-lang-toggle")) { n.textContent = L === "en" ? "العربية" : "English"; n.setAttribute("lang", L === "en" ? "ar" : "en"); return; }
    for (var i = 0; i < ATTRS.length; i++) { var a = n.getAttribute(ATTRS[i]); if (a) { var w = t(a); if (w !== a) n.setAttribute(ATTRS[i], w); } }
    for (var c = n.firstChild; c; c = c.nextSibling) walk(c);
  }
  window.NamqI18n = {
    lang: L, t: t,
    set: function (l) { try { localStorage.setItem(KEY, l); } catch (e) { /* نكمل */ } location.reload(); },
    toggle: function () { this.set(L === "en" ? "ar" : "en"); },
  };
  document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("[data-lang-toggle]")) { e.preventDefault(); window.NamqI18n.toggle(); } });
  if (L !== "en") { document.addEventListener("DOMContentLoaded", function () { document.querySelectorAll("[data-lang-toggle]").forEach(walk); }); return; }
  new MutationObserver(function (ms) {
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i];
      if (m.type === "childList") for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
      else if (m.type === "characterData") walk(m.target);
      else if (m.type === "attributes") { var a = m.target.getAttribute(m.attributeName), w = t(a); if (a && w !== a && !skip(m.target)) m.target.setAttribute(m.attributeName, w); }
    }
  }).observe(de, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  document.addEventListener("DOMContentLoaded", function () { walk(document.body); document.title = t(document.title); });
})();
