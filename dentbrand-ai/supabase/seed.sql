-- =============================================================================
-- Seed data — five production dental templates (Phase 03)
-- Idempotent: safe to run repeatedly. Apply AFTER all migrations.
-- Template JSON must validate against src/lib/templates/schema.ts
-- (schemaVersion 1). Versions are immutable; edits create new versions.
-- =============================================================================

-- 1) Service Spotlight ------------------------------------------------------

insert into public.templates
  (id, vertical_id, category_id, name, description, status, current_version,
   supported_languages, canvas_width, canvas_height)
values (
  '30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  (select id from public.template_categories where key = 'promotions'
     and vertical_id = '20000000-0000-0000-0000-000000000001'),
  'Service Spotlight',
  'Hero image with headline, body, CTA and contact footer. Great for presenting one service.',
  'published', 1, array['ar','en'], 1080, 1350
)
on conflict (id) do nothing;

insert into public.template_versions (template_id, version, template_json)
values (
  '30000000-0000-0000-0000-000000000001', 1,
$$
{
  "schemaVersion": 1,
  "canvas": { "width": 1080, "height": 1350, "backgroundColor": "{{backgroundColor}}" },
  "supportedLanguages": ["ar", "en"],
  "layers": [
    { "id": "hero", "type": "image", "x": 60, "y": 60, "width": 960, "height": 600,
      "zIndex": 1, "editable": true, "src": "{{generatedImage}}", "fit": "cover", "cornerRadius": 24 },
    { "id": "headline", "type": "text", "x": 60, "y": 710, "width": 960, "height": 170,
      "zIndex": 2, "editable": true, "text": "{{headline}}", "fontFamily": "{{brandFont}}",
      "fontSize": 72, "fontWeight": 800, "direction": "auto", "align": "start",
      "fill": "{{primaryColor}}", "maxCharacters": 60 },
    { "id": "body", "type": "text", "x": 60, "y": 890, "width": 960, "height": 150,
      "zIndex": 2, "editable": true, "text": "{{bodyText}}", "fontFamily": "{{brandFont}}",
      "fontSize": 40, "fontWeight": 400, "direction": "auto", "align": "start",
      "fill": "{{textColor}}", "maxCharacters": 140, "lineHeight": 1.35 },
    { "id": "cta-pill", "type": "shape", "x": 60, "y": 1065, "width": 420, "height": 90,
      "zIndex": 2, "editable": false, "shape": "rect", "fill": "{{accentColor}}", "cornerRadius": 45 },
    { "id": "cta", "type": "text", "x": 60, "y": 1085, "width": 420, "height": 56,
      "zIndex": 3, "editable": true, "text": "{{cta}}", "fontFamily": "{{brandFont}}",
      "fontSize": 40, "fontWeight": 700, "direction": "auto", "align": "center",
      "fill": "#ffffff", "maxCharacters": 24 },
    { "id": "divider", "type": "shape", "x": 60, "y": 1205, "width": 960, "height": 3,
      "zIndex": 2, "editable": false, "shape": "rect", "fill": "{{secondaryColor}}" },
    { "id": "logo", "type": "logo", "x": 60, "y": 1235, "width": 84, "height": 84,
      "zIndex": 2, "editable": false, "src": "{{logoUrl}}", "fit": "contain" },
    { "id": "business-name", "type": "text", "x": 170, "y": 1252, "width": 500, "height": 52,
      "zIndex": 2, "editable": false, "text": "{{businessName}}", "fontFamily": "{{brandFont}}",
      "fontSize": 34, "fontWeight": 700, "direction": "auto", "align": "start",
      "fill": "{{textColor}}", "maxCharacters": 40 },
    { "id": "phone", "type": "text", "x": 670, "y": 1256, "width": 350, "height": 46,
      "zIndex": 2, "editable": false, "text": "{{phone}}", "fontFamily": "{{brandFont}}",
      "fontSize": 30, "fontWeight": 400, "direction": "ltr", "align": "end",
      "fill": "{{secondaryColor}}", "maxCharacters": 24 }
  ]
}
$$::jsonb)
on conflict (template_id, version) do nothing;

insert into public.template_services (template_id, service_id)
select '30000000-0000-0000-0000-000000000001', s.id
from public.services s
where s.vertical_id = '20000000-0000-0000-0000-000000000001'
  and s.key in ('teeth-whitening', 'veneers', 'cosmetic-dentistry', 'dental-implants')
on conflict do nothing;

-- 2) Special Offer ----------------------------------------------------------

insert into public.templates
  (id, vertical_id, category_id, name, description, status, current_version,
   supported_languages, canvas_width, canvas_height)
values (
  '30000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000001',
  (select id from public.template_categories where key = 'promotions'
     and vertical_id = '20000000-0000-0000-0000-000000000001'),
  'Special Offer',
  'Full-bleed image with brand overlay, offer badge and centered headline.',
  'published', 1, array['ar','en'], 1080, 1350
)
on conflict (id) do nothing;

