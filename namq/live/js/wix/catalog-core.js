// Declarations of catalog-core.ts: what this file exports, their arguments and what they return.
// import type { Availability, Breadcrumb, Category, Facet, FacetData, ProductDetail, ProductModifier, ProductOption, ProductSummary, ProductVariant, SubscriptionPlan, VariantInventory } from "./storefront-types.js";
// export type Raw = Record<string, any>;
// export type ImgSrc = (value: any, width: number, height: number) => string;
// export type MediaKey = (value: any) => string;
// export declare const LIST_FIELDS: readonly ["CURRENCY", "MEDIA_ITEMS_INFO", "MIN_PRICE_VARIANT", "DISCOUNT_INFO"];
// export declare const DETAIL_FIELDS: readonly ["CURRENCY", "MEDIA_ITEMS_INFO", "MIN_PRICE_VARIANT", "DISCOUNT_INFO", "PLAIN_DESCRIPTION", "VARIANT_OPTION_CHOICE_NAMES", "INFO_SECTION", "INFO_SECTION_PLAIN_DESCRIPTION", "SUBSCRIPTION_PRICES_INFO", "BREADCRUMBS_INFO", "DIRECT_CATEGORIES_INFO", "PRODUCT_CHOICES_MEDIA_REFERENCES"];
// export declare const STORES_TREE: {
//     readonly appNamespace: "@wix/stores";
//     readonly treeKey: null;
// };
// export declare const CATALOG_SORTS: {
//     readonly featured: {
//         readonly label: "Default order";
//     };
//     readonly priceAsc: {
//         readonly label: "Price: low to high";
//     };
//     readonly priceHigh: {
//         readonly label: "Price: high to low";
//     };
//     readonly name: {
//         readonly label: "Name: A–Z";
//     };
//     readonly nameDesc: {
//         readonly label: "Name: Z–A";
//     };
//     readonly newest: {
//         readonly label: "Newest";
//     };
// };
// export type CatalogSort = keyof typeof CATALOG_SORTS;
// export declare const SORT_FIELDS: Partial<Record<CatalogSort, {
//     fieldName: string;
//     order: "ASC" | "DESC";
// }[]>>;
// export declare const OPTION_CHOICE_FIELD = "options.choicesSettings.choices.choiceId";
// export declare const MODIFIER_CHOICE_FIELD = "modifiers.choicesSettings.choices.choiceId";
// export interface FacetSelection {
//     id: string;
//     kind: "option" | "modifier";
//     choiceIds: string[];
// }
// export interface CatalogSearchOptions {
//     limit?: number;
//     cursor?: string | null;
//     categoryId?: string | null;
//     sort?: CatalogSort;
//     minPrice?: number | string;
//     maxPrice?: number | string;
//     inStockOnly?: boolean;
//     search?: string;
//     facetSelections?: FacetSelection[];
// }
// export declare function priceBound(value: number | string | undefined, name: string): number | undefined;
// export declare function catalogFilter({ categoryId, minPrice, maxPrice, inStockOnly, facetSelections }?: CatalogSearchOptions): Raw;
// export declare function searchQuery(o: CatalogSearchOptions): Raw;
// export declare function pageInfo(res: Raw | null | undefined): {
//     nextCursor: string | null;
//     hasMore: boolean;
// };
// export declare const FACET_AGGREGATIONS: Raw[];
// export declare function facetSearchBody(categoryId?: string | null): Raw;
// export interface FacetAggregates {
//     minPrice: number | null;
//     maxPrice: number | null;
//     optionIds: string[];
//     modifierIds: string[];
//     choiceCounts: Record<string, number>;
// }
// export declare function readFacetAggregates(res: Raw | null | undefined): FacetAggregates;
// export declare function facetCustomizationIds(agg: FacetAggregates): string[];
// export declare function toFacet(customization: Raw, kind: Facet["kind"], choiceCounts: Record<string, number>): Facet;
// export declare function toFacetData(agg: FacetAggregates, customizations: Raw[]): FacetData;
// export declare function expandFacetChoiceIds(facet: Facet | undefined, choiceIds: string[]): string[];
// export declare function sellingPrice(price: Raw | undefined): {
//     current?: Raw;
//     original?: Raw;
// };
// export declare function strike(original: Raw | undefined, current: Raw | undefined): string | null;
// export declare function ribbonsOf(raw: Raw): string[];
// export declare function toAvailability(raw: Raw): Availability;
// export declare function isPreorderProduct(raw: Raw): boolean;
// export declare function mediaEntries(raw: Raw, mediaKey: MediaKey): unknown[];
// export declare function toSummary(raw: Raw, imgSrc: ImgSrc, mediaKey: MediaKey): ProductSummary;
// export declare function toOptions(raw: Raw, imgSrc?: ImgSrc): ProductOption[];
// export declare function toModifiers(raw: Raw): ProductModifier[];
// export declare function planTerms(frequency: string | null, interval: number, billingCycles: number | null): string;
// export declare function toSubscriptionPlans(raw: Raw): SubscriptionPlan[];
// export declare function toVariants(raw: Raw, imgSrc: ImgSrc): ProductVariant[];
// export declare function toBreadcrumbs(info: Raw | undefined): Breadcrumb[];
// export declare function toDetail(raw: Raw, imgSrc: ImgSrc, mediaKey: MediaKey): ProductDetail;
// export declare function toCategory(raw: Raw, imgSrc: ImgSrc): Category;
// export declare function toInventory(items: Raw[]): Record<string, VariantInventory>;
// export declare function mergeInventory(variants: ProductVariant[], inventory: Record<string, VariantInventory>): ProductVariant[];
// export declare function resolveVariant(detail: ProductDetail, selections: Record<string, string>): ProductVariant | null;
// export declare function choiceAvailability(detail: ProductDetail, selections: Record<string, string>): Record<string, Record<string, {
//     inStock: boolean;
//     exists: boolean;
// }>>;
// export declare const MAX_QUANTITY = 99999;
// export declare function maxPurchasable(variant: ProductVariant | null): number;
const id = (raw) => raw?._id ?? raw?.id ?? "";
// Requested on every product read. CURRENCY → formattedAmount (without it prices render as bare
// numbers); MEDIA_ITEMS_INFO → the gallery; MIN_PRICE_VARIANT + DISCOUNT_INFO → the cheapest variant
// with its discounted price and the discount rule names: a card's real price and the direct-add
// variant id, no per-product fetch.
export const LIST_FIELDS = ["CURRENCY", "MEDIA_ITEMS_INFO", "MIN_PRICE_VARIANT", "DISCOUNT_INFO"];
// The detail read adds the HTML description, the variants (VARIANT_OPTION_CHOICE_NAMES — without it
// variantsInfo is null), the info sections with HTML bodies, each variant's plan prices
// (SUBSCRIPTION_PRICES_INFO), and the category path (BREADCRUMBS_INFO, DIRECT_CATEGORIES_INFO).
export const DETAIL_FIELDS = [
    ...LIST_FIELDS,
    "PLAIN_DESCRIPTION",
    "VARIANT_OPTION_CHOICE_NAMES",
    "INFO_SECTION",
    "INFO_SECTION_PLAIN_DESCRIPTION",
    "SUBSCRIPTION_PRICES_INFO",
    "BREADCRUMBS_INFO",
    "DIRECT_CATEGORIES_INFO",
    // the gallery image linked to each option choice (the dashboard's "image per colour"); variant
    // media is derived from it at creation only, so the choice is the source of truth
    "PRODUCT_CHOICES_MEDIA_REFERENCES",
];
/** Stores' category tree — every Categories API call names it. */
export const STORES_TREE = { appNamespace: "@wix/stores", treeKey: null };
// ---- sort + filter ---------------------------------------------------------------------------------
export const CATALOG_SORTS = {
    featured: { label: "Default order" }, // the catalog's own order — no sort sent, and NOT a sales ranking
    priceAsc: { label: "Price: low to high" },
    priceHigh: { label: "Price: high to low" },
    name: { label: "Name: A–Z" },
    nameDesc: { label: "Name: Z–A" },
    newest: { label: "Newest" },
};
export const SORT_FIELDS = {
    priceAsc: [{ fieldName: "actualPriceRange.minValue.amount", order: "ASC" }, { fieldName: "name", order: "ASC" }],
    priceHigh: [{ fieldName: "actualPriceRange.minValue.amount", order: "DESC" }, { fieldName: "name", order: "ASC" }],
    name: [{ fieldName: "name", order: "ASC" }],
    nameDesc: [{ fieldName: "name", order: "DESC" }],
    newest: [{ fieldName: "createdDate", order: "DESC" }, { fieldName: "name", order: "ASC" }],
};
// The search fields a product carries its customization ids under — the same paths aggregate
// (facets) and filter (selection), so a facet always filters on the field it was counted from.
export const OPTION_CHOICE_FIELD = "options.choicesSettings.choices.choiceId";
export const MODIFIER_CHOICE_FIELD = "modifiers.choicesSettings.choices.choiceId";
export function priceBound(value, name) {
    if (value == null || value === "")
        return undefined;
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0)
        throw new Error(`${name} must be a non-negative number.`);
    return n;
}
/**
 * The filter every catalog read shares (the page, its count, the facets) — one place, so they
 * can't drift. Search rejects two operators in ONE field object: price bounds are separate
 * conditions joined by $and. Category: `allCategoriesInfo.categories` with `$matchItems` on the
 * id (includes parent categories); never `$hasSome`, never V1 `collectionIds`. The price bounds
 * bracket the product's RANGE: its minimum at least `minPrice`, its maximum at most `maxPrice` —
 * a "$10–$50" filter must not admit a $12–$400 product. Facets discover PRODUCTS carrying a
 * choice; the picker / PDP still resolves the variant.
 */
