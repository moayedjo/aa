// Declarations of cart.ts: what this file exports, their arguments and what they return.
// import type { Cart } from "./storefront-types.js";
// export interface AddToCartExtras {
//     optionChoices?: Record<string, string>;
//     modifierChoices?: Record<string, string>;
//     customTextFields?: Record<string, string>;
//     subscriptionOptionId?: string;
//     preorder?: boolean;
// }
// export declare function fetchCart(): Promise<Cart>;
// export declare function addToCart(productId: string, variantId?: string | null, quantity?: number, extras?: AddToCartExtras): Promise<Cart>;
// export declare function updateQuantity(lineItemId: string, quantity: number): Promise<Cart>;
// export declare function removeLine(lineItemId: string): Promise<Cart>;
// export declare function applyCoupon(code: string): Promise<Cart>;
// export declare function removeCoupon(): Promise<Cart>;
// export declare function setNote(note: string): Promise<Cart>;
// export declare function checkoutUrl(origin?: string): Promise<string>;
// Cart + checkout over REST (Wix eCom Cart V2) — the twin of app/wix/storefront/cart.ts. Same
// exports, same Cart/CartLine DTOs; rules and mappers from cart-core (the SAME file the SDK
// transport uses, deployed flat next to this one). The request shapes are exact and rewriting
// them is how carts break. Failures are loud: out-of-stock lines, an empty cart at checkout, a
// missing required selection, a bad coupon all throw buyer copy — surface the message to the buyer.
// All calls run with the visitor token: the cart is the token's (see ../shared/client).
// docs: https://dev.wix.com/docs/api-reference/business-solutions/e-commerce/purchase-flow/cart-v2/add-line-items-to-current-cart.md
// docs: https://dev.wix.com/docs/api-reference/business-management/headless/redirects/create-redirect-session.md
import { WixApiError, wixRequest } from "./client.js";
import { imgSrc } from "./media.js";
import { EMPTY_TOTALS, WIX_STORES_APP_ID, addOptions, assertAdded, assertCheckoutable, cartErrorMessage, rawId, summaryTotals, toCart } from "./cart-core.js";
const CART = "/ecom/v2/carts/current";
// Every cart call fails with buyer copy (cart-core maps Wix's codes; the rest keep their message).
async function loud(op) {
    try {
        return await op();
    }
    catch (e) {
        throw new Error(cartErrorMessage(e));
    }
}
// A line's attributes.image comes back absent right after an add (verified live) — join the
// products' main images by catalogItemId, once per product, cached for the session.
// POST /stores/v3/products/query  { query: { filter: { id: { $in: [...] } } } }
const lineImageCache = new Map();
async function fillLineImages(cart, raws) {
    const wanted = new Map();
    raws.forEach((raw, i) => {
        if (cart.lines[i].imageUrl)
            return;
        const pid = raw.source?.catalogReference?.catalogItemId;
        if (!pid)
            return;
        const cached = lineImageCache.get(pid);
        if (cached !== undefined) {
            cart.lines[i].imageUrl = cached;
            return;
        }
        wanted.set(pid, [...(wanted.get(pid) ?? []), i]);
    });
    if (!wanted.size)
        return;
    try {
        const res = await wixRequest("/stores/v3/products/query", { body: { query: { filter: { id: { $in: [...wanted.keys()] } }, cursorPaging: { limit: 100 } } } });
        for (const p of (res?.products ?? [])) {
            const url = imgSrc(p.media?.main, 300, 300);
            lineImageCache.set(rawId(p), url);
            for (const i of wanted.get(rawId(p)) ?? [])
                cart.lines[i].imageUrl = url;
        }
    }
    catch {
        /* images are a nicety — the cart stays correct without them */
    }
}
async function readCart(raw) {
    // Only estimate a cart WITH lines — on an absent/empty cart the endpoint returns 404.
    if (!raw?.lineItems?.length)
        return toCart(raw, EMPTY_TOTALS, imgSrc);
    // The totals come from the estimate, never from hand-summing lines: the after-discount subtotal,
    // named discounts, fees and taxes (calculated when asked), the total before delivery. Delivery
    // resolves at checkout — never render it as "Free" here.
    // POST /ecom/v2/carts/current/estimate  { calculateTax, calculateAdditionalFees }
    let totals = EMPTY_TOTALS;
    try {
        totals = summaryTotals(await wixRequest(`${CART}/estimate`, { body: { calculateTax: true, calculateAdditionalFees: true } }), raw);
    }
    catch {
        /* the estimate is a display nicety — the cart itself is still valid */
    }
    const cart = toCart(raw, totals, imgSrc);
    await fillLineImages(cart, raw.lineItems);
    return cart;
}
// GET /ecom/v2/carts/current — a 404 (CURRENT_CART_NOT_FOUND / OWNED_CART_NOT_FOUND) means no cart yet.
async function getCurrentCartRaw() {
    try {
        return (await wixRequest(CART, { method: "GET" }))?.cart ?? null;
    }
    catch (e) {
        if (e instanceof WixApiError && e.status === 404)
            return null;
        throw e;
    }
}
/** The visitor's current cart. An empty Cart (not an error) when none exists yet. */
export async function fetchCart() {
    return readCart(await getCurrentCartRaw());
}
/**
 * Add a product. `variantId` is REQUIRED for any product with options — resolve it first
 * (resolveVariant); a refused add still returns 200, so the returned line is checked.
 * POST /ecom/v2/carts/current/add-line-items  { catalogItems: [{ quantity, catalogReference: { appId, catalogItemId, options } }] }
 */