insert into public.template_versions (template_id, version, template_json)
values (
  '30000000-0000-0000-0000-000000000002', 1,
$$
{
  "schemaVersion": 1,
  "canvas": { "width": 1080, "height": 1350, "backgroundColor": "{{primaryColor}}" },
  "supportedLanguages": ["ar", "en"],
  "layers": [
    { "id": "hero", "type": "image", "x": 0, "y": 0, "width": 1080, "height": 1350,
      "zIndex": 0, "editable": true, "src": "{{generatedImage}}", "fit": "cover" },
    { "id": "overlay", "type": "shape", "x": 0, "y": 0, "width": 1080, "height": 1350,
      "zIndex": 1, "editable": false, "shape": "rect", "fill": "{{primaryColor}}", "opacity": 0.55 },
    { "id": "badge", "type": "shape", "x": 760, "y": 80, "width": 240, "height": 240,
      "zIndex": 2, "editable": false, "shape": "ellipse", "fill": "{{accentColor}}" },
    { "id": "badge-text", "type": "text", "x": 760, "y": 165, "width": 240, "height": 80,
      "zIndex": 3, "editable": false, "text": { "en": "OFFER", "ar": "عرض" },
      "fontFamily": "{{brandFont}}", "fontSize": 44, "fontWeight": 800,
      "direction": "auto", "align": "center", "fill": "#ffffff", "maxCharacters": 10 },
    { "id": "headline", "type": "text", "x": 90, "y": 540, "width": 900, "height": 250,
      "zIndex": 3, "editable": true, "text": "{{headline}}", "fontFamily": "{{brandFont}}",
      "fontSize": 84, "fontWeight": 800, "direction": "auto", "align": "center",
      "fill": "#ffffff", "maxCharacters": 50, "lineHeight": 1.2 },
    { "id": "body", "type": "text", "x": 140, "y": 820, "width": 800, "height": 140,
      "zIndex": 3, "editable": true, "text": "{{bodyText}}", "fontFamily": "{{brandFont}}",
      "fontSize": 40, "fontWeight": 400, "direction": "auto", "align": "center",
      "fill": "#ffffff", "maxCharacters": 120, "lineHeight": 1.35 },
    { "id": "cta-pill", "type": "shape", "x": 330, "y": 1000, "width": 420, "height": 96,
      "zIndex": 3, "editable": false, "shape": "rect", "fill": "{{accentColor}}", "cornerRadius": 48 },
    { "id": "cta", "type": "text", "x": 330, "y": 1024, "width": 420, "height": 56,
      "zIndex": 4, "editable": true, "text": "{{cta}}", "fontFamily": "{{brandFont}}",
      "fontSize": 40, "fontWeight": 700, "direction": "auto", "align": "center",
      "fill": "#ffffff", "maxCharacters": 24 },
    { "id": "logo", "type": "logo", "x": 60, "y": 1210, "width": 100, "height": 100,
      "zIndex": 3, "editable": false, "src": "{{logoUrl}}", "fit": "contain" },
    { "id": "phone", "type": "text", "x": 600, "y": 1240, "width": 420, "height": 46,
      "zIndex": 3, "editable": false, "text": "{{phone}}", "fontFamily": "{{brandFont}}",
      "fontSize": 32, "fontWeight": 400, "direction": "ltr", "align": "end",
      "fill": "#ffffff", "maxCharacters": 24 }
  ]
}
$$::jsonb)
on conflict (template_id, version) do nothing;

insert into public.template_services (template_id, service_id)
select '30000000-0000-0000-0000-000000000002', s.id
from public.services s
where s.vertical_id = '20000000-0000-0000-0000-000000000001'
  and s.key in ('teeth-whitening', 'orthodontics', 'dental-implants', 'veneers')
on conflict do nothing;

-- 3) Dental Tip -------------------------------------------------------------

insert into public.templates
  (id, vertical_id, category_id, name, description, status, current_version,
   supported_languages, canvas_width, canvas_height)
values (
  '30000000-0000-0000-0000-000000000003',
  '20000000-0000-0000-0000-000000000001',
  (select id from public.template_categories where key = 'educational'
     and vertical_id = '20000000-0000-0000-0000-000000000001'),
  'Dental Tip',
  'Text-first educational layout with header band — no photo required.',
  'published', 1, array['ar','en'], 1080, 1350
)
on conflict (id) do nothing;

insert into public.template_versions (template_id, version, template_json)
values (
  '30000000-0000-0000-0000-000000000003', 1,
$$
{
  "schemaVersion": 1,
  "canvas": { "width": 1080, "height": 1350, "backgroundColor": "{{backgroundColor}}" },
  "supportedLanguages": ["ar", "en"],
  "layers": [
    { "id": "header-band", "type": "shape", "x": 0, "y": 0, "width": 1080, "height": 220,
      "zIndex": 1, "editable": false, "shape": "rect", "fill": "{{primaryColor}}" },
    { "id": "kicker", "type": "text", "x": 60, "y": 75, "width": 500, "height": 80,
      "zIndex": 2, "editable": false, "text": { "en": "Dental tip", "ar": "نصيحة لأسنانك" },
      "fontFamily": "{{brandFont}}", "fontSize": 44, "fontWeight": 700,
      "direction": "auto", "align": "start", "fill": "#ffffff", "maxCharacters": 24 },
    { "id": "deco-circle", "type": "shape", "x": 890, "y": 55, "width": 130, "height": 130,
      "zIndex": 2, "editable": false, "shape": "ellipse", "fill": "{{accentColor}}", "opacity": 0.9 },
    { "id": "headline", "type": "text", "x": 60, "y": 320, "width": 960, "height": 270,
      "zIndex": 2, "editable": true, "text": "{{headline}}", "fontFamily": "{{brandFont}}",
      "fontSize": 76, "fontWeight": 800, "direction": "auto", "align": "start",
      "fill": "{{textColor}}", "maxCharacters": 80, "lineHeight": 1.25 },
    { "id": "underline", "type": "shape", "x": 60, "y": 625, "width": 200, "height": 10,
      "zIndex": 2, "editable": false, "shape": "rect", "fill": "{{accentColor}}", "cornerRadius": 5 },
    { "id": "body", "type": "text", "x": 60, "y": 700, "width": 960, "height": 340,
      "zIndex": 2, "editable": true, "text": "{{bodyText}}", "fontFamily": "{{brandFont}}",
      "fontSize": 42, "fontWeight": 400, "direction": "auto", "align": "start",
      "fill": "{{textColor}}", "maxCharacters": 260, "lineHeight": 1.45 },
    { "id": "footer-band", "type": "shape", "x": 0, "y": 1150, "width": 1080, "height": 200,
      "zIndex": 1, "editable": false, "shape": "rect", "fill": "{{secondaryColor}}" },
    { "id": "logo", "type": "logo", "x": 60, "y": 1195, "width": 110, "height": 110,
      "zIndex": 2, "editable": false, "src": "{{logoUrl}}", "fit": "contain" },
    { "id": "business-name", "type": "text", "x": 195, "y": 1222, "width": 500, "height": 56,
      "zIndex": 2, "editable": false, "text": "{{businessName}}", "fontFamily": "{{brandFont}}",
      "fontSize": 34, "fontWeight": 700, "direction": "auto", "align": "start",
      "fill": "#ffffff", "maxCharacters": 40 },
    { "id": "website", "type": "text", "x": 600, "y": 1228, "width": 420, "height": 46,
      "zIndex": 2, "editable": false, "text": "{{website}}", "fontFamily": "{{brandFont}}",
      "fontSize": 30, "fontWeight": 400, "direction": "ltr", "align": "end",
      "fill": "#ffffff", "maxCharacters": 40 }
  ]
}
$$::jsonb)
on conflict (template_id, version) do nothing;