export function catalogFilter({ categoryId, minPrice, maxPrice, inStockOnly = false, facetSelections = [] } = {}) {
    const min = priceBound(minPrice, "minPrice"), max = priceBound(maxPrice, "maxPrice");
    if (min !== undefined && max !== undefined && min > max)
        throw new Error("minPrice must not exceed maxPrice.");
    const and = [{ visible: true }];
    if (categoryId)
        and.push({ "allCategoriesInfo.categories": { $matchItems: [{ id: categoryId }] } });
    if (min !== undefined)
        and.push({ "actualPriceRange.minValue.amount": { $gte: String(min) } });
    if (max !== undefined)
        and.push({ "actualPriceRange.maxValue.amount": { $lte: String(max) } });
    if (inStockOnly)
        and.push({ "inventory.availabilityStatus": { $eq: "IN_STOCK" } });
    for (const f of facetSelections) {
        if (!f.choiceIds.length)
            continue;
        and.push({ [f.kind === "modifier" ? MODIFIER_CHOICE_FIELD : OPTION_CHOICE_FIELD]: { $hasSome: f.choiceIds } });
    }
    return { $and: and };
}
/** The full Search Products body (minus fields) for a page; a cursor request carries ONLY cursorPaging. */
export function searchQuery(o) {
    const { limit = 24, cursor, sort = "featured", search = "" } = o;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
        throw new Error("limit must be between 1 and 100.");
    const paging = { cursorPaging: { limit, ...(cursor ? { cursor } : {}) } };
    if (cursor)
        return paging;
    if (!(sort in CATALOG_SORTS))
        throw new Error("Unsupported catalog sort.");
    if (search.trim().length > 100)
        throw new Error("Search must be at most 100 characters.");
    return {
        ...paging,
        filter: catalogFilter(o),
        ...(SORT_FIELDS[sort] ? { sort: SORT_FIELDS[sort] } : {}),
        ...(search.trim() ? { search: { expression: search.trim(), fields: ["name"] } } : {}),
    };
}
/** Read a search response's paging: `hasNext` is authoritative, the cursor is what continues. */
export function pageInfo(res) {
    const nextCursor = res?.pagingMetadata?.cursors?.next ?? null;
    const hasNext = res?.pagingMetadata?.hasNext;
    return { nextCursor, hasMore: typeof hasNext === "boolean" ? hasNext && !!nextCursor : !!nextCursor };
}
// ---- facets (aggregations + customizations) ---------------------------------------------------------
// The aggregations-only search that discovers a scope's filters: price bounds as scalars, the
// option/modifier ids and their choice ids as value buckets with counts. `cursorPaging.limit: 0`
// returns no products — the whole catalog is summarised in one call, however many products.
export const FACET_AGGREGATIONS = [
    { name: "min_price", type: "SCALAR", fieldPath: "actualPriceRange.minValue.amount", scalar: { type: "MIN" } },
    { name: "max_price", type: "SCALAR", fieldPath: "actualPriceRange.maxValue.amount", scalar: { type: "MAX" } },
    { name: "options", type: "VALUE", fieldPath: "options.id", value: { limit: 1000, sortType: "COUNT", sortDirection: "DESC" } },
    { name: "options_with_choice", type: "VALUE", fieldPath: OPTION_CHOICE_FIELD, value: { limit: 20000, sortType: "COUNT", sortDirection: "DESC" } },
    { name: "modifiers", type: "VALUE", fieldPath: "modifiers.id", value: { limit: 1000, sortType: "COUNT", sortDirection: "DESC" } },
    { name: "modifiers_with_choice", type: "VALUE", fieldPath: MODIFIER_CHOICE_FIELD, value: { limit: 20000, sortType: "COUNT", sortDirection: "DESC" } },
];
/** The Search Products body that returns only the aggregations of a scope. */
export function facetSearchBody(categoryId) {
    return { filter: catalogFilter({ categoryId }), cursorPaging: { limit: 0 }, aggregations: FACET_AGGREGATIONS };
}
export function readFacetAggregates(res) {
    const byName = new Map();
    for (const r of (res?.aggregationData?.results ?? []))
        if (r?.name)
            byName.set(r.name, r);
    const ids = (name) => (byName.get(name)?.values?.results ?? []).map((b) => b?.value).filter((v) => typeof v === "string" && v.length > 0);
    const counts = {};
    for (const name of ["options_with_choice", "modifiers_with_choice"]) {
        for (const b of (byName.get(name)?.values?.results ?? []))
            if (typeof b?.value === "string" && typeof b?.count === "number")
                counts[b.value] = b.count;
    }
    const scalar = (name) => {
        const v = byName.get(name)?.scalar?.value;
        return typeof v === "number" && Number.isFinite(v) ? v : null;
    };
    return { minPrice: scalar("min_price"), maxPrice: scalar("max_price"), optionIds: ids("options"), modifierIds: ids("modifiers"), choiceCounts: counts };
}
/** Every customization id the facets need names, colors and choice order for. */
export function facetCustomizationIds(agg) {
    return [...new Set([...agg.optionIds, ...agg.modifierIds])];
}
const numeric = (s) => {
    const t = s.trim();
    if (!t)
        return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
};
// Names sort case-insensitively, numbers first and numerically ("2", "10", "L").
const byNameNumericFirst = (items, name) => [...items].sort((a, b) => {
    const na = numeric(name(a)), nb = numeric(name(b));
    if (na !== null && nb !== null)
        return na - nb;
    if (na !== null)
        return -1;
    if (nb !== null)
        return 1;
    return name(a).toLowerCase().localeCompare(name(b).toLowerCase());
});
/**
 * One facet from a customization entity and the counts the aggregation gave its choices: only
 * choices some product in the scope carries; a linked choice ("Light red", `primaryChoiceIds`)
 * folds into its primary with its count and rides along as a childId when the primary is picked;
 * order per the merchant's `choicesSettings.sortOrder` (BY_NAME, BY_PRODUCT_COUNT, MANUAL; the
 * default is name for text, count for swatches).
 */
