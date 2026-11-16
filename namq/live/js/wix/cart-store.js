// Declarations of cart-store.ts: what this file exports, their arguments and what they return.
// import type { Cart } from "./storefront-types.js";
// import { type AddToCartExtras } from "./cart.js";
// export interface CartState {
//     cart: Cart | null;
//     busy: boolean;
//     pendingProductId: string | null;
//     error: string | null;
//     open: boolean;
// }
// export declare function getCartState(): CartState;
// export declare function subscribeCart(fn: (state: CartState) => void): () => void;
// export declare function refreshCart(): Promise<void>;
// export declare function addLine(productId: string, variantId?: string | null, quantity?: number, extras?: AddToCartExtras): Promise<void>;
// export declare function updateLineQuantity(lineItemId: string, quantity: number): Promise<void>;
// export declare function removeCartLine(lineItemId: string): Promise<void>;
// export declare function applyCartCoupon(code: string): Promise<void>;
// export declare function removeCartCoupon(): Promise<void>;
// export declare function setCartNote(note: string): Promise<void>;
// export declare function goToCheckout(): Promise<void>;
// export declare function setCartOpen(open: boolean): void;
import { addToCart as apiAdd, applyCoupon as apiApplyCoupon, fetchCart, removeCoupon as apiRemoveCoupon, removeLine as apiRemove, setNote as apiSetNote, updateQuantity as apiUpdate, checkoutUrl, } from "./cart.js";
const EMPTY = { cart: null, busy: false, pendingProductId: null, error: null, open: false };
let state = EMPTY;
const listeners = new Set();
let loaded = false;
function setState(patch) {
    state = { ...state, ...patch };
    for (const l of listeners)
        l();
}
export function getCartState() {
    return state;
}
export function subscribeCart(fn) {
    const listener = () => { try {
        fn(getCartState());
    }
    catch (e) {
        console.error("cart-store listener failed", e);
    } };
    listeners.add(listener);
    // First subscriber triggers the initial load (browser only — SSR renders the empty state).
    if (!loaded && typeof window !== "undefined") {
        loaded = true;
        void refreshCart();
    }
    return () => listeners.delete(listener);
}
async function run(op) {
    setState({ busy: true, error: null });
    try {
        setState({ cart: await op(), busy: false });
    }
    catch (e) {
        setState({ busy: false, error: e instanceof Error ? e.message : String(e) });
        throw e;
    }
}
export async function refreshCart() {
    try {
        setState({ cart: await fetchCart() });
    }
    catch {
        /* no cart yet — leave the empty state */
    }
}
/** Add to cart and open the drawer. Throws (and sets .error) on refusal. */
export async function addLine(productId, variantId, quantity = 1, extras) {
    setState({ pendingProductId: productId });
    try {
        await run(() => apiAdd(productId, variantId, quantity, extras));
    }
    finally {
        setState({ pendingProductId: null });
        // Open either way. On success this shows the new line; on refusal it's the only thing that
        // makes .error visible — the drawer renders it, and a drawer that stays shut on failure
        // turns a refused add (out of stock, a digital product with no file) into silence.
        setState({ open: true });
    }
}
export async function updateLineQuantity(lineItemId, quantity) {
    await run(() => apiUpdate(lineItemId, quantity));
}
export async function removeCartLine(lineItemId) {
    await run(() => apiRemove(lineItemId));
}
/** Apply a coupon code; rejects (and sets .error with buyer copy) when the code is unknown, expired, or doesn't apply. */
export async function applyCartCoupon(code) {
    if (!code.trim())
        return;
    await run(() => apiApplyCoupon(code));
}
export async function removeCartCoupon() {
    await run(() => apiRemoveCoupon());
}
/** Save the buyer's note to the merchant (commit on blur, not on every keystroke). */
export async function setCartNote(note) {
    if ((state.cart?.note ?? "") === note.trim())
        return;
    await run(() => apiSetNote(note));
}
/** Navigate to the Wix-hosted checkout. Never hand-build a checkout URL. */
export async function goToCheckout() {
    setState({ busy: true, error: null });
    try {
        const url = await checkoutUrl();
        window.location.href = url;
    }
    catch (e) {
        setState({ busy: false, error: e instanceof Error ? e.message : String(e) });
        throw e;
    }
}
export function setCartOpen(open) {
    setState({ open });
}