insert into public.template_services (template_id, service_id)
select '30000000-0000-0000-0000-000000000003', s.id
from public.services s
where s.vertical_id = '20000000-0000-0000-0000-000000000001'
  and s.key in ('cleaning-checkup', 'gum-treatment', 'pediatric-dentistry')
on conflict do nothing;

-- 4) Booking Reminder -------------------------------------------------------

insert into public.templates
  (id, vertical_id, category_id, name, description, status, current_version,
   supported_languages, canvas_width, canvas_height)
values (
  '30000000-0000-0000-0000-000000000004',
  '20000000-0000-0000-0000-000000000001',
  (select id from public.template_categories where key = 'booking'
     and vertical_id = '20000000-0000-0000-0000-000000000001'),
  'Booking Reminder',
  'Image top, brand panel bottom with headline, CTA and phone number.',
  'published', 1, array['ar','en'], 1080, 1350
)
on conflict (id) do nothing;

insert into public.template_versions (template_id, version, template_json)
values (
  '30000000-0000-0000-0000-000000000004', 1,
$$
{
  "schemaVersion": 1,
  "canvas": { "width": 1080, "height": 1350, "backgroundColor": "{{primaryColor}}" },
  "supportedLanguages": ["ar", "en"],
  "layers": [
    { "id": "hero", "type": "image", "x": 0, "y": 0, "width": 1080, "height": 640,
      "zIndex": 1, "editable": true, "src": "{{generatedImage}}", "fit": "cover" },
    { "id": "panel", "type": "shape", "x": 0, "y": 640, "width": 1080, "height": 710,
      "zIndex": 1, "editable": false, "shape": "rect", "fill": "{{primaryColor}}" },
    { "id": "headline", "type": "text", "x": 70, "y": 720, "width": 940, "height": 185,
      "zIndex": 2, "editable": true, "text": "{{headline}}", "fontFamily": "{{brandFont}}",
      "fontSize": 68, "fontWeight": 800, "direction": "auto", "align": "start",
      "fill": "#ffffff", "maxCharacters": 55, "lineHeight": 1.25 },
    { "id": "body", "type": "text", "x": 70, "y": 915, "width": 940, "height": 120,
      "zIndex": 2, "editable": true, "text": "{{bodyText}}", "fontFamily": "{{brandFont}}",
      "fontSize": 38, "fontWeight": 400, "direction": "auto", "align": "start",
      "fill": "#ffffff", "maxCharacters": 110, "lineHeight": 1.35 },
    { "id": "cta-pill", "type": "shape", "x": 70, "y": 1065, "width": 400, "height": 90,
      "zIndex": 2, "editable": false, "shape": "rect", "fill": "{{accentColor}}", "cornerRadius": 45 },
    { "id": "cta", "type": "text", "x": 70, "y": 1085, "width": 400, "height": 54,
      "zIndex": 3, "editable": true, "text": "{{cta}}", "fontFamily": "{{brandFont}}",
      "fontSize": 38, "fontWeight": 700, "direction": "auto", "align": "center",
      "fill": "#ffffff", "maxCharacters": 22 },
    { "id": "phone", "type": "text", "x": 520, "y": 1082, "width": 490, "height": 56,
      "zIndex": 2, "editable": false, "text": "{{phone}}", "fontFamily": "{{brandFont}}",
      "fontSize": 40, "fontWeight": 700, "direction": "ltr", "align": "end",
      "fill": "#ffffff", "maxCharacters": 24 },
    { "id": "logo", "type": "logo", "x": 70, "y": 1205, "width": 90, "height": 90,
      "zIndex": 2, "editable": false, "src": "{{logoUrl}}", "fit": "contain" },
    { "id": "business-name", "type": "text", "x": 180, "y": 1228, "width": 620, "height": 50,
      "zIndex": 2, "editable": false, "text": "{{businessName}}", "fontFamily": "{{brandFont}}",
      "fontSize": 32, "fontWeight": 700, "direction": "auto", "align": "start",
      "fill": "#ffffff", "maxCharacters": 40 }
  ]
}
$$::jsonb)
on conflict (template_id, version) do nothing;

