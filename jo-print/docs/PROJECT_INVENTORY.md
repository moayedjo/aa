# JO-PRINT — Project Inventory

## Platform Overview
JO-PRINT (جو برنت) is an Arabic-first digital printing platform for Jordan. It allows users to upload files for printing, order custom printed products, access book summaries, find tutors, and locate partner print shops.

## Module Map

| Module | Route | Status |
|--------|-------|--------|
| Homepage | / | ✅ Built |
| Printing Services | /printing | ✅ Built |
| File Upload | /printing/upload | ✅ Built |
| Store | /store | ✅ Built |
| Product Detail | /store/[id] | ✅ Built |
| Book Summaries | /books | ✅ Built |
| Teachers | /teachers | ✅ Built |
| Print Shops | /shops | ✅ Built |
| Cart | /cart | ✅ Built |
| Checkout | /checkout | ✅ Built |
| Order Tracking | /orders/track | ✅ Built |
| Auth | /auth | ✅ Built |
| Account | /account | ✅ Built |

## Component Inventory

### Layout
- Header — sticky RTL header with logo, nav, cart icon, login button
- Footer — links, contact info, brand
- MobileNav — drawer on mobile

### UI Primitives
- Button — variant (primary/secondary/outline/ghost), size (sm/md/lg)
- Badge — status colors
- Card — base card with optional hover
- Input — RTL input with label/error

### Home Sections
- HeroSection — gradient hero with CTAs
- ServicesSection — 4 module cards
- HowItWorksSection — 3-step explainer
- FeaturedProducts — popular products grid

### Printing
- UploadZone — drag & drop file upload
- PrintOptions — size/color/sides/paper/copies with live pricing

### Store
- ProductCard — product tile with price
- ProductFilters — category sidebar filter
- AddToCartButton — client-side add to cart

## Data Files
- lib/data/products.ts — 12 products
- lib/data/categories.ts — 4 categories
- lib/data/books.ts — 6 book summaries
- lib/data/teachers.ts — 4 tutors
- lib/data/shops.ts — 4 print shops

## Type System
All types defined in lib/types.ts: Product, Category, Book, Teacher, PrintShop, CartItem, Order, PrintOptions, OrderStatus