export function toFacet(customization, kind, choiceCounts) {
    const all = customization.choicesSettings?.choices ?? [];
    const parentOf = new Map(); // childId -> primary ids
    for (const c of all)
        if (Array.isArray(c.primaryChoiceIds) && c.primaryChoiceIds.length)
            parentOf.set(id(c), c.primaryChoiceIds);
    const choices = new Map();
    const choiceOf = (c) => ({ id: id(c), name: c.name ?? "", colorCode: c.colorCode ?? null, count: 0, childIds: [] });
    for (const c of all) {
        const count = choiceCounts[id(c)] ?? 0;
        const primaries = parentOf.get(id(c));
        if (primaries) {
            if (!count)
                continue;
            for (const pid of primaries) {
                const primary = all.find((p) => id(p) === pid);
                if (!primary)
                    continue;
                const entry = choices.get(pid) ?? choiceOf(primary);
                entry.count += count;
                entry.childIds.push(id(c));
                choices.set(pid, entry);
            }
            continue;
        }
        if (!count && !choices.has(id(c)))
            continue;
        const entry = choices.get(id(c)) ?? choiceOf(c);
        entry.count += count;
        choices.set(id(c), entry);
    }
    // a primary that only got children (no own count) surfaces through them above; drop empties
    let list = [...choices.values()].filter((c) => c.id && c.count > 0);
    const isColor = customization.customizationRenderType === "SWATCH_CHOICES";
    const order = customization.choicesSettings?.sortOrder ?? "DEFAULT";
    if (order === "BY_NAME" || (order === "DEFAULT" && !isColor))
        list = byNameNumericFirst(list, (c) => c.name);
    else if (order === "BY_PRODUCT_COUNT" || (order === "DEFAULT" && parentOf.size > 0))
        list = [...list].sort((a, b) => b.count - a.count);
    else if (order === "MANUAL") {
        const pos = new Map(all.map((c, i) => [id(c), i]));
        list = [...list].sort((a, b) => (pos.get(a.id) ?? 1e9) - (pos.get(b.id) ?? 1e9));
    }
    return { id: id(customization), name: customization.name ?? "", kind, isColor, choices: list };
}
/**
 * Facets + price bounds from the aggregations and the customization entities they named. Free-text
 * customizations never arrive (the query excludes them); a facet with one choice narrows nothing
 * and is dropped; swatch facets first, then text, each by name.
 */