insert into public.template_services (template_id, service_id)
select '30000000-0000-0000-0000-000000000004', s.id
from public.services s
where s.vertical_id = '20000000-0000-0000-0000-000000000001'
  and s.key in ('cleaning-checkup', 'orthodontics', 'root-canal')
on conflict do nothing;

-- 5) Seasonal Greeting ------------------------------------------------------

insert into public.templates
  (id, vertical_id, category_id, name, description, status, current_version,
   supported_languages, canvas_width, canvas_height)
values (
  '30000000-0000-0000-0000-000000000005',
  '20000000-0000-0000-0000-000000000001',
  (select id from public.template_categories where key = 'seasonal'
     and vertical_id = '20000000-0000-0000-0000-000000000001'),
  'Seasonal Greeting',
  'Centered greeting with logo and decorative shapes — no photo required.',
  'published', 1, array['ar','en'], 1080, 1350
)
on conflict (id) do nothing;

insert into public.template_versions (template_id, version, template_json)
values (
  '30000000-0000-0000-0000-000000000005', 1,
$$
{
  "schemaVersion": 1,
  "canvas": { "width": 1080, "height": 1350, "backgroundColor": "{{primaryColor}}" },
  "supportedLanguages": ["ar", "en"],
  "layers": [
    { "id": "deco-top", "type": "shape", "x": -200, "y": -200, "width": 600, "height": 600,
      "zIndex": 1, "editable": false, "shape": "ellipse", "fill": "{{secondaryColor}}", "opacity": 0.6 },
    { "id": "deco-bottom", "type": "shape", "x": 780, "y": 1020, "width": 520, "height": 520,
      "zIndex": 1, "editable": false, "shape": "ellipse", "fill": "{{accentColor}}", "opacity": 0.5 },
    { "id": "logo", "type": "logo", "x": 440, "y": 230, "width": 200, "height": 200,
      "zIndex": 2, "editable": false, "src": "{{logoUrl}}", "fit": "contain" },
    { "id": "headline", "type": "text", "x": 90, "y": 545, "width": 900, "height": 270,
      "zIndex": 2, "editable": true, "text": "{{headline}}", "fontFamily": "{{brandFont}}",
      "fontSize": 80, "fontWeight": 800, "direction": "auto", "align": "center",
      "fill": "#ffffff", "maxCharacters": 60, "lineHeight": 1.25 },
    { "id": "body", "type": "text", "x": 140, "y": 850, "width": 800, "height": 170,
      "zIndex": 2, "editable": true, "text": "{{bodyText}}", "fontFamily": "{{brandFont}}",
      "fontSize": 42, "fontWeight": 400, "direction": "auto", "align": "center",
      "fill": "#ffffff", "maxCharacters": 140, "lineHeight": 1.4 },
    { "id": "business-name", "type": "text", "x": 90, "y": 1115, "width": 900, "height": 64,
      "zIndex": 2, "editable": false, "text": "{{businessName}}", "fontFamily": "{{brandFont}}",
      "fontSize": 40, "fontWeight": 700, "direction": "auto", "align": "center",
      "fill": "#ffffff", "maxCharacters": 40 },
    { "id": "website", "type": "text", "x": 90, "y": 1195, "width": 900, "height": 46,
      "zIndex": 2, "editable": false, "text": "{{website}}", "fontFamily": "{{brandFont}}",
      "fontSize": 30, "fontWeight": 400, "direction": "ltr", "align": "center",
      "fill": "#ffffff", "maxCharacters": 40 }
  ]
}
$$::jsonb)
on conflict (template_id, version) do nothing;

-- =============================================================================
-- Additional production templates (Phase 12) — brings the library to 12.
-- Each validates against src/lib/templates/schema.ts (see seed.test.ts).
-- =============================================================================

-- 6) Testimonial Quote -------------------------------------------------------

insert into public.templates
  (id, vertical_id, category_id, name, description, status, current_version,
   supported_languages, canvas_width, canvas_height)
values (
  '30000000-0000-0000-0000-000000000006',
  '20000000-0000-0000-0000-000000000001',
  (select id from public.template_categories where key = 'branding'
     and vertical_id = '20000000-0000-0000-0000-000000000001'),
  'Patient Quote',
  'Clean quote card for a patient testimonial — text-first, no photo needed.',
  'published', 1, array['ar','en'], 1080, 1350
)
on conflict (id) do nothing;

