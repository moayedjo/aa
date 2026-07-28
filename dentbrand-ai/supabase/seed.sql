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