export function toFacetData(agg, customizations) {
    const byId = new Map(customizations.map((c) => [id(c), c]));
    const build = (ids, kind) => ids.flatMap((cid) => {
        const c = byId.get(cid);
        if (!c || c.customizationRenderType === "FREE_TEXT")
            return [];
        const f = toFacet(c, kind, agg.choiceCounts);
        return f.choices.length > 1 ? [f] : [];
    });
    const facets = [...build(agg.optionIds, "option"), ...build(agg.modifierIds, "modifier")];
    const swatches = byNameNumericFirst(facets.filter((f) => f.isColor), (f) => f.name);
    const texts = byNameNumericFirst(facets.filter((f) => !f.isColor), (f) => f.name);
    const lo = agg.minPrice, hi = agg.maxPrice;
    return {
        facets: [...swatches, ...texts],
        priceRange: lo !== null && hi !== null && hi > lo ? { min: Math.floor(lo), max: Math.ceil(hi) } : null,
    };
}
/** The ids a selection sends for a facet: each picked choice plus the linked choices folded under it. */
export function expandFacetChoiceIds(facet, choiceIds) {
    const out = new Set();
    for (const cid of choiceIds) {
        out.add(cid);
        for (const child of facet?.choices.find((c) => c.id === cid)?.childIds ?? [])
            out.add(child);
    }
    return [...out];
}
// ---- price rules ----------------------------------------------------------------------------------
/**
 * The price the buyer pays and the price to strike — exact precedence, shared by cards and
 * variants. An automatic discount (priceAfterDiscount) wins and strikes the regular actualPrice;
 * else actualPrice with the merchant's compareAtPrice as the "was". `!== undefined` on purpose:
 * a discounted price of 0 is a real price.
 */