insert into public.template_versions (template_id, version, template_json)
values (
  '30000000-0000-0000-0000-000000000006', 1,
$$
{
  "schemaVersion": 1,
  "canvas": { "width": 1080, "height": 1350, "backgroundColor": "{{backgroundColor}}" },
  "supportedLanguages": ["ar", "en"],
  "layers": [
    { "id": "accent-bar", "type": "shape", "x": 60, "y": 300, "width": 120, "height": 12,
      "zIndex": 1, "editable": false, "shape": "rect", "fill": "{{accentColor}}", "cornerRadius": 6 },
    { "id": "quote-mark", "type": "text", "x": 60, "y": 120, "width": 300, "height": 200,
      "zIndex": 1, "editable": false, "text": "“", "fontFamily": "{{brandFont}}",
      "fontSize": 200, "fontWeight": 800, "direction": "ltr", "align": "start",
      "fill": "{{accentColor}}", "opacity": 0.35, "maxCharacters": 2 },
    { "id": "headline", "type": "text", "x": 60, "y": 360, "width": 960, "height": 400,
      "zIndex": 2, "editable": true, "text": "{{headline}}", "fontFamily": "{{brandFont}}",
      "fontSize": 60, "fontWeight": 700, "direction": "auto", "align": "start",
      "fill": "{{textColor}}", "maxCharacters": 180, "lineHeight": 1.4 },
    { "id": "body", "type": "text", "x": 60, "y": 800, "width": 960, "height": 120,
      "zIndex": 2, "editable": true, "text": "{{bodyText}}", "fontFamily": "{{brandFont}}",
      "fontSize": 34, "fontWeight": 400, "direction": "auto", "align": "start",
      "fill": "{{secondaryColor}}", "maxCharacters": 90 },
    { "id": "footer-band", "type": "shape", "x": 0, "y": 1160, "width": 1080, "height": 190,
      "zIndex": 1, "editable": false, "shape": "rect", "fill": "{{primaryColor}}" },
    { "id": "logo", "type": "logo", "x": 60, "y": 1200, "width": 110, "height": 110,
      "zIndex": 2, "editable": false, "src": "{{logoUrl}}", "fit": "contain" },
    { "id": "business-name", "type": "text", "x": 195, "y": 1228, "width": 600, "height": 56,
      "zIndex": 2, "editable": false, "text": "{{businessName}}", "fontFamily": "{{brandFont}}",
      "fontSize": 34, "fontWeight": 700, "direction": "auto", "align": "start",
      "fill": "#ffffff", "maxCharacters": 40 }
  ]
}
$$::jsonb)
on conflict (template_id, version) do nothing;

insert into public.template_services (template_id, service_id)
select '30000000-0000-0000-0000-000000000006', s.id
from public.services s
where s.vertical_id = '20000000-0000-0000-0000-000000000001'
  and s.key in ('cosmetic-dentistry', 'veneers', 'orthodontics')
on conflict do nothing;

-- 7) Before You Visit (checklist / education) --------------------------------

insert into public.templates
  (id, vertical_id, category_id, name, description, status, current_version,
   supported_languages, canvas_width, canvas_height)
values (
  '30000000-0000-0000-0000-000000000007',
  '20000000-0000-0000-0000-000000000001',
  (select id from public.template_categories where key = 'educational'
     and vertical_id = '20000000-0000-0000-0000-000000000001'),
  'Did You Know',
  'Bold educational fact with an accent panel — great for awareness posts.',
  'published', 1, array['ar','en'], 1080, 1350
)
on conflict (id) do nothing;

insert into public.template_versions (template_id, version, template_json)
values (
  '30000000-0000-0000-0000-000000000007', 1,
$$
{
  "schemaVersion": 1,
  "canvas": { "width": 1080, "height": 1350, "backgroundColor": "{{primaryColor}}" },
  "supportedLanguages": ["ar", "en"],
  "layers": [
    { "id": "panel", "type": "shape", "x": 70, "y": 240, "width": 940, "height": 870,
      "zIndex": 1, "editable": false, "shape": "rect", "fill": "{{backgroundColor}}", "cornerRadius": 40 },
    { "id": "kicker", "type": "text", "x": 110, "y": 300, "width": 860, "height": 80,
      "zIndex": 2, "editable": false, "text": { "en": "Did you know?", "ar": "هل تعلم؟" },
      "fontFamily": "{{brandFont}}", "fontSize": 44, "fontWeight": 700,
      "direction": "auto", "align": "start", "fill": "{{accentColor}}", "maxCharacters": 24 },
    { "id": "headline", "type": "text", "x": 110, "y": 400, "width": 860, "height": 340,
      "zIndex": 2, "editable": true, "text": "{{headline}}", "fontFamily": "{{brandFont}}",
      "fontSize": 66, "fontWeight": 800, "direction": "auto", "align": "start",
      "fill": "{{textColor}}", "maxCharacters": 120, "lineHeight": 1.3 },
    { "id": "body", "type": "text", "x": 110, "y": 780, "width": 860, "height": 280,
      "zIndex": 2, "editable": true, "text": "{{bodyText}}", "fontFamily": "{{brandFont}}",
      "fontSize": 38, "fontWeight": 400, "direction": "auto", "align": "start",
      "fill": "{{secondaryColor}}", "maxCharacters": 200, "lineHeight": 1.45 },
    { "id": "logo", "type": "logo", "x": 70, "y": 1170, "width": 96, "height": 96,
      "zIndex": 2, "editable": false, "src": "{{logoUrl}}", "fit": "contain" },
    { "id": "business-name", "type": "text", "x": 180, "y": 1198, "width": 600, "height": 50,
      "zIndex": 2, "editable": false, "text": "{{businessName}}", "fontFamily": "{{brandFont}}",
      "fontSize": 32, "fontWeight": 700, "direction": "auto", "align": "start",
      "fill": "#ffffff", "maxCharacters": 40 }
  ]
}
$$::jsonb)
on conflict (template_id, version) do nothing;

insert into public.template_services (template_id, service_id)
select '30000000-0000-0000-0000-000000000007', s.id
from public.services s
where s.vertical_id = '20000000-0000-0000-0000-000000000001'
  and s.key in ('cleaning-checkup', 'gum-treatment', 'pediatric-dentistry')
on conflict do nothing;

-- 8) New Patients Welcome ----------------------------------------------------

insert into public.templates
  (id, vertical_id, category_id, name, description, status, current_version,
   supported_languages, canvas_width, canvas_height)
values (
  '30000000-0000-0000-0000-000000000008',
  '20000000-0000-0000-0000-000000000001',
  (select id from public.template_categories where key = 'booking'
     and vertical_id = '20000000-0000-0000-0000-000000000001'),
  'New Patients Welcome',
  'Warm welcome with photo, headline and phone CTA for accepting new patients.',
  'published', 1, array['ar','en'], 1080, 1350
)
on conflict (id) do nothing;

