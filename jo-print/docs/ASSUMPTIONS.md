# JO-PRINT — Assumptions & Decisions

## Business Assumptions

1. **Currency**: All prices in Jordanian Dinar (JOD), displayed as "د.أ"
2. **Language**: Arabic-first; English only for technical terms (PDF, A4, etc.)
3. **Market**: Jordan-specific — Amman, Zarqa, Irbid are key cities
4. **Payment**: Cash on delivery is primary; card payment secondary
5. **Delivery**: 24-48 hours standard; free shipping over 20 د.أ

## Technical Decisions

1. **No authentication library**: Auth UI only — backend integration (Supabase/Firebase/custom) to be added later
2. **Static data**: All product/teacher/shop data hardcoded; replace with API calls in production
3. **No state management**: Using React local state; add Zustand/Context for cart persistence
4. **No real file upload**: UploadZone captures file client-side; needs upload-to-storage integration
5. **Pricing engine**: Simplified calculation; actual pricing should factor in vendor costs

## Design Decisions

1. **No stock images**: Using emoji + CSS color backgrounds as product image placeholders
2. **Tajawal font**: Best Arabic Google Font for UI, supports weights 400/500/700
3. **Mobile-first**: All layouts designed for mobile, enhanced for desktop
4. **RTL only**: No LTR mode needed for this Arabic-first platform

## Data Assumptions

- Products: 12 representative items covering printing and store categories
- Books: Tawjihi and secondary school subjects (Jordan curriculum)
- Teachers: Based in Amman, Zarqa — Jordan's main population centers
- Shops: Mix of Amman, Zarqa, Irbid locations