export function sellingPrice(price) {
    if (price?.priceAfterDiscount !== undefined)
        return { current: price.priceAfterDiscount, original: price.actualPrice };
    return { current: price?.actualPrice, original: price?.compareAtPrice };
}
/** The struck price only when it is real and higher than what the buyer pays. */
export function strike(original, current) {
    const o = Number(original?.amount), c = Number(current?.amount);
    return original?.formattedAmount && Number.isFinite(o) && Number.isFinite(c) && o > c ? original.formattedAmount : null;
}
/** Every merchant ribbon, primary first, de-duplicated. A ribbon is a label, never proof of a price. */
export function ribbonsOf(raw) {
    return [raw.ribbon?.name, ...(raw.additionalRibbons ?? []).map((r) => r?.name)]
        .filter((n, i, all) => typeof n === "string" && n.length > 0 && all.indexOf(n) === i);
}
export function toAvailability(raw) {
    const s = raw.inventory?.availabilityStatus;
    return s === "OUT_OF_STOCK" || s === "PARTIALLY_OUT_OF_STOCK" ? s : "IN_STOCK";
}
/**
 * The product-level pre-order state: every variant pre-orderable, or some are and the product
 * is out of stock (`inventory.preorderAvailability`). Older responses without that field fall
 * back to `preorderStatus`.
 */
export function isPreorderProduct(raw) {
    const availability = toAvailability(raw);
    const pa = raw.inventory?.preorderAvailability;
    if (pa)
        return pa === "ALL_VARIANTS" || (pa === "SOME_VARIANTS" && availability === "OUT_OF_STOCK");
    return raw.inventory?.preorderStatus === "ENABLED" && availability === "OUT_OF_STOCK";
}
/**
 * Every distinct media entry, main first, keyed on identity — two scaled URLs of one photo are
 * ONE entry (the "two thumbnails for the same image" bug). Shared by the tile and the PDP.
 */
export function mediaEntries(raw, mediaKey) {
    const out = [];
    const seen = new Set();
    for (const m of [raw.media?.main, ...(raw.media?.itemsInfo?.items ?? [])]) {
        const v = m?.image ?? m;
        const k = mediaKey(v);
        if (!k || seen.has(k))
            continue;
        seen.add(k);
        out.push(v);
    }
    return out;
}
const visibleSubscriptions = (raw) => (raw.subscriptionDetails?.subscriptions ?? []).filter((s) => s.visible !== false);
// ---- DTO mappers -----------------------------------------------------------------------------------
export function toSummary(raw, imgSrc, mediaKey) {
    const options = raw.options ?? [];
    const media = mediaEntries(raw, mediaKey);
    const mainUrl = imgSrc(media[0], 800, 800);
    const hover = media.slice(1).map((m) => imgSrc(m, 800, 800)).filter(Boolean);
    const availability = toAvailability(raw);
    // Price: the cheapest variant's selling price (discount applied); the product RANGE when variants
    // are priced differently — and NO struck price beside a range (a lone struck minimum claims a
    // saving that may not apply to the variant picked). When that cheapest variant is DISCOUNTED the
    // range's top is unknown here (actualPriceRange is pre-discount) — the tile says "From {price}"
    // and the PDP recomputes the range from its variants.
    const min = raw.actualPriceRange?.minValue, max = raw.actualPriceRange?.maxValue;
    const isRange = !!(min?.amount && max?.amount && min.amount !== max.amount);
    const minVariant = raw.variantSummary?.minPriceVariant;
    const { current, original } = sellingPrice(minVariant?.price);
    const discounted = minVariant?.price?.priceAfterDiscount !== undefined;
    const price = current?.formattedAmount ?? min?.formattedAmount ?? "";
    const fromPrice = isRange && discounted;
    const ribbons = ribbonsOf(raw);
    const hasSubscriptions = visibleSubscriptions(raw).length > 0;
    return {
        id: id(raw),
        slug: raw.slug ?? "",
        name: raw.name ?? "",
        price,
        maxPrice: fromPrice ? price : max?.formattedAmount ?? "",
        fromPrice,
        compareAtPrice: isRange ? null : strike(original ?? raw.compareAtPriceRange?.minValue, current ?? min),
        discountNames: (raw.discountInfo?.discountRuleNames ?? []).filter((n) => typeof n === "string" && n.length > 0),
        pricePerUnit: minVariant?.physicalProperties?.pricePerUnit?.description ?? raw.physicalProperties?.pricePerUnitRange?.minValue?.description ?? null,
        ribbon: ribbons[0] ?? null,
        ribbons,
        minPriceVariantId: minVariant ? id(minVariant) || minVariant.variantId || null : null,
        availability,
        preorder: isPreorderProduct(raw),
        hasSubscriptions,
        imageUrl: mainUrl,
        hoverImageUrl: hover[0] ?? "",
        optionsSummary: options
            .map((o) => {
            const n = (o.choicesSettings?.choices ?? []).filter((c) => c.visible !== false).length;
            return `${n} ${String(o.name ?? "").toLowerCase()}${n === 1 ? "" : "s"}`;
        })
            .join(" · "),
        swatches: options
            .filter((o) => o.optionRenderType === "SWATCH_CHOICES" || o.optionRenderType === "COLOR_CHOICES")
            .flatMap((o) => (o.choicesSettings?.choices ?? []))
            .filter((c) => c.visible !== false && c.colorCode)
            .map((c) => String(c.colorCode)),
        // Addable in one click: no options, plainly in stock, and no plan to choose.
        quickAddable: options.length === 0 && availability === "IN_STOCK" && !hasSubscriptions,
    };
}
/**
 * A choice's linked image. With PRODUCT_CHOICES_MEDIA_REFERENCES the choice carries
 * `media.items[].mediaId` pointing into the product gallery; without it Wix returns the same link
 * as the deprecated `linkedMedia` with the media object inline. Both read forms are handled.
 */