insert into public.template_versions (template_id, version, template_json)
values (
  '30000000-0000-0000-0000-000000000008', 1,
$$
{
  "schemaVersion": 1,
  "canvas": { "width": 1080, "height": 1350, "backgroundColor": "{{backgroundColor}}" },
  "supportedLanguages": ["ar", "en"],
  "layers": [
    { "id": "hero", "type": "image", "x": 60, "y": 60, "width": 960, "height": 560,
      "zIndex": 1, "editable": true, "src": "{{generatedImage}}", "fit": "cover", "cornerRadius": 28 },
    { "id": "badge", "type": "shape", "x": 60, "y": 560, "width": 360, "height": 96,
      "zIndex": 2, "editable": false, "shape": "rect", "fill": "{{accentColor}}", "cornerRadius": 48 },
    { "id": "badge-text", "type": "text", "x": 60, "y": 582, "width": 360, "height": 56,
      "zIndex": 3, "editable": false, "text": { "en": "Now accepting", "ar": "نستقبل الآن" },
      "fontFamily": "{{brandFont}}", "fontSize": 34, "fontWeight": 700,
      "direction": "auto", "align": "center", "fill": "#ffffff", "maxCharacters": 20 },
    { "id": "headline", "type": "text", "x": 60, "y": 700, "width": 960, "height": 170,
      "zIndex": 2, "editable": true, "text": "{{headline}}", "fontFamily": "{{brandFont}}",
      "fontSize": 70, "fontWeight": 800, "direction": "auto", "align": "start",
      "fill": "{{primaryColor}}", "maxCharacters": 55 },
    { "id": "body", "type": "text", "x": 60, "y": 880, "width": 960, "height": 140,
      "zIndex": 2, "editable": true, "text": "{{bodyText}}", "fontFamily": "{{brandFont}}",
      "fontSize": 38, "fontWeight": 400, "direction": "auto", "align": "start",
      "fill": "{{textColor}}", "maxCharacters": 120, "lineHeight": 1.35 },
    { "id": "phone-pill", "type": "shape", "x": 60, "y": 1055, "width": 620, "height": 96,
      "zIndex": 2, "editable": false, "shape": "rect", "fill": "{{primaryColor}}", "cornerRadius": 48 },
    { "id": "phone", "type": "text", "x": 60, "y": 1080, "width": 620, "height": 56,
      "zIndex": 3, "editable": false, "text": "{{phone}}", "fontFamily": "{{brandFont}}",
      "fontSize": 42, "fontWeight": 700, "direction": "ltr", "align": "center",
      "fill": "#ffffff", "maxCharacters": 24 },
    { "id": "logo", "type": "logo", "x": 720, "y": 1050, "width": 100, "height": 100,
      "zIndex": 2, "editable": false, "src": "{{logoUrl}}", "fit": "contain" },
    { "id": "business-name", "type": "text", "x": 60, "y": 1200, "width": 960, "height": 50,
      "zIndex": 2, "editable": false, "text": "{{businessName}}", "fontFamily": "{{brandFont}}",
      "fontSize": 32, "fontWeight": 700, "direction": "auto", "align": "start",
      "fill": "{{secondaryColor}}", "maxCharacters": 40 }
  ]
}
$$::jsonb)
on conflict (template_id, version) do nothing;

insert into public.template_services (template_id, service_id)
select '30000000-0000-0000-0000-000000000008', s.id
from public.services s
where s.vertical_id = '20000000-0000-0000-0000-000000000001'
  and s.key in ('cleaning-checkup', 'dental-implants', 'orthodontics')
on conflict do nothing;

-- 9) Weekend Hours -----------------------------------------------------------

insert into public.templates
  (id, vertical_id, category_id, name, description, status, current_version,
   supported_languages, canvas_width, canvas_height)
values (
  '30000000-0000-0000-0000-000000000009',
  '20000000-0000-0000-0000-000000000001',
  (select id from public.template_categories where key = 'booking'
     and vertical_id = '20000000-0000-0000-0000-000000000001'),
  'Opening Hours',
  'Announce hours or availability with a bold split layout.',
  'published', 1, array['ar','en'], 1080, 1350
)
on conflict (id) do nothing;

insert into public.template_versions (template_id, version, template_json)
values (
  '30000000-0000-0000-0000-000000000009', 1,
$$
{
  "schemaVersion": 1,
  "canvas": { "width": 1080, "height": 1350, "backgroundColor": "{{secondaryColor}}" },
  "supportedLanguages": ["ar", "en"],
  "layers": [
    { "id": "top", "type": "shape", "x": 0, "y": 0, "width": 1080, "height": 620,
      "zIndex": 1, "editable": false, "shape": "rect", "fill": "{{primaryColor}}" },
    { "id": "clock", "type": "shape", "x": 440, "y": 150, "width": 200, "height": 200,
      "zIndex": 2, "editable": false, "shape": "ellipse", "fill": "{{accentColor}}" },
    { "id": "headline", "type": "text", "x": 90, "y": 380, "width": 900, "height": 180,
      "zIndex": 2, "editable": true, "text": "{{headline}}", "fontFamily": "{{brandFont}}",
      "fontSize": 68, "fontWeight": 800, "direction": "auto", "align": "center",
      "fill": "#ffffff", "maxCharacters": 50, "lineHeight": 1.2 },
    { "id": "body", "type": "text", "x": 120, "y": 720, "width": 840, "height": 260,
      "zIndex": 2, "editable": true, "text": "{{bodyText}}", "fontFamily": "{{brandFont}}",
      "fontSize": 46, "fontWeight": 700, "direction": "auto", "align": "center",
      "fill": "{{textColor}}", "maxCharacters": 160, "lineHeight": 1.5 },
    { "id": "cta-pill", "type": "shape", "x": 330, "y": 1030, "width": 420, "height": 92,
      "zIndex": 2, "editable": false, "shape": "rect", "fill": "{{accentColor}}", "cornerRadius": 46 },
    { "id": "cta", "type": "text", "x": 330, "y": 1054, "width": 420, "height": 54,
      "zIndex": 3, "editable": true, "text": "{{cta}}", "fontFamily": "{{brandFont}}",
      "fontSize": 38, "fontWeight": 700, "direction": "auto", "align": "center",
      "fill": "#ffffff", "maxCharacters": 22 },
    { "id": "business-name", "type": "text", "x": 90, "y": 1200, "width": 900, "height": 50,
      "zIndex": 2, "editable": false, "text": "{{businessName}}", "fontFamily": "{{brandFont}}",
      "fontSize": 32, "fontWeight": 700, "direction": "auto", "align": "center",
      "fill": "{{textColor}}", "maxCharacters": 40 }
  ]
}
$$::jsonb)
on conflict (template_id, version) do nothing;

