# JO-PRINT — Project Audit

## Code Quality

### TypeScript
- Strict mode enabled
- No `any` types used
- `import type` used for type-only imports
- All component props properly typed

### RTL Compliance
- `<html lang="ar" dir="rtl">` on root
- All layouts tested for RTL flow
- Arabic text throughout (no Lorem Ipsum)
- Currency displayed as "د.أ" (JOD)

### Performance
- No external image URLs — all placeholders use CSS/emoji
- Google Fonts loaded via <link> in layout head
- Server Components used by default; "use client" only where interaction needed

### Accessibility
- Semantic HTML elements
- Proper label associations on forms
- Focus states on interactive elements

## Known Limitations
1. No real backend — all data is static
2. Cart state is local component state (not persisted)
3. Auth is UI-only (no actual authentication)
4. File upload is UI-only (no actual file processing)
5. Order tracking shows mock data
6. Map on shops page is a placeholder

## Files Requiring "use client"
- Header (useState for mobile menu)
- Upload page (multi-step form)
- Store page (filter state)
- Books page (filter state)
- Teachers page (filter state)
- Cart page (quantity management)
- Checkout page (form state)
- Order tracking page (search state)
- Auth page (tab toggle)
- Account page (tab toggle)
- UploadZone component
- PrintOptions component
- ProductFilters component
- AddToCartButton component