function choiceImage(c, gallery, imgSrc) {
    if (!imgSrc)
        return null;
    const ref = (c.media?.items ?? [])[0]?.mediaId;
    const linked = (c.linkedMedia ?? [])[0];
    const m = ref ? gallery.get(String(ref)) : linked ? (linked.image ?? linked) : null;
    return m ? imgSrc(m, 1200, 1200) || null : null;
}
export function toOptions(raw, imgSrc) {
    // the gallery by item id — `id` over REST, `_id` through the SDK (both feed this mapper)
    const gallery = new Map();
    for (const m of [raw.media?.main, ...(raw.media?.itemsInfo?.items ?? [])]) {
        const key = m?._id ?? m?.id;
        if (key)
            gallery.set(String(key), m.image ?? m);
    }
    return (raw.options ?? []).map((o) => ({
        id: id(o) || o.name || "",
        key: o.key ?? o.name ?? "",
        name: o.name ?? "",
        isColor: o.optionRenderType === "SWATCH_CHOICES" || o.optionRenderType === "COLOR_CHOICES",
        choices: (o.choicesSettings?.choices ?? [])
            .filter((c) => c.visible !== false) // a retired choice the merchant no longer sells
            .map((c) => ({
            choiceId: c.choiceId ?? "",
            key: c.key ?? c.name ?? "",
            name: c.name ?? "",
            colorCode: c.colorCode ?? null,
            inStock: c.inStock !== false,
            imageUrl: choiceImage(c, gallery, imgSrc),
        })),
    }));
}
// Mandatory unless the API says `mandatory: false` — an omitted flag is REQUIRED on Wix's own
// storefront. A free-text modifier is keyed by `freeTextSettings.key` (what `customTextFields`
// takes); a choice modifier by its own `key` (what `options` takes).
export function toModifiers(raw) {
    return (raw.modifiers ?? []).map((m) => {
        const isText = m.modifierRenderType === "FREE_TEXT";
        const ft = m.freeTextSettings ?? {};
        const charCount = (v) => (typeof v === "number" && v > 0 ? v : null);
        return {
            id: id(m) || m.key || m.name || "",
            key: isText ? ft.key ?? m.key ?? m.name ?? "" : m.key ?? m.name ?? "",
            name: m.name ?? "",
            mandatory: m.mandatory !== false,
            type: isText ? "text" : "choices",
            title: (isText ? ft.title : undefined) || m.name || "",
            maxChars: isText ? charCount(ft.maxCharCount) : null,
            minChars: isText ? charCount(ft.minCharCount) : null,
            choices: (m.choicesSettings?.choices ?? []).map((c) => ({ choiceId: c.choiceId ?? "", key: c.key ?? c.name ?? "", name: c.name ?? "" })),
        };
    });
}
const FREQUENCY_WORD = { DAY: "day", WEEK: "week", MONTH: "month", YEAR: "year" };
/** "every 2 months · 6 payments" / "every month · until cancelled" from a plan's settings. */
export function planTerms(frequency, interval, billingCycles) {
    const parts = [];
    const u = FREQUENCY_WORD[String(frequency ?? "")];
    if (u)
        parts.push(`every ${interval > 1 ? `${interval} ${u}s` : u}`);
    parts.push(billingCycles ? `${billingCycles} payments` : "until cancelled");
    return parts.join(" · ");
}
/** The product's visible recurring plans; a plan without `billingCycles` auto-renews. */
export function toSubscriptionPlans(raw) {
    return visibleSubscriptions(raw).map((s) => {
        const frequency = ["DAY", "WEEK", "MONTH", "YEAR"].find((f) => f === s.frequency) ?? null;
        const interval = typeof s.interval === "number" && s.interval > 0 ? s.interval : 1;
        const billingCycles = s.autoRenewal === true ? null : typeof s.billingCycles === "number" && s.billingCycles > 0 ? s.billingCycles : null;
        return { id: id(s), name: s.title ?? "", description: s.description ?? "", frequency, interval, billingCycles, terms: planTerms(frequency, interval, billingCycles) };
    });
}
/**
 * Variants keyed by optionId → choiceId (names kept for display). Buyable when in stock OR
 * pre-orderable. `quantity`/`preorderMessage` stay null here — the Inventory Items read fills them
 * (mergeInventory). `variant.media` is read-only on the API: Wix derives it from the media linked
 * to the variant's choice (a product with several options derives it only when the choices
 * agree). Mapped to a URL so a PDP can show the selected variant's picture without knowing how
 * Wix derives it.
 */