insert into public.template_services (template_id, service_id)
select '30000000-0000-0000-0000-000000000009', s.id
from public.services s
where s.vertical_id = '20000000-0000-0000-0000-000000000001'
  and s.key in ('cleaning-checkup', 'root-canal')
on conflict do nothing;

-- 10) Implant Feature --------------------------------------------------------

insert into public.templates
  (id, vertical_id, category_id, name, description, status, current_version,
   supported_languages, canvas_width, canvas_height)
values (
  '30000000-0000-0000-0000-00000000000a',
  '20000000-0000-0000-0000-000000000001',
  (select id from public.template_categories where key = 'promotions'
     and vertical_id = '20000000-0000-0000-0000-000000000001'),
  'Treatment Feature',
  'Full-bleed hero with a bottom gradient panel for a single treatment focus.',
  'published', 1, array['ar','en'], 1080, 1350
)
on conflict (id) do nothing;

insert into public.template_versions (template_id, version, template_json)
values (
  '30000000-0000-0000-0000-00000000000a', 1,
$$
{
  "schemaVersion": 1,
  "canvas": { "width": 1080, "height": 1350, "backgroundColor": "{{primaryColor}}" },
  "supportedLanguages": ["ar", "en"],
  "layers": [
    { "id": "hero", "type": "image", "x": 0, "y": 0, "width": 1080, "height": 900,
      "zIndex": 1, "editable": true, "src": "{{generatedImage}}", "fit": "cover" },
    { "id": "panel", "type": "shape", "x": 0, "y": 760, "width": 1080, "height": 590,
      "zIndex": 2, "editable": false, "shape": "rect", "fill": "{{primaryColor}}" },
    { "id": "headline", "type": "text", "x": 70, "y": 830, "width": 940, "height": 170,
      "zIndex": 3, "editable": true, "text": "{{headline}}", "fontFamily": "{{brandFont}}",
      "fontSize": 72, "fontWeight": 800, "direction": "auto", "align": "start",
      "fill": "#ffffff", "maxCharacters": 50, "lineHeight": 1.2 },
    { "id": "body", "type": "text", "x": 70, "y": 1010, "width": 940, "height": 140,
      "zIndex": 3, "editable": true, "text": "{{bodyText}}", "fontFamily": "{{brandFont}}",
      "fontSize": 38, "fontWeight": 400, "direction": "auto", "align": "start",
      "fill": "#ffffff", "maxCharacters": 130, "lineHeight": 1.35 },
    { "id": "cta-pill", "type": "shape", "x": 70, "y": 1180, "width": 400, "height": 92,
      "zIndex": 3, "editable": false, "shape": "rect", "fill": "{{accentColor}}", "cornerRadius": 46 },
    { "id": "cta", "type": "text", "x": 70, "y": 1204, "width": 400, "height": 54,
      "zIndex": 4, "editable": true, "text": "{{cta}}", "fontFamily": "{{brandFont}}",
      "fontSize": 38, "fontWeight": 700, "direction": "auto", "align": "center",
      "fill": "#ffffff", "maxCharacters": 22 },
    { "id": "phone", "type": "text", "x": 520, "y": 1200, "width": 490, "height": 56,
      "zIndex": 3, "editable": false, "text": "{{phone}}", "fontFamily": "{{brandFont}}",
      "fontSize": 38, "fontWeight": 700, "direction": "ltr", "align": "end",
      "fill": "#ffffff", "maxCharacters": 24 }
  ]
}
$$::jsonb)
on conflict (template_id, version) do nothing;

insert into public.template_services (template_id, service_id)
select '30000000-0000-0000-0000-00000000000a', s.id
from public.services s
where s.vertical_id = '20000000-0000-0000-0000-000000000001'
  and s.key in ('dental-implants', 'root-canal', 'dentures')
on conflict do nothing;

-- 11) Ramadan / Seasonal Greeting 2 -----------------------------------------

insert into public.templates
  (id, vertical_id, category_id, name, description, status, current_version,
   supported_languages, canvas_width, canvas_height)
values (
  '30000000-0000-0000-0000-00000000000b',
  '20000000-0000-0000-0000-000000000001',
  (select id from public.template_categories where key = 'seasonal'
     and vertical_id = '20000000-0000-0000-0000-000000000001'),
  'Elegant Greeting',
  'Minimal centered greeting on a brand field with a decorative frame.',
  'published', 1, array['ar','en'], 1080, 1350
)
on conflict (id) do nothing;