export async function addToCart(productId, variantId, quantity = 1, extras = {}) {
    return loud(async () => {
        const options = addOptions({ variantId, ...extras });
        const res = await wixRequest(`${CART}/add-line-items`, {
            body: { catalogItems: [{ quantity, catalogReference: { catalogItemId: productId, appId: WIX_STORES_APP_ID, ...(Object.keys(options).length ? { options } : {}) } }] },
        });
        assertAdded(res?.cart, productId, variantId);
        return readCart(res?.cart ?? null);
    });
}
/**
 * Change a line's quantity. `lineItemId` is CartLine.lineItemId, never the product id; a flat
 * { id, quantity } is a 400.  POST /ecom/v2/carts/current/update-line-items  { lineItems: [{ lineItemId, quantity: { newQuantity } }] }
 */
export async function updateQuantity(lineItemId, quantity) {
    return loud(async () => {
        const res = await wixRequest(`${CART}/update-line-items`, { body: { lineItems: [{ lineItemId, quantity: { newQuantity: quantity } }] } });
        return readCart(res?.cart ?? null);
    });
}
/** Remove a line by CartLine.lineItemId.  POST /ecom/v2/carts/current/remove-line-items  { lineItemIds } */
export async function removeLine(lineItemId) {
    return loud(async () => {
        const res = await wixRequest(`${CART}/remove-line-items`, { body: { lineItemIds: [lineItemId] } });
        return readCart(res?.cart ?? null);
    });
}
/**
 * Apply a coupon code (one per cart); buyer copy for an unknown, expired, or inapplicable code.
 * POST /ecom/v2/carts/current/add-coupon  { coupon: { code } }
 */
export async function applyCoupon(code) {
    return loud(async () => {
        const res = await wixRequest(`${CART}/add-coupon`, { body: { coupon: { code: code.trim() } } });
        return readCart(res?.cart ?? null);
    });
}
/** Remove the applied coupon (a no-op when none).  POST /ecom/v2/carts/current/remove-coupon  { couponId } */
export async function removeCoupon() {
    return loud(async () => {
        const current = await getCurrentCartRaw();
        const couponId = rawId((current?.coupons ?? [])[0]);
        if (!couponId)
            return readCart(current);
        const res = await wixRequest(`${CART}/remove-coupon`, { body: { couponId } });
        return readCart(res?.cart ?? null);
    });
}
/**
 * Save the buyer's note to the merchant on the cart (it travels to checkout and the order).
 * PATCH /ecom/v2/carts/current  { cart: { note } }
 */
export async function setNote(note) {
    return loud(async () => {
        const res = await wixRequest(CART, { method: "PATCH", body: { cart: { note: note.trim() || null } } });
        return readCart(res?.cart ?? null);
    });
}
/**
 * Start the Wix-hosted checkout and return the URL to navigate the FULL document to. The cart's id
 * IS the checkout id (as on Wix's own storefront). `origin` must be the site's real https origin as
 * registered on the OAuth app's allowed domains (browser: window.location.origin; server: the
 * public https host, never the request's internal origin) — an unlisted or http origin 403s on return.
 * POST /headless/v1/redirect-session  { ecomCheckout: { checkoutId }, callbacks: { postFlowUrl, thankYouPageUrl } }
 */
export async function checkoutUrl(origin = typeof window !== "undefined" ? window.location.origin : "") {
    const raw = await getCurrentCartRaw();
    assertCheckoutable(raw);
    const res = await wixRequest("/headless/v1/redirect-session", {
        body: { ecomCheckout: { checkoutId: rawId(raw) }, callbacks: origin ? { postFlowUrl: `${origin}/`, thankYouPageUrl: `${origin}/` } : {} },
    });
    const url = res?.redirectSession?.fullUrl;
    if (!url)
        throw new Error("Checkout couldn't start: no redirect URL returned.");
    return url;
}