export function toVariants(raw, imgSrc) {
    return (raw.variantsInfo?.variants ?? [])
        .filter((v) => v.visible !== false)
        .map((v) => {
        const choices = {};
        const choiceIds = {};
        for (const c of (v.choices ?? [])) {
            const on = c.optionChoiceNames?.optionName, cn = c.optionChoiceNames?.choiceName;
            if (on && cn)
                choices[on] = cn;
            const oi = c.optionChoiceIds?.optionId, ci = c.optionChoiceIds?.choiceId;
            if (oi && ci)
                choiceIds[oi] = ci;
        }
        const { current, original } = sellingPrice(v.price);
        const vm = v.media ? (v.media.image ?? v.media) : null;
        const subscriptionPrices = {};
        for (const sp of (v.subscriptionPricesInfo?.subscriptionPrices ?? [])) {
            const formatted = sp.priceAfterDiscount?.formattedAmount ?? sp.price?.formattedAmount;
            if (sp.subscriptionId && formatted)
                subscriptionPrices[sp.subscriptionId] = formatted;
        }
        const amount = Number(current?.amount);
        return {
            variantId: id(v),
            choiceIds,
            choices,
            price: current?.formattedAmount ?? "",
            priceAmount: Number.isFinite(amount) ? amount : 0,
            compareAtPrice: strike(original, current),
            pricePerUnit: v.physicalProperties?.pricePerUnit?.description ?? null,
            sku: v.sku ?? null,
            subscriptionPrices,
            inStock: v.inventoryStatus?.inStock !== false,
            preorderEnabled: v.inventoryStatus?.preorderEnabled === true,
            quantity: null,
            preorderMessage: null,
            imageUrl: vm ? imgSrc(vm, 1200, 1200) || null : null,
        };
    });
}
/** The product's category path and direct categories, from BREADCRUMBS_INFO / DIRECT_CATEGORIES_INFO. */
export function toBreadcrumbs(info) {
    return (info?.breadcrumbs ?? [])
        .filter((b) => b.categoryId)
        .map((b) => ({ id: b.categoryId, name: b.categoryName ?? "", slug: b.categorySlug ?? "" }));
}
export function toDetail(raw, imgSrc, mediaKey) {
    const summary = toSummary(raw, imgSrc, mediaKey);
    const variants = toVariants(raw, imgSrc);
    // The exact range from the variants' SELLING prices (discounts applied) — the summary's range is
    // pre-discount and had to say "From" when the cheapest variant was discounted.
    let price = summary.price, maxPrice = summary.maxPrice, compareAtPrice = summary.compareAtPrice;
    if (variants.length) {
        const lo = variants.reduce((a, v) => (v.priceAmount < a.priceAmount ? v : a));
        const hi = variants.reduce((a, v) => (v.priceAmount > a.priceAmount ? v : a));
        price = lo.price || price;
        maxPrice = hi.price || maxPrice;
        compareAtPrice = price !== maxPrice ? null : lo.compareAtPrice;
    }
    return {
        ...summary,
        price,
        maxPrice,
        fromPrice: false,
        compareAtPrice,
        descriptionHtml: raw.plainDescription ?? "", // an HTML string despite the name — render as HTML
        infoSections: (raw.infoSections ?? [])
            .map((s) => ({ title: s.title ?? "", html: s.plainDescription ?? "" }))
            .filter((s) => s.title || s.html),
        // De-duplicated on media identity, then resolved once at one size.
        gallery: mediaEntries(raw, mediaKey).map((m) => imgSrc(m, 1200, 1200)).filter(Boolean),
        breadcrumbs: toBreadcrumbs(raw.breadcrumbsInfo),
        categoryIds: (raw.directCategoriesInfo?.categories ?? []).map((c) => id(c)).filter(Boolean),
        options: toOptions(raw, imgSrc),
        modifiers: toModifiers(raw),
        variants,
        subscriptions: toSubscriptionPlans(raw),
        allowOneTimePurchase: raw.subscriptionDetails?.allowOneTimePurchases === true,
    };
}
export function toCategory(raw, imgSrc) {
    const parent = raw.parentCategory;
    return {
        id: id(raw),
        slug: raw.slug ?? "",
        name: raw.name ?? "",
        description: raw.description ?? "",
        imageUrl: imgSrc(raw.image, 1200, 1200),
        parentId: parent ? id(parent) || null : null,
        index: typeof parent?.index === "number" ? parent.index : 0,
        productCount: typeof raw.itemCounter === "number" ? raw.itemCounter : null,
        breadcrumbs: toBreadcrumbs(raw.breadcrumbsInfo),
    };
}
// ---- inventory --------------------------------------------------------------------------------------
/** Inventory Items → per-variant record: a PREORDER item's remaining allowance is `preorderInfo.quantity`. */
export function toInventory(items) {
    const out = {};
    for (const it of items) {
        if (!it?.variantId)
            continue;
        const status = it.availabilityStatus === "IN_STOCK" || it.availabilityStatus === "PREORDER" ? it.availabilityStatus : "OUT_OF_STOCK";
        const tracked = it.trackQuantity === true;
        out[it.variantId] = {
            status,
            quantity: tracked && typeof it.quantity === "number" ? Math.max(0, it.quantity) : null,
            preorderQuantity: tracked && typeof it.preorderInfo?.quantity === "number" ? Math.max(0, it.preorderInfo.quantity) : null,
            preorderMessage: it.preorderInfo?.message || null,
        };
    }
    return out;
}
/**
 * The variants with the default location's live inventory: status → inStock/preorderEnabled, the
 * remaining units (`quantity`: stock, or the pre-order allowance while pre-ordering), the pre-order
 * message. A variant without a record keeps its catalog flags.
 */