insert into public.template_versions (template_id, version, template_json)
values (
  '30000000-0000-0000-0000-00000000000b', 1,
$$
{
  "schemaVersion": 1,
  "canvas": { "width": 1080, "height": 1350, "backgroundColor": "{{primaryColor}}" },
  "supportedLanguages": ["ar", "en"],
  "layers": [
    { "id": "frame", "type": "shape", "x": 80, "y": 80, "width": 920, "height": 1190,
      "zIndex": 1, "editable": false, "shape": "rect", "fill": "{{primaryColor}}", "cornerRadius": 24 },
    { "id": "frame-accent", "type": "shape", "x": 110, "y": 110, "width": 860, "height": 1130,
      "zIndex": 1, "editable": false, "shape": "rect", "fill": "{{secondaryColor}}", "opacity": 0.4, "cornerRadius": 16 },
    { "id": "logo", "type": "logo", "x": 460, "y": 260, "width": 160, "height": 160,
      "zIndex": 2, "editable": false, "src": "{{logoUrl}}", "fit": "contain" },
    { "id": "headline", "type": "text", "x": 140, "y": 520, "width": 800, "height": 260,
      "zIndex": 2, "editable": true, "text": "{{headline}}", "fontFamily": "{{brandFont}}",
      "fontSize": 74, "fontWeight": 800, "direction": "auto", "align": "center",
      "fill": "#ffffff", "maxCharacters": 60, "lineHeight": 1.25 },
    { "id": "body", "type": "text", "x": 170, "y": 820, "width": 740, "height": 160,
      "zIndex": 2, "editable": true, "text": "{{bodyText}}", "fontFamily": "{{brandFont}}",
      "fontSize": 40, "fontWeight": 400, "direction": "auto", "align": "center",
      "fill": "#ffffff", "maxCharacters": 130, "lineHeight": 1.4 },
    { "id": "business-name", "type": "text", "x": 140, "y": 1120, "width": 800, "height": 60,
      "zIndex": 2, "editable": false, "text": "{{businessName}}", "fontFamily": "{{brandFont}}",
      "fontSize": 38, "fontWeight": 700, "direction": "auto", "align": "center",
      "fill": "{{accentColor}}", "maxCharacters": 40 }
  ]
}
$$::jsonb)
on conflict (template_id, version) do nothing;

-- 12) Follow Us / Brand Awareness -------------------------------------------

insert into public.templates
  (id, vertical_id, category_id, name, description, status, current_version,
   supported_languages, canvas_width, canvas_height)
values (
  '30000000-0000-0000-0000-00000000000c',
  '20000000-0000-0000-0000-000000000001',
  (select id from public.template_categories where key = 'branding'
     and vertical_id = '20000000-0000-0000-0000-000000000001'),
  'Follow Us',
  'Simple brand-awareness card driving follows, with website and handle.',
  'published', 1, array['ar','en'], 1080, 1350
)
on conflict (id) do nothing;

insert into public.template_versions (template_id, version, template_json)
values (
  '30000000-0000-0000-0000-00000000000c', 1,
$$
{
  "schemaVersion": 1,
  "canvas": { "width": 1080, "height": 1350, "backgroundColor": "{{backgroundColor}}" },
  "supportedLanguages": ["ar", "en"],
  "layers": [
    { "id": "top-band", "type": "shape", "x": 0, "y": 0, "width": 1080, "height": 460,
      "zIndex": 1, "editable": false, "shape": "rect", "fill": "{{primaryColor}}" },
    { "id": "logo", "type": "logo", "x": 440, "y": 130, "width": 200, "height": 200,
      "zIndex": 2, "editable": false, "src": "{{logoUrl}}", "fit": "contain" },
    { "id": "headline", "type": "text", "x": 90, "y": 560, "width": 900, "height": 200,
      "zIndex": 2, "editable": true, "text": "{{headline}}", "fontFamily": "{{brandFont}}",
      "fontSize": 70, "fontWeight": 800, "direction": "auto", "align": "center",
      "fill": "{{textColor}}", "maxCharacters": 60, "lineHeight": 1.25 },
    { "id": "body", "type": "text", "x": 140, "y": 800, "width": 800, "height": 140,
      "zIndex": 2, "editable": true, "text": "{{bodyText}}", "fontFamily": "{{brandFont}}",
      "fontSize": 40, "fontWeight": 400, "direction": "auto", "align": "center",
      "fill": "{{secondaryColor}}", "maxCharacters": 120, "lineHeight": 1.4 },
    { "id": "website-pill", "type": "shape", "x": 290, "y": 1020, "width": 500, "height": 92,
      "zIndex": 2, "editable": false, "shape": "rect", "fill": "{{accentColor}}", "cornerRadius": 46 },
    { "id": "website", "type": "text", "x": 290, "y": 1044, "width": 500, "height": 54,
      "zIndex": 3, "editable": false, "text": "{{website}}", "fontFamily": "{{brandFont}}",
      "fontSize": 34, "fontWeight": 700, "direction": "ltr", "align": "center",
      "fill": "#ffffff", "maxCharacters": 40 },
    { "id": "business-name", "type": "text", "x": 90, "y": 1180, "width": 900, "height": 50,
      "zIndex": 2, "editable": false, "text": "{{businessName}}", "fontFamily": "{{brandFont}}",
      "fontSize": 32, "fontWeight": 700, "direction": "auto", "align": "center",
      "fill": "{{textColor}}", "maxCharacters": 40 }
  ]
}
$$::jsonb)
on conflict (template_id, version) do nothing;