export function mergeInventory(variants, inventory) {
    return variants.map((v) => {
        const inv = inventory[v.variantId];
        if (!inv)
            return v;
        const preorder = inv.status === "PREORDER";
        return {
            ...v,
            inStock: inv.status === "IN_STOCK",
            preorderEnabled: preorder,
            quantity: preorder ? inv.preorderQuantity : inv.quantity,
            preorderMessage: preorder ? inv.preorderMessage : null,
        };
    });
}
// ---- selection rules --------------------------------------------------------------------------------
/**
 * Resolve the variant for the buyer's selections (optionId → choiceId). A product with no options
 * resolves to its single variant; with options every option must be selected and match. null
 * while incomplete. Selections start EMPTY — never pre-pick a first choice.
 */
export function resolveVariant(detail, selections) {
    if (detail.options.length === 0)
        return detail.variants[0] ?? null;
    if (!detail.options.every((o) => selections[o.id]))
        return null;
    return detail.variants.find((v) => detail.options.every((o) => v.choiceIds[o.id] === selections[o.id])) ?? null;
}
/**
 * Per-choice availability AGAINST the current selection: optionId → choiceId → { inStock, exists }.
 * With nothing picked, a choice's catalog flag. Otherwise each choice is judged as if picked on
 * top of the other selections: `exists` when some variant answers to that combination, `inStock`
 * when one of those is buyable (in stock or pre-orderable). Red picked → XL greys out when Red/XL
 * is sold out, but stays clickable elsewhere.
 */
export function choiceAvailability(detail, selections) {
    const picked = Object.entries(selections).filter(([oid, cid]) => oid && cid);
    const out = {};
    for (const o of detail.options) {
        out[o.id] = {};
        for (const c of o.choices) {
            if (!picked.length) {
                out[o.id][c.choiceId] = { inStock: c.inStock, exists: true };
                continue;
            }
            const candidate = [...picked.filter(([oid]) => oid !== o.id), [o.id, c.choiceId]];
            let exists = false, inStock = false;
            for (const v of detail.variants) {
                if (!candidate.every(([oid, cid]) => v.choiceIds[oid] === cid))
                    continue;
                exists = true;
                if (v.inStock || v.preorderEnabled) {
                    inStock = true;
                    break;
                }
            }
            out[o.id][c.choiceId] = { inStock, exists };
        }
    }
    return out;
}
/** Wix's storefront caps the stepper at 99999 when stock isn't counted. */
export const MAX_QUANTITY = 99999;
/** The most a buyer may add of a variant: its remaining units when counted (none left → the cap; the add is blocked anyway), else the cap. */
export function maxPurchasable(variant) {
    return variant?.quantity || MAX_QUANTITY;
}
